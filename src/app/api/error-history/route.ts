import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getRateLimitStatus } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || !(session.user as any).id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30');
    const limit = parseInt(searchParams.get('limit') || '50');

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

    // Get history limit from plan
    const activeSubscription = user.subscriptions[0];
    const historyDays = activeSubscription?.plan?.features ? JSON.parse(activeSubscription.plan.features as string).errorHistory : 7;
    const effectiveDays = Math.min(days, historyDays);

    const since = new Date();
    since.setDate(since.getDate() - effectiveDays);

    const errorLogs = await prisma.analysis.findMany({
      where: {
        userId,
        createdAt: { gte: since },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    // Get rate limit status
    const rateLimitStatus = await getRateLimitStatus(userId);

    return NextResponse.json({
      errorLogs: errorLogs.map(log => ({
        id: log.id,
        error: log.errorInput,
        timestamp: log.createdAt.toISOString(),
        analysis: log.analysis,
        errorType: log.errorType,
      })),
      rateLimit: rateLimitStatus,
      historyLimitDays: historyDays,
    });
  } catch (error) {
    console.error('Get error history error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}