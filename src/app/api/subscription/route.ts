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

    // Get rate limit status
    const { getRateLimitStatus } = await import('@/lib/rate-limit');
    const rateLimit = await getRateLimitStatus(userId);

    const plan = activeSubscription?.plan ? {
      id: activeSubscription.plan.id,
      name: activeSubscription.plan.name,
      displayName: activeSubscription.plan.name,
      price: activeSubscription.plan.priceMonthly,
      interval: 'month',
      features: activeSubscription.plan.features,
      maxRequestsPerDay: activeSubscription.plan.maxRequestsPerDay,
    } : null;

    const subscription = activeSubscription ? {
      id: activeSubscription.id,
      status: activeSubscription.status,
      currentPeriodStart: activeSubscription.currentPeriodStart.toISOString(),
      currentPeriodEnd: activeSubscription.currentPeriodEnd.toISOString(),
      cancelAtPeriodEnd: activeSubscription.cancelAtPeriodEnd,
      stripeDetails: subscriptionDetails,
    } : null;

    return NextResponse.json({
      plan,
      subscription,
      rateLimit: {
        used: rateLimit.used,
        limit: rateLimit.limit,
        remaining: rateLimit.remaining,
        resetAt: rateLimit.resetAt.toISOString(),
        isUnlimited: rateLimit.isUnlimited,
      },
      isPro: rateLimit.isUnlimited,
    });
  } catch (error) {
    console.error('Get subscription error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}