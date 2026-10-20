import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getStripe, getStripePriceId } from '@/lib/stripe';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || !(session.user as any).id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const body = await request.json();
    const { planName, interval = 'month', successUrl, cancelUrl } = body;

    if (!planName || !['pro', 'enterprise'].includes(planName)) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
    }

    const priceId = getStripePriceId(planName, interval);

    if (!priceId) {
      return NextResponse.json({ error: 'Price not configured for this plan' }, { status: 500 });
    }

    // Get or create Stripe customer
    let user = await prisma.user.findUnique({
      where: { id: userId },
      include: { 
        subscriptions: {
          where: { status: 'active' },
          take: 1,
        }
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const activeSubscription = user.subscriptions[0];
    let customerId = activeSubscription?.stripeCustomerId;

    if (!customerId) {
      const customer = await getStripe().customers.create({
        email: user.email!,
        name: user.name || undefined,
        metadata: { userId },
      });
      customerId = customer.id;

      // Update user with customer ID
      if (activeSubscription) {
        await prisma.subscription.update({
          where: { id: activeSubscription.id },
          data: { stripeCustomerId: customerId },
        });
      } else {
        const plan = await prisma.plan.findUnique({ where: { name: planName } });
        await prisma.subscription.create({
          data: {
            userId,
            planId: plan?.id || '',
            stripeCustomerId: customerId,
            status: 'incomplete',
            currentPeriodStart: new Date(),
            currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          },
        });
      }
    }

    // Create checkout session
    const checkoutSession = await getStripe().checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: successUrl || `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?success=true`,
      cancel_url: cancelUrl || `${process.env.NEXT_PUBLIC_APP_URL}/pricing?canceled=true`,
      metadata: {
        userId,
        planName,
        interval,
      },
      subscription_data: {
        metadata: {
          userId,
          planName,
          interval,
        },
      },
    });

    return NextResponse.json({ sessionId: checkoutSession.id, url: checkoutSession.url });
  } catch (error) {
    console.error('Create subscription error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}