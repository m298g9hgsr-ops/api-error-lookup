import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createCheckoutSession, createCustomer } from '@/services/stripe'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || !(session.user as any).id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { priceId, successUrl, cancelUrl } = body

    if (!priceId) {
      return NextResponse.json({ error: 'Price ID is required' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { id: (session.user as any).id },
      include: { 
        subscriptions: {
          where: { status: 'active' },
          take: 1,
        }
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const activeSubscription = user.subscriptions[0];
    let customerId = activeSubscription?.stripeCustomerId

    if (!customerId) {
      customerId = await createCustomer(user.email, user.id)
      if (activeSubscription) {
        await prisma.subscription.update({
          where: { id: activeSubscription.id },
          data: { stripeCustomerId: customerId },
        });
      }
    }

    const checkoutUrl = await createCheckoutSession({
      userId: user.id,
      email: user.email,
      priceId,
      successUrl: successUrl || `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?success=true`,
      cancelUrl: cancelUrl || `${process.env.NEXT_PUBLIC_APP_URL}/pricing?canceled=true`,
      customerId,
    })

    return NextResponse.json({ url: checkoutUrl })
  } catch (error) {
    console.error('Checkout session error:', error)
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 })
  }
}