import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // Verify CRON_SECRET
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Run seed logic here - create plans and error patterns
    // This is a one-time seed endpoint
    
    // Create default plans
    const freePlan = await prisma.plan.upsert({
      where: { name: 'free' },
      update: {},
      create: {
        name: 'free',
        description: 'Free tier for occasional use',
        priceMonthly: 0,
        priceYearly: 0,
        maxRequestsPerDay: 10,
        features: JSON.stringify({
          maxRequestsPerDay: 10,
          aiAnalysis: true,
          errorHistory: 7,
          prioritySupport: false,
        }),
        isActive: true,
      },
    });

    const proPlan = await prisma.plan.upsert({
      where: { name: 'pro' },
      update: {},
      create: {
        name: 'pro',
        description: 'For developers who need more',
        priceMonthly: 1900,
        priceYearly: 19000,
        maxRequestsPerDay: -1,
        features: JSON.stringify({
          maxRequestsPerDay: -1,
          aiAnalysis: true,
          errorHistory: 90,
          prioritySupport: true,
          advancedAnalytics: true,
        }),
        isActive: true,
      },
    });

    const enterprisePlan = await prisma.plan.upsert({
      where: { name: 'enterprise' },
      update: {},
      create: {
        name: 'enterprise',
        description: 'For teams and organizations',
        priceMonthly: 9900,
        priceYearly: 99000,
        maxRequestsPerDay: -1,
        features: JSON.stringify({
          maxRequestsPerDay: -1,
          aiAnalysis: true,
          errorHistory: 365,
          prioritySupport: true,
          advancedAnalytics: true,
          teamManagement: true,
          sso: true,
          customIntegrations: true,
        }),
        isActive: true,
      },
    });

    return NextResponse.json({
      success: true,
      plans: [freePlan, proPlan, enterprisePlan],
      message: 'Plans created successfully',
    });
  } catch (error) {
    console.error('Seed error:', error);
    return NextResponse.json({ error: 'Seed failed', details: String(error) }, { status: 500 });
  }
}