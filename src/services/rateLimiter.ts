import { Redis } from '@upstash/redis'
import { prisma } from '@/lib/prisma'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || '',
  token: process.env.UPSTASH_REDIS_REST_TOKEN || '',
})

export interface RateLimitConfig {
  maxRequests: number
  windowMs: number
  keyPrefix?: string
}

export interface RateLimitResult {
  success: boolean
  remaining: number
  resetTime: number
  totalRequests: number
  isUnlimited: boolean
}

const FREE_TIER_CONFIG: RateLimitConfig = {
  maxRequests: 10,
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  keyPrefix: 'ratelimit:free',
}

const PAID_TIER_CONFIG: RateLimitConfig = {
  maxRequests: -1, // unlimited
  windowMs: 24 * 60 * 60 * 1000,
  keyPrefix: 'ratelimit:paid',
}

async function getUserPlan(userId: string): Promise<{ isPaid: boolean; maxRequests: number }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      subscriptions: {
        where: { status: 'active' },
        include: { plan: true },
        take: 1,
      },
    },
  })

  if (!user) {
    return { isPaid: false, maxRequests: 10 }
  }

  const activeSubscription = user.subscriptions[0];
  const hasActiveSubscription = !!activeSubscription;

  const isPaidUser = hasActiveSubscription && activeSubscription.plan && activeSubscription.plan.maxRequestsPerDay === -1

  if (isPaidUser) {
    return { isPaid: true, maxRequests: -1 }
  }

  return { isPaid: false, maxRequests: 10 }
}

export async function checkRateLimit(
  identifier: string,
  config: Partial<RateLimitConfig> = {}
): Promise<RateLimitResult> {
  // Extract userId from identifier (format: "user:userId")
  const userId = identifier.replace('user:', '')
  
  const userPlan = await getUserPlan(userId)
  
  // If paid user, return unlimited
  if (userPlan.isPaid) {
    return {
      success: true,
      remaining: -1,
      resetTime: Date.now() + 24 * 60 * 60 * 1000,
      totalRequests: 0,
      isUnlimited: true,
    }
  }

  // Free tier - use Redis for rate limiting
  const mergedConfig = { ...FREE_TIER_CONFIG, ...config }
  const key = `${mergedConfig.keyPrefix}:${identifier}`
  const now = Date.now()
  const windowStart = now - mergedConfig.windowMs

  // Use Redis sorted set for sliding window rate limiting
  const pipeline = redis.pipeline()
  
  // Remove expired entries
  pipeline.zremrangebyscore(key, 0, windowStart)
  
  // Count current requests
  pipeline.zcard(key)
  
  // Add current request
  pipeline.zadd(key, { score: now, member: `${now}:${Math.random()}` })
  
  // Set expiry on the key
  pipeline.expire(key, Math.ceil(mergedConfig.windowMs / 1000))
  
  const results = await pipeline.exec()
  
  const currentCount = (results[1] as number) || 0
  const remaining = Math.max(0, mergedConfig.maxRequests - currentCount - 1)
  const resetTime = now + mergedConfig.windowMs
  
  return {
    success: currentCount < mergedConfig.maxRequests,
    remaining,
    resetTime,
    totalRequests: currentCount + 1,
    isUnlimited: false,
  }
}

export async function resetRateLimit(identifier: string, keyPrefix: string = 'ratelimit:free'): Promise<void> {
  const key = `${keyPrefix}:${identifier}`
  await redis.del(key)
}

export async function getRateLimitInfo(identifier: string, keyPrefix: string = 'ratelimit:free'): Promise<RateLimitResult | null> {
  const userId = identifier.replace('user:', '')
  
  const userPlan = await getUserPlan(userId)
  
  if (userPlan.isPaid) {
    return {
      success: true,
      remaining: -1,
      resetTime: Date.now() + 24 * 60 * 60 * 1000,
      totalRequests: 0,
      isUnlimited: true,
    }
  }

  const key = `${keyPrefix}:${identifier}`
  const now = Date.now()
  const windowStart = now - FREE_TIER_CONFIG.windowMs
  
  const pipeline = redis.pipeline()
  pipeline.zremrangebyscore(key, 0, windowStart)
  pipeline.zcard(key)
  
  const results = await pipeline.exec()
  const currentCount = (results[1] as number) || 0
  
  return {
    success: currentCount < FREE_TIER_CONFIG.maxRequests,
    remaining: Math.max(0, FREE_TIER_CONFIG.maxRequests - currentCount),
    resetTime: now + FREE_TIER_CONFIG.windowMs,
    totalRequests: currentCount,
    isUnlimited: false,
  }
}

export function getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  if (result.isUnlimited) {
    return {
      'X-RateLimit-Limit': 'unlimited',
      'X-RateLimit-Remaining': 'unlimited',
      'X-RateLimit-Reset': Math.ceil(result.resetTime / 1000).toString(),
    }
  }
  
  return {
    'X-RateLimit-Limit': FREE_TIER_CONFIG.maxRequests.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': Math.ceil(result.resetTime / 1000).toString(),
  }
}