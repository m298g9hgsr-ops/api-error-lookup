import { faker } from '@faker-js/faker'
import { Subscription, Plan } from '@prisma/client'

export type SubscriptionStatus = 'active' | 'canceled' | 'incomplete' | 'incomplete_expired' | 'past_due' | 'trialing'

export interface SubscriptionFactoryOptions {
  id?: string
  userId?: string
  planId?: string
  stripeCustomerId?: string
  stripeSubscriptionId?: string | null
  stripePriceId?: string | null
  status?: SubscriptionStatus
  currentPeriodStart?: Date
  currentPeriodEnd?: Date
  cancelAtPeriodEnd?: boolean
  canceledAt?: Date | null
  createdAt?: Date
  updatedAt?: Date
}

/**
 * Create a single test subscription with faker data
 */
export function createSubscription(overrides: SubscriptionFactoryOptions = {}): Subscription {
  const now = new Date()
  const periodStart = overrides.currentPeriodStart || new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000)
  const periodEnd = overrides.currentPeriodEnd || new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000)
  
  return {
    id: overrides.id || `sub_${faker.string.uuid()}`,
    userId: overrides.userId || faker.string.uuid(),
    planId: overrides.planId || 'plan_pro',
    stripeCustomerId: overrides.stripeCustomerId || `cus_${faker.string.alphanumeric(14)}`,
    stripeSubscriptionId: overrides.stripeSubscriptionId ?? `sub_${faker.string.alphanumeric(14)}`,
    stripePriceId: overrides.stripePriceId || 'price_pro',
    status: overrides.status || 'active',
    currentPeriodStart: periodStart,
    currentPeriodEnd: periodEnd,
    cancelAtPeriodEnd: overrides.cancelAtPeriodEnd ?? false,
    canceledAt: overrides.canceledAt ?? null,
    createdAt: overrides.createdAt || faker.date.past({ years: 1 }),
    updatedAt: overrides.updatedAt || now,
  }
}

/**
 * Create multiple test subscriptions
 */
export function createSubscriptions(count: number, userId: string, baseOverrides: SubscriptionFactoryOptions = {}): Subscription[] {
  return Array.from({ length: count }, () => 
    createSubscription({ ...baseOverrides, userId })
  )
}

/**
 * Create an active subscription
 */
export function createActiveSubscription(userId: string, planId: string = 'plan_pro', overrides: SubscriptionFactoryOptions = {}): Subscription {
  const periodStart = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000)
  const periodEnd = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000)
  
  return createSubscription({
    ...overrides,
    userId,
    planId,
    status: 'active',
    currentPeriodStart: periodStart,
    currentPeriodEnd: periodEnd,
    cancelAtPeriodEnd: false,
    canceledAt: null,
    stripeSubscriptionId: `sub_${faker.string.alphanumeric(14)}`,
    stripePriceId: planId === 'plan_pro' ? 'price_pro' : 'price_enterprise',
  })
}

/**
 * Create a canceled subscription (still active until period end)
 */
export function createCanceledSubscription(userId: string, planId: string = 'plan_pro', overrides: SubscriptionFactoryOptions = {}): Subscription {
  const periodStart = new Date(Date.now() - 20 * 24 * 60 * 60 * 1000)
  const periodEnd = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000) // 10 days left
  
  return createSubscription({
    ...overrides,
    userId,
    planId,
    status: 'active', // Still active until period end
    currentPeriodStart: periodStart,
    currentPeriodEnd: periodEnd,
    cancelAtPeriodEnd: true,
    canceledAt: new Date(),
    stripeSubscriptionId: `sub_${faker.string.alphanumeric(14)}`,
    stripePriceId: planId === 'plan_pro' ? 'price_pro' : 'price_enterprise',
  })
}

/**
 * Create a past_due subscription (payment failed)
 */
export function createPastDueSubscription(userId: string, planId: string = 'plan_pro', overrides: SubscriptionFactoryOptions = {}): Subscription {
  const periodStart = new Date(Date.now() - 20 * 24 * 60 * 60 * 1000)
  const periodEnd = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) // 5 days ago
  
  return createSubscription({
    ...overrides,
    userId,
    planId,
    status: 'past_due',
    currentPeriodStart: periodStart,
    currentPeriodEnd: periodEnd,
    cancelAtPeriodEnd: false,
    canceledAt: null,
    stripeSubscriptionId: `sub_${faker.string.alphanumeric(14)}`,
    stripePriceId: planId === 'plan_pro' ? 'price_pro' : 'price_enterprise',
  })
}

/**
 * Create a trialing subscription
 */
export function createTrialingSubscription(userId: string, planId: string = 'plan_pro', overrides: SubscriptionFactoryOptions = {}): Subscription {
  const periodStart = new Date()
  const periodEnd = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) // 14 day trial
  
  return createSubscription({
    ...overrides,
    userId,
    planId,
    status: 'trialing',
    currentPeriodStart: periodStart,
    currentPeriodEnd: periodEnd,
    cancelAtPeriodEnd: false,
    canceledAt: null,
    stripeSubscriptionId: `sub_${faker.string.alphanumeric(14)}`,
    stripePriceId: planId === 'plan_pro' ? 'price_pro' : 'price_enterprise',
  })
}

/**
 * Create an incomplete subscription (checkout not completed)
 */
export function createIncompleteSubscription(userId: string, planId: string = 'plan_pro', overrides: SubscriptionFactoryOptions = {}): Subscription {
  const periodStart = new Date()
  const periodEnd = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
  
  return createSubscription({
    ...overrides,
    userId,
    planId,
    status: 'incomplete',
    currentPeriodStart: periodStart,
    currentPeriodEnd: periodEnd,
    cancelAtPeriodEnd: false,
    canceledAt: null,
    stripeSubscriptionId: null,
    stripePriceId: null,
  })
}

/**
 * Check if subscription is active (status active/trialing AND currentPeriodEnd > now)
 */
export function isSubscriptionActive(subscription: Subscription): boolean {
  if (subscription.status !== 'active' && subscription.status !== 'trialing') {
    return false
  }
  return subscription.currentPeriodEnd > new Date()
}

/**
 * Subscription fixtures for common test scenarios
 */
export const subscriptionFixtures = {
  // Single subscriptions
  active: (userId: string, planId: string = 'plan_pro') => createActiveSubscription(userId, planId),
  canceled: (userId: string, planId: string = 'plan_pro') => createCanceledSubscription(userId, planId),
  pastDue: (userId: string, planId: string = 'plan_pro') => createPastDueSubscription(userId, planId),
  trialing: (userId: string, planId: string = 'plan_pro') => createTrialingSubscription(userId, planId),
  incomplete: (userId: string, planId: string = 'plan_pro') => createIncompleteSubscription(userId, planId),
  
  // User with subscription
  userWithActive: (userId: string) => createActiveSubscription(userId, 'plan_pro'),
  userWithCanceled: (userId: string) => createCanceledSubscription(userId, 'plan_pro'),
  userWithPastDue: (userId: string) => createPastDueSubscription(userId, 'plan_pro'),
  userWithTrialing: (userId: string) => createTrialingSubscription(userId, 'plan_pro'),
  
  // Different plan tiers
  freeUser: (userId: string) => createActiveSubscription(userId, 'plan_free', {
    status: 'active',
    currentPeriodStart: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  }),
  
  proUser: (userId: string) => createActiveSubscription(userId, 'plan_pro'),
  enterpriseUser: (userId: string) => createActiveSubscription(userId, 'plan_enterprise'),
  
  // Expiring soon (within 7 days)
  expiringSoon: (userId: string, planId: string = 'plan_pro') => createActiveSubscription(userId, planId, {
    currentPeriodStart: new Date(Date.now() - 23 * 24 * 60 * 60 * 1000),
    currentPeriodEnd: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  }),
  
  // Recently renewed (within 7 days)
  recentlyRenewed: (userId: string, planId: string = 'plan_pro') => createActiveSubscription(userId, planId, {
    currentPeriodStart: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    currentPeriodEnd: new Date(Date.now() + 23 * 24 * 60 * 60 * 1000),
  }),
  
  // Annual billing cycle
  annualBilling: (userId: string, planId: string = 'plan_pro') => createActiveSubscription(userId, planId, {
    currentPeriodStart: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000),
    currentPeriodEnd: new Date(Date.now() + 185 * 24 * 60 * 60 * 1000),
  }),
  
  // Canceled at period end
  canceledAtPeriodEnd: (userId: string, planId: string = 'plan_pro') => createCanceledSubscription(userId, planId),
  
  // Payment retry scenarios
  pastDueRetrying: (userId: string, planId: string = 'plan_pro') => createPastDueSubscription(userId, planId, {
    currentPeriodStart: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    currentPeriodEnd: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
  }),
  
  // Multiple subscriptions per user (for migration testing)
  multipleActive: (userId: string) => [
    createActiveSubscription(userId, 'plan_pro', {
      currentPeriodStart: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    }),
    createCanceledSubscription(userId, 'plan_free', {
      currentPeriodStart: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
      currentPeriodEnd: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    }),
  ],
  
  // Subscription batch for testing
  createSubscriptionBatch: (
    userIds: string[],
    statuses: SubscriptionStatus[] = ['active', 'active', 'past_due', 'canceled']
  ): Subscription[] => {
    return userIds.map((userId, i) => {
      const status = statuses[i % statuses.length]
      switch (status) {
        case 'active':
          return createActiveSubscription(userId)
        case 'past_due':
          return createPastDueSubscription(userId)
        case 'canceled':
          return createCanceledSubscription(userId)
        case 'trialing':
          return createTrialingSubscription(userId)
        case 'incomplete':
          return createIncompleteSubscription(userId)
        default:
          return createActiveSubscription(userId)
      }
    })
  },
}