import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getStripe } from '@/lib/stripe';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || !(session.user as any).id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const body = await request.json();
    const { newPlanName, interval = 'month' } = body;

    if (!newPlanName || !['pro', 'enterprise', 'free'].includes(newPlanName)) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { 
        subscriptions: {
          where: { status: 'active' },
          include: { plan: true },
          take: 1,
        }
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const activeSubscription = user.subscriptions[0];
    const currentPlanName = activeSubscription?.plan?.name;

    // If switching to free plan
    if (newPlanName === 'free') {
      if (activeSubscription?.stripeSubscriptionId) {
        // Cancel at period end
        await getStripe().subscriptions.update(activeSubscription.stripeSubscriptionId, {
          cancel_at_period_end: true,
        });

        await prisma.subscription.update({
          where: { id: activeSubscription.id },
          data: { cancelAtPeriodEnd: true },
        });
      }

      const freePlan = await prisma.plan.findUnique({ where: { name: 'free' } });
      if (freePlan) {
        await prisma.subscription.update({
          where: { id: activeSubscription.id },
          data: { planId: freePlan.id },
        });
      }

      return NextResponse.json({ message: 'Plan will be downgraded to free at period end' });
    }

    // If upgrading or switching between paid plans
    const newPlan = await prisma.plan.findUnique({ where: { name: newPlanName } });
    if (!newPlan) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }

    if (!activeSubscription?.stripeSubscriptionId) {
      return NextResponse.json(
        { error: 'No active subscription to modify' },
        { status: 400 }
      );
    }

    const priceId = interval === 'year' ? newPlan.stripePriceIdYearly : newPlan.stripePriceIdMonthly;
    if (!priceId) {
      return NextResponse.json({ error: 'Price not configured for this plan' }, { status: 500 });
    }

    // Get current subscription
    const subscription = await getStripe().subscriptions.retrieve(activeSubscription.stripeSubscriptionId);

    // Update subscription with new price
    const updatedSubscription = await getStripe().subscriptions.update(activeSubscription.stripeSubscriptionId, {
      items: [
        {
          id: subscription.items.data[0].id,
          price: priceId,
        },
      ],
      proration_behavior: 'create_prorations',
      metadata: {
        userId,
        planName: newPlanName,
        interval,
      },
    });

    await prisma.subscription.update({
      where: { id: activeSubscription.id },
      data: {
        planId: newPlan.id,
        stripePriceId: priceId,
        status: updatedSubscription.status,
        currentPeriodStart: new Date(updatedSubscription.current_period_start * 1000),
        currentPeriodEnd: new Date(updatedSubscription.current_period_end * 1000),
      },
    });

    return NextResponse.json({ message: 'Plan updated successfully' });
  } catch (error) {
    console.error('Switch plan error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}