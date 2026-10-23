import { prisma } from '@/lib/prisma';
import { headers } from 'next/headers';

/**
 * Quota configuration
 */
export const QUOTA_CONFIG = {
  free: {
    maxRequestsPerDay: 10,
    windowMs: 24 * 60 * 60 * 1000, // 24 hours
  },
  pro: {
    maxRequestsPerDay: -1, // unlimited
    windowMs: 24 * 60 * 60 * 1000,
  },
  enterprise: {
    maxRequestsPerDay: -1, // unlimited
    windowMs: 24 * 60 * 60 * 1000,
  },
} as const;

export type PlanTier = keyof typeof QUOTA_CONFIG;

/**
 * Quota check result
 */
export interface QuotaResult {
  allowed: boolean;
  used: number;
  limit: number;
  remaining: number;
  resetAt: Date;
  isUnlimited: boolean;
  planTier: PlanTier;
}

/**
 * Rate limit headers
 */
export interface RateLimitHeaders {
  'X-RateLimit-Limit': string;
  'X-RateLimit-Remaining': string;
  'X-RateLimit-Reset': string;
  // Index signature so this object is assignable to `HeadersInit`
  [key: string]: string;
}

/**
 * Get user's plan tier from subscription
 */
export async function getUserPlanTier(userId: string): Promise<PlanTier> {
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

  if (!user || !user.subscriptions[0]?.plan) {
    return 'free';
  }

  const planName = user.subscriptions[0].plan.name.toLowerCase();
  if (planName in QUOTA_CONFIG) {
    return planName as PlanTier;
  }

  return 'free';
}

/**
 * Get the start of current day in UTC
 */
function getWindowStart(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0));
}

/**
 * Check and consume quota for a user (atomic operation using Prisma transaction)
 */
export async function checkAndConsumeQuota(userId: string): Promise<QuotaResult> {
  const planTier = await getUserPlanTier(userId);
  const config = QUOTA_CONFIG[planTier];
  const windowStart = getWindowStart();
  const windowEnd = new Date(windowStart.getTime() + config.windowMs);

  // For unlimited plans, return early
  if (config.maxRequestsPerDay === -1) {
    return {
      allowed: true,
      used: 0,
      limit: -1,
      remaining: -1,
      resetAt: windowEnd,
      isUnlimited: true,
      planTier,
    };
  }

  // Use Prisma transaction for atomic check-and-increment
  const result = await prisma.$transaction(async (tx) => {
    // Find or create today's quota record
    let quotaRecord = await tx.quotaUsage.findUnique({
      where: {
        userId_windowStart: {
          userId,
          windowStart,
        },
      },
    });

    const currentUsed = quotaRecord?.count ?? 0;

    if (currentUsed >= config.maxRequestsPerDay) {
      // Quota exceeded
      return {
        allowed: false,
        used: currentUsed,
        limit: config.maxRequestsPerDay,
        remaining: 0,
        resetAt: windowEnd,
        isUnlimited: false,
        planTier,
      };
    }

    // Increment quota usage
    if (quotaRecord) {
      quotaRecord = await tx.quotaUsage.update({
        where: { id: quotaRecord.id },
        data: { count: { increment: 1 } },
      });
    } else {
      quotaRecord = await tx.quotaUsage.create({
        data: {
          userId,
          windowStart,
          count: 1,
          resetAt: windowEnd,
        },
      });
    }

    return {
      allowed: true,
      used: quotaRecord.count,
      limit: config.maxRequestsPerDay,
      remaining: Math.max(0, config.maxRequestsPerDay - quotaRecord.count),
      resetAt: windowEnd,
      isUnlimited: false,
      planTier,
    };
  });

  return result;
}

/**
 * Get quota status without consuming
 */
export async function getQuotaStatus(userId: string): Promise<QuotaResult> {
  const planTier = await getUserPlanTier(userId);
  const config = QUOTA_CONFIG[planTier];
  const windowStart = getWindowStart();
  const windowEnd = new Date(windowStart.getTime() + config.windowMs);

  if (config.maxRequestsPerDay === -1) {
    return {
      allowed: true,
      used: 0,
      limit: -1,
      remaining: -1,
      resetAt: windowEnd,
      isUnlimited: true,
      planTier,
    };
  }

  const quotaRecord = await prisma.quotaUsage.findUnique({
    where: {
      userId_windowStart: {
        userId,
        windowStart,
      },
    },
  });

  const used = quotaRecord?.count ?? 0;

  return {
    allowed: used < config.maxRequestsPerDay,
    used,
    limit: config.maxRequestsPerDay,
    remaining: Math.max(0, config.maxRequestsPerDay - used),
    resetAt: windowEnd,
    isUnlimited: false,
    planTier,
  };
}

/**
 * Convert QuotaResult to rate limit headers
 */
export function quotaToHeaders(quota: QuotaResult): RateLimitHeaders {
  return {
    'X-RateLimit-Limit': quota.isUnlimited ? 'unlimited' : quota.limit.toString(),
    'X-RateLimit-Remaining': quota.isUnlimited ? 'unlimited' : quota.remaining.toString(),
    'X-RateLimit-Reset': Math.ceil(quota.resetAt.getTime() / 1000).toString(),
  };
}

/**
 * Get client identifier for IP-based rate limiting
 */
export async function getClientIdentifier(): Promise<string> {
  const headersList = await headers();
  const forwardedFor = headersList.get('x-forwarded-for');
  const realIp = headersList.get('x-real-ip');
  const ip = forwardedFor?.split(',')[0]?.trim() || realIp || 'unknown';
  return `ip:${ip}`;
}

/**
 * Simple in-memory rate limiter for anonymous users (fallback when Redis unavailable)
 * In production, use Upstash Redis for distributed rate limiting
 */
const anonymousRateLimitMap = new Map<string, { count: number; resetAt: number }>();

const ANONYMOUS_LIMIT = 5; // 5 requests per day for anonymous
const ANONYMOUS_WINDOW_MS = 24 * 60 * 60 * 1000;

/**
 * Reset the in-memory anonymous rate limit map.
 * Exposed for testing only.
 */
export function __resetAnonymousRateLimit(): void {
  anonymousRateLimitMap.clear();
}

export async function checkAnonymousRateLimit(identifier: string): Promise<QuotaResult> {
  const now = Date.now();
  const current = anonymousRateLimitMap.get(identifier);
  const windowStart = new Date();
  windowStart.setUTCHours(0, 0, 0, 0);
  const windowStartMs = windowStart.getTime();
  const windowEndMs = windowStartMs + ANONYMOUS_WINDOW_MS;

  if (!current || current.resetAt <= now) {
    anonymousRateLimitMap.set(identifier, { count: 0, resetAt: windowEndMs });
  }

  const bucket = anonymousRateLimitMap.get(identifier)!;
  bucket.count += 1;

  return {
    allowed: bucket.count <= ANONYMOUS_LIMIT,
    used: bucket.count,
    limit: ANONYMOUS_LIMIT,
    remaining: Math.max(0, ANONYMOUS_LIMIT - bucket.count),
    resetAt: new Date(bucket.resetAt),
    isUnlimited: false,
    planTier: 'free',
  };
}