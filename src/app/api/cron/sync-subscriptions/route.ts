import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getStripe } from '@/lib/stripe';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Verify CRON_SECRET
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all active subscriptions with stripeSubscriptionId
    const subscriptions = await prisma.subscription.findMany({
      where: {
        status: 'active',
        stripeSubscriptionId: { not: null },
      },
      include: {
        user: true,
        plan: true,
      },
    });

    const stripe = getStripe();
    let synced = 0;
    let failed = 0;

    for (const sub of subscriptions) {
      try {
        const stripeSubscription = await stripe.subscriptions.retrieve(sub.stripeSubscriptionId!);
        
        // Find matching plan
        const priceId = stripeSubscription.items.data[0]?.price?.id;
        const plan = await prisma.plan.findFirst({
          where: {
            OR: [
              { stripePriceIdMonthly: priceId || '' },
              { stripePriceIdYearly: priceId || '' },
            ],
          },
        });

        // Update local subscription
        await prisma.subscription.update({
          where: { id: sub.id },
          data: {
            planId: plan?.id,
            stripePriceId: priceId,
            status: stripeSubscription.status,
            currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
            currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
            cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
          },
        });

        synced++;
      } catch (error) {
        console.error(`Failed to sync subscription ${sub.id}:`, error);
        failed++;
      }
    }

    // Also handle expired subscriptions (past_due -> canceled)
    const expiredSubs = await prisma.subscription.findMany({
      where: {
        status: 'past_due',
        currentPeriodEnd: { lt: new Date() },
      },
    });

    for (const sub of expiredSubs) {
      const freePlan = await prisma.plan.findUnique({ where: { name: 'free' } });
      await prisma.subscription.update({
        where: { id: sub.id },
        data: {
          status: 'canceled',
          stripeSubscriptionId: null,
          stripePriceId: null,
          planId: freePlan?.id,
        },
      });
    }

    return NextResponse.json({
      success: true,
      synced,
      failed,
      expiredHandled: expiredSubs.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Cron sync error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}