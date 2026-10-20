import { NextRequest, NextResponse } from 'next/server'
import { constructWebhookEvent } from '@/services/stripe'
import { prisma } from '@/lib/prisma'
import Stripe from 'stripe'

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = request.headers.get('stripe-signature') || ''

    let event: Stripe.Event

    try {
      event = constructWebhookEvent(body, signature)
    } catch (err) {
      console.error('Webhook signature verification failed:', err)
      return NextResponse.json({ error: 'Webhook signature verification failed' }, { status: 400 })
    }

    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        const userId = subscription.metadata?.userId

        if (userId) {
          // Get the plan from price ID
          const priceId = subscription.items.data[0]?.price?.id
          const plan = await prisma.plan.findFirst({
            where: { 
              OR: [
                { stripePriceIdMonthly: priceId || '' },
                { stripePriceIdYearly: priceId || '' },
              ]
            },
          })

          // Update subscription record
          const existingSubscription = await prisma.subscription.findFirst({
            where: { userId, status: 'active' },
          })

          if (existingSubscription) {
            await prisma.subscription.update({
              where: { id: existingSubscription.id },
              data: {
                planId: plan?.id,
                stripeSubscriptionId: subscription.id,
                stripePriceId: priceId,
                status: subscription.status,
                currentPeriodStart: new Date(subscription.current_period_start * 1000),
                currentPeriodEnd: new Date(subscription.current_period_end * 1000),
                cancelAtPeriodEnd: subscription.cancel_at_period_end,
              },
            });
          } else {
            await prisma.subscription.create({
              data: {
                userId,
                planId: plan?.id || '',
                stripeCustomerId: subscription.customer as string,
                stripeSubscriptionId: subscription.id,
                stripePriceId: priceId,
                status: subscription.status,
                currentPeriodStart: new Date(subscription.current_period_start * 1000),
                currentPeriodEnd: new Date(subscription.current_period_end * 1000),
                cancelAtPeriodEnd: subscription.cancel_at_period_end,
              },
            });
          }
        }
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const userId = subscription.metadata?.userId

        if (userId) {
          // Revert to free plan
          const freePlan = await prisma.plan.findUnique({ where: { name: 'free' } })

          const existingSubscription = await prisma.subscription.findFirst({
            where: { userId, stripeSubscriptionId: subscription.id },
          })

          if (existingSubscription) {
            await prisma.subscription.update({
              where: { id: existingSubscription.id },
              data: {
                status: 'canceled',
                stripeSubscriptionId: null,
                stripePriceId: null,
                planId: freePlan?.id,
              },
            });
          }
        }
        break
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice
        const userId = invoice.subscription_details?.metadata?.userId || 
                       (invoice as any).metadata?.userId

        if (userId && invoice.subscription) {
          const existingSubscription = await prisma.subscription.findFirst({
            where: { userId, stripeSubscriptionId: invoice.subscription as string },
          })

          if (existingSubscription) {
            await prisma.subscription.update({
              where: { id: existingSubscription.id },
              data: {
                currentPeriodEnd: new Date((invoice as any).lines?.data[0]?.period?.end * 1000 || Date.now() + 30 * 24 * 60 * 60 * 1000),
              },
            })
          }
        }
        break
      }

      case 'invoice.payment_failed': {
        console.log('Payment failed for invoice:', event.data.object.id)
        const invoice = event.data.object as Stripe.Invoice
        const userId = (invoice as any).metadata?.userId
        
        if (userId) {
          const existingSubscription = await prisma.subscription.findFirst({
            where: { userId, status: 'active' },
          })
          
          if (existingSubscription) {
            await prisma.subscription.update({
              where: { id: existingSubscription.id },
              data: { status: 'past_due' },
            }).catch(() => {})
          }
        }
        break
      }
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 })
  }
}