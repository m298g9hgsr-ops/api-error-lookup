import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getStripe } from '@/lib/stripe';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || !(session.user as any).id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;

    // Query user with subscriptions
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        subscriptions: {
          where: { status: 'active' },
          include: { plan: true },
          take: 1,
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const activeSubscription = user.subscriptions[0];

    // Query quota usage separately (QuotaUsage is not related to User in schema)
    const windowStart = new Date();
    windowStart.setUTCHours(0, 0, 0, 0);
    
    const quotaUsage = await prisma.quotaUsage.findUnique({
      where: {
        userId_windowStart: {
          userId,
          windowStart,
        },
      },
    });

    let subscriptionDetails = null;

    if (activeSubscription?.stripeSubscriptionId) {
      try {
        const stripeSubscription = await getStripe().subscriptions.retrieve(activeSubscription.stripeSubscriptionId);
        subscriptionDetails = {
          id: stripeSubscription.id,
          status: stripeSubscription.status,
          currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000).toISOString(),
          currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000).toISOString(),
          cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
          priceId: stripeSubscription.items.data[0]?.price.id,
        };
      } catch (error) {
        console.error('Failed to fetch Stripe subscription:', error);
      }
    }

    return NextResponse.json({
      plan: activeSubscription?.plan ? {
        id: activeSubscription.plan.id,
        name: activeSubscription.plan.name,
        displayName: activeSubscription.plan.name,
        price: activeSubscription.plan.priceMonthly,
        currency: 'TWD',
        interval: 'month',
        features: activeSubscription.plan.features,
        maxRequestsPerDay: activeSubscription.plan.maxRequestsPerDay,
        stripePriceIdMonthly: activeSubscription.plan.stripePriceIdMonthly,
        stripePriceIdYearly: activeSubscription.plan.stripePriceIdYearly,
      } : null,
      subscription: activeSubscription ? {
        id: activeSubscription.id,
        status: activeSubscription.status,
        currentPeriodStart: activeSubscription.currentPeriodStart.toISOString(),
        currentPeriodEnd: activeSubscription.currentPeriodEnd.toISOString(),
        cancelAtPeriodEnd: activeSubscription.cancelAtPeriodEnd,
        stripeDetails: subscriptionDetails,
      } : null,
      rateLimit: {
        used: quotaUsage?.count || 0,
        limit: activeSubscription?.plan?.maxRequestsPerDay || 10,
        remaining: Math.max(0, (activeSubscription?.plan?.maxRequestsPerDay || 10) - (quotaUsage?.count || 0)),
        resetAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        isUnlimited: activeSubscription?.plan?.maxRequestsPerDay === -1 || (activeSubscription?.plan?.maxRequestsPerDay || 10) > 1000,
      },
      isPro: activeSubscription?.plan ? activeSubscription.plan.maxRequestsPerDay > 10 : false,
    });
  } catch (error) {
    console.error('Get subscription error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}