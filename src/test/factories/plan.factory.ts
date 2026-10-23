import { faker } from '@faker-js/faker'
import { Plan } from '@prisma/client'

export interface PlanFactoryOptions {
  id?: string
  name?: string
  description?: string
  priceMonthly?: number
  priceYearly?: number | null
  features?: string // JSON string
  maxRequestsPerDay?: number
  stripePriceIdMonthly?: string | null
  stripePriceIdYearly?: string | null
  isActive?: boolean
  createdAt?: Date
  updatedAt?: Date
}

/**
 * Create a single test plan with faker data
 */
export function createPlan(overrides: PlanFactoryOptions = {}): Plan {
  const now = new Date()
  const planNames = ['free', 'starter', 'pro', 'business', 'enterprise', 'custom']
  
  const name = overrides.name || faker.helpers.arrayElement(planNames)
  const priceMonthly = overrides.priceMonthly ?? faker.number.int({ min: 0, max: 99900 })
  const priceYearly = overrides.priceYearly ?? (priceMonthly > 0 ? faker.number.int({ min: priceMonthly * 10, max: priceMonthly * 12 }) : null)
  
  return {
    id: overrides.id || `plan_${faker.string.uuid()}`,
    name,
    description: overrides.description || faker.lorem.sentence(),
    priceMonthly,
    priceYearly,
    features: overrides.features || JSON.stringify({ analysesPerDay: faker.number.int({ min: 10, max: 1000 }) }),
    maxRequestsPerDay: overrides.maxRequestsPerDay || faker.number.int({ min: 10, max: 10000 }),
    stripePriceIdMonthly: overrides.stripePriceIdMonthly ?? (priceMonthly > 0 ? `price_${faker.string.alphanumeric(14)}` : null),
    stripePriceIdYearly: overrides.stripePriceIdYearly ?? (priceYearly ? `price_${faker.string.alphanumeric(14)}` : null),
    isActive: overrides.isActive ?? true,
    createdAt: overrides.createdAt || faker.date.past({ years: 1 }),
    updatedAt: overrides.updatedAt || now,
  }
}

/**
 * Create multiple test plans
 */
export function createPlans(count: number, baseOverrides: PlanFactoryOptions = {}): Plan[] {
  return Array.from({ length: count }, () => createPlan(baseOverrides))
}

/**
 * Create the standard free plan
 */
export function createFreePlan(overrides: PlanFactoryOptions = {}): Plan {
  return createPlan({
    ...overrides,
    id: 'plan_free',
    name: 'free',
    description: 'Free tier with basic features for getting started',
    priceMonthly: 0,
    priceYearly: null,
    features: JSON.stringify({ analysesPerDay: 10, historyDays: 7, support: 'community' }),
    maxRequestsPerDay: 10,
    stripePriceIdMonthly: null,
    stripePriceIdYearly: null,
    isActive: true,
  })
}

/**
 * Create the standard pro plan
 */
export function createProPlan(overrides: PlanFactoryOptions = {}): Plan {
  return createPlan({
    ...overrides,
    id: 'plan_pro',
    name: 'pro',
    description: 'Professional tier with higher limits and priority support',
    priceMonthly: 2900, // $29.00
    priceYearly: 29000, // $290.00 (10 months free)
    features: JSON.stringify({ 
      analysesPerDay: 100, 
      historyDays: 90, 
      support: 'email',
      apiAccess: true,
      customPrompts: true,
    }),
    maxRequestsPerDay: 100,
    stripePriceIdMonthly: 'price_pro',
    stripePriceIdYearly: 'price_pro_yearly',
    isActive: true,
  })
}

/**
 * Create the standard enterprise plan
 */
export function createEnterprisePlan(overrides: PlanFactoryOptions = {}): Plan {
  return createPlan({
    ...overrides,
    id: 'plan_enterprise',
    name: 'enterprise',
    description: 'Enterprise tier with unlimited access and dedicated support',
    priceMonthly: 9900, // $99.00
    priceYearly: 99000, // $990.00 (10 months free)
    features: JSON.stringify({ 
      analysesPerDay: -1, // Unlimited
      historyDays: 365,
      support: 'dedicated',
      apiAccess: true,
      customPrompts: true,
      sso: true,
      auditLogs: true,
    }),
    maxRequestsPerDay: -1, // Unlimited
    stripePriceIdMonthly: 'price_enterprise',
    stripePriceIdYearly: 'price_enterprise_yearly',
    isActive: true,
  })
}

/**
 * Create a custom plan
 */
export function createCustomPlan(overrides: PlanFactoryOptions = {}): Plan {
  return createPlan({
    ...overrides,
    id: `plan_custom_${faker.string.uuid()}`,
    name: `custom_${faker.string.alphanumeric(8)}`,
    isActive: true,
  })
}

/**
 * Create an inactive plan
 */
export function createInactivePlan(overrides: PlanFactoryOptions = {}): Plan {
  return createPlan({
    ...overrides,
    isActive: false,
  })
}

/**
 * Create annual plan variant
 */
export function createAnnualPlan(monthlyPlan: Plan, discountPercent: number = 20): Plan {
  const discount = discountPercent / 100
  return createPlan({
    id: `${monthlyPlan.id}_annual`,
    name: `${monthlyPlan.name}_annual`,
    description: `${monthlyPlan.description} (Annual - ${discountPercent}% off)`,
    priceMonthly: Math.round(monthlyPlan.priceMonthly * 12 * (1 - discount)),
    priceYearly: monthlyPlan.priceYearly,
    features: monthlyPlan.features,
    maxRequestsPerDay: monthlyPlan.maxRequestsPerDay,
    stripePriceIdMonthly: monthlyPlan.stripePriceIdMonthly,
    stripePriceIdYearly: monthlyPlan.stripePriceIdYearly,
    isActive: monthlyPlan.isActive,
  })
}

/**
 * Plan fixtures for common test scenarios
 */
export const planFixtures = {
  // Standard three-tier plans
  standard: () => [
    createFreePlan(),
    createProPlan(),
    createEnterprisePlan(),
  ],
  
  // All standard plans including annual
  withAnnual: () => {
    const plans = [
      createFreePlan(),
      createProPlan(),
      createEnterprisePlan(),
    ]
    return [
      ...plans,
      ...plans.filter(p => p.priceMonthly > 0).map(p => createAnnualPlan(p, 20)),
    ]
  },
  
  // Five-tier pricing
  fiveTier: () => {
    const free = createFreePlan()
    const starter = createPlan({
      id: 'plan_starter',
      name: 'starter',
      description: 'Starter tier for small projects',
      priceMonthly: 900, // $9.00
      priceYearly: 9000,
      features: JSON.stringify({ analysesPerDay: 25, historyDays: 30, support: 'email' }),
      maxRequestsPerDay: 25,
      stripePriceIdMonthly: 'price_starter',
      stripePriceIdYearly: 'price_starter_yearly',
    })
    const pro = createProPlan()
    const business = createPlan({
      id: 'plan_business',
      name: 'business',
      description: 'Business tier for teams',
      priceMonthly: 4900, // $49.00
      priceYearly: 49000,
      features: JSON.stringify({ 
        analysesPerDay: 500, 
        historyDays: 180, 
        support: 'priority',
        apiAccess: true,
        customPrompts: true,
        teamAccess: true,
      }),
      maxRequestsPerDay: 500,
      stripePriceIdMonthly: 'price_business',
      stripePriceIdYearly: 'price_business_yearly',
    })
    const enterprise = createEnterprisePlan()
    return [free, starter, pro, business, enterprise]
  },
  
  // Annual discounts
  withAnnualDiscounts: () => {
    const plans = getStandardPlans()
    return [
      ...plans,
      ...plans.filter(p => p.priceMonthly > 0).map(p => createAnnualPlan(p, 20)),
    ]
  },
  
  // Custom pricing
  customPricing: () => [
    createFreePlan(),
    createPlan({ name: 'custom_1', description: 'Custom Plan 1', priceMonthly: 4900, maxRequestsPerDay: 200 }),
    createPlan({ name: 'custom_2', description: 'Custom Plan 2', priceMonthly: 14900, maxRequestsPerDay: 2000 }),
  ],
  
  // Inactive plans for migration testing
  withArchived: () => [
    ...getStandardPlans(),
    createInactivePlan({ name: 'legacy_basic', description: 'Legacy Basic' }),
    createInactivePlan({ name: 'legacy_pro', description: 'Legacy Pro' }),
  ],
}

/**
 * Get standard plans (free, starter, pro, business, enterprise) - 5 tiers
 */
export function getStandardPlans(): Plan[] {
  return [
    createFreePlan(),
    createPlan({
      id: 'plan_starter',
      name: 'starter',
      description: 'Starter tier for small projects',
      priceMonthly: 900,
      priceYearly: 9000,
      features: JSON.stringify({ analysesPerDay: 25, historyDays: 30, support: 'email' }),
      maxRequestsPerDay: 25,
      stripePriceIdMonthly: 'price_starter',
      stripePriceIdYearly: 'price_starter_yearly',
      isActive: true,
    }),
    createProPlan(),
    createPlan({
      id: 'plan_business',
      name: 'business',
      description: 'Business tier for teams',
      priceMonthly: 4900,
      priceYearly: 49000,
      features: JSON.stringify({ 
        analysesPerDay: 500, 
        historyDays: 180, 
        support: 'priority',
        apiAccess: true,
        customPrompts: true,
        teamAccess: true,
      }),
      maxRequestsPerDay: 500,
      stripePriceIdMonthly: 'price_business',
      stripePriceIdYearly: 'price_business_yearly',
      isActive: true,
    }),
    createEnterprisePlan(),
  ]
}

// Helper to avoid circular reference (kept for internal use)
function getStandardPlansInternal() {
  return [
    createFreePlan(),
    createProPlan(),
    createEnterprisePlan(),
  ]
}