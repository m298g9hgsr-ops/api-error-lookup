import { prisma } from '@/lib/prisma';

export class RateLimitExceededError extends Error {
  public resetAt: Date;

  constructor(message: string, resetAt: Date) {
    super(message);
    this.name = 'RateLimitExceededError';
    this.resetAt = resetAt;
  }
}

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number; // 24 hours in ms
}

const FREE_TIER_LIMIT: RateLimitConfig = {
  maxRequests: 10,
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
};

const PAID_TIER_LIMIT: RateLimitConfig = {
  maxRequests: -1, // unlimited
  windowMs: 24 * 60 * 60 * 1000,
};

export async function checkRateLimit(userId: string): Promise<void> {
  // Get user's subscription and plan
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
    throw new Error('User not found');
  }

  const activeSubscription = user.subscriptions[0];
  const hasActiveSubscription = !!activeSubscription;

  const isPaidUser = hasActiveSubscription && activeSubscription.plan && activeSubscription.plan.maxRequestsPerDay === -1;

  if (isPaidUser) {
    return; // No limit for paid users
  }

  // Free tier - check daily request count
  const windowStart = new Date();
  windowStart.setHours(0, 0, 0, 0); // Start of today

  const requestCount = await prisma.analysis.count({
    where: {
      userId,
      createdAt: { gte: windowStart },
    },
  });

  if (requestCount >= FREE_TIER_LIMIT.maxRequests) {
    const resetAt = new Date(windowStart);
    resetAt.setDate(resetAt.getDate() + 1); // Tomorrow at midnight

    throw new RateLimitExceededError(
      `Free tier limit exceeded. You have used ${requestCount}/${FREE_TIER_LIMIT.maxRequests} requests today.`,
      resetAt
    );
  }
}

export async function getRateLimitStatus(userId: string): Promise<{
  used: number;
  limit: number;
  remaining: number;
  resetAt: Date;
  isUnlimited: boolean;
}> {
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
    throw new Error('User not found');
  }

  const activeSubscription = user.subscriptions[0];
  const hasActiveSubscription = !!activeSubscription;

  const isPaidUser = hasActiveSubscription && activeSubscription.plan && activeSubscription.plan.maxRequestsPerDay === -1;

  if (isPaidUser) {
    return {
      used: 0,
      limit: -1,
      remaining: -1,
      resetAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      isUnlimited: true,
    };
  }

  const windowStart = new Date();
  windowStart.setHours(0, 0, 0, 0);

  const used = await prisma.analysis.count({
    where: {
      userId,
      createdAt: { gte: windowStart },
    },
  });

  const resetAt = new Date(windowStart);
  resetAt.setDate(resetAt.getDate() + 1);

  return {
    used,
    limit: FREE_TIER_LIMIT.maxRequests,
    remaining: Math.max(0, FREE_TIER_LIMIT.maxRequests - used),
    resetAt,
    isUnlimited: false,
  };
}