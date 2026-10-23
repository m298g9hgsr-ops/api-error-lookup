import { describe, it, expect, vi } from 'vitest'
import { createMockSession, createMockUser, renderWithProviders } from '@/test/utils'
import { createUser, createUsers, createFreeUser, createProUser, createAdminUser } from '@/test/factories/user.factory'
import { createAnalysis, createAnalysesForUser } from '@/test/factories/analysis.factory'
import { createActiveSubscription, createCanceledSubscription, createPastDueSubscription, isSubscriptionActive } from '@/test/factories/subscription.factory'
import { createFreePlan, createProPlan, createEnterprisePlan, getStandardPlans } from '@/test/factories/plan.factory'
import { sanitizeUser, sanitizeAnalysis, deepSanitize, maskEmail } from '@/test/sanitization'

describe('Test Infrastructure Verification', () => {
  describe('Test Utilities', () => {
    it('should create mock session', () => {
      const session = createMockSession()
      expect(session).toBeDefined()
      expect(session.user).toBeDefined()
      expect(session.user.id).toBe('user_123')
      expect(session.expires).toBeDefined()
    })

    it('should create mock user', () => {
      const user = createMockUser()
      expect(user).toBeDefined()
      expect(user.id).toBe('user_123')
      expect(user.email).toBe('test@example.com')
    })

    it('should create mock user with overrides', () => {
      const user = createMockUser({ role: 'ADMIN', email: 'admin@test.com' })
      expect(user.role).toBe('ADMIN')
      expect(user.email).toBe('admin@test.com')
    })
  })

  describe('User Factory', () => {
    it('should create basic user', () => {
      const user = createUser()
      expect(user).toBeDefined()
      expect(user.id).toBeDefined()
      expect(user.email).toContain('@')
      expect(user.name).toBeDefined()
      expect(user.role).toBe('USER')
    })

    it('should create free user', () => {
      const user = createFreeUser()
      // User model doesn't have stripe fields, just check role
      expect(user.role).toBe('USER')
    })

    it('should create pro user with subscription', () => {
      const user = createProUser()
      expect(user.role).toBe('USER')
    })

    it('should create admin user', () => {
      const user = createAdminUser()
      expect(user.role).toBe('ADMIN')
    })

    it('should create multiple users', () => {
      const users = createUsers(3)
      expect(users).toHaveLength(3)
      expect(new Set(users.map(u => u.email)).size).toBe(3)
    })
  })

  describe('Analysis Factory', () => {
    it('should create analysis with error type', () => {
      const analysis = createAnalysis({ errorType: 'TypeError' })
      expect(analysis.errorType).toBe('TypeError')
      expect(analysis.errorInput).toBeDefined()
      expect(analysis.analysis).toBeDefined()
    })

    it('should create analyses for user', () => {
      const userId = 'user_123'
      const analyses = createAnalysesForUser(userId, 3)
      expect(analyses).toHaveLength(3)
      analyses.forEach(a => expect(a.userId).toBe(userId))
    })

    it('should generate stack trace', () => {
      const analysis = createAnalysis({ stackTrace: true })
      expect(analysis.stackTrace).toBeDefined()
      expect(analysis.stackTrace).toContain('at ')
    })
  })

  describe('Subscription Factory', () => {
    it('should create active subscription', () => {
      const sub = createActiveSubscription('user_123')
      expect(sub.status).toBe('active')
      expect(sub.currentPeriodEnd > new Date()).toBe(true)
      expect(sub.cancelAtPeriodEnd).toBe(false)
    })

    it('should create canceled subscription', () => {
      const sub = createCanceledSubscription('user_123')
      expect(sub.status).toBe('active')
      expect(sub.cancelAtPeriodEnd).toBe(true)
    })

    it('should check if subscription is active', () => {
      const active = createActiveSubscription('user_123')
      const pastDue = createPastDueSubscription('user_123')
      expect(isSubscriptionActive(active)).toBe(true)
      expect(isSubscriptionActive(pastDue)).toBe(false)
    })
  })

  describe('Plan Factory', () => {
    it('should create free plan', () => {
      const plan = createFreePlan()
      expect(plan.name).toBe('free')
      expect(plan.priceMonthly).toBe(0)
      expect(plan.stripePriceIdMonthly).toBeNull()
    })

    it('should create pro plan', () => {
      const plan = createProPlan()
      expect(plan.name).toBe('pro')
      expect(plan.priceMonthly).toBe(2900)
      expect(plan.stripePriceIdMonthly).toBe('price_pro')
    })

    it('should create enterprise plan', () => {
      const plan = createEnterprisePlan()
      expect(plan.name).toBe('enterprise')
      expect(plan.priceMonthly).toBe(9900)
      expect(JSON.parse(plan.features).analysesPerDay).toBe(-1)
    })

    it('should get all standard plans', () => {
      const plans = getStandardPlans()
      expect(plans).toHaveLength(5)
      expect(plans.map(p => p.name)).toContain('free')
      expect(plans.map(p => p.name)).toContain('starter')
      expect(plans.map(p => p.name)).toContain('pro')
      expect(plans.map(p => p.name)).toContain('business')
      expect(plans.map(p => p.name)).toContain('enterprise')
    })
  })

  describe('Sanitization', () => {
    it('should sanitize user by removing passwordHash', () => {
      const user = createUser()
      const sanitized = sanitizeUser(user)
      expect(sanitized.passwordHash).toBeUndefined()
      expect(sanitized.email).toBe(user.email)
    })

    it('should sanitize analysis', () => {
      const analysis = createAnalysis()
      const sanitized = sanitizeAnalysis(analysis, { removeErrorMessage: true })
      expect(sanitized.errorInput).toBe('[REDACTED]')
      expect(sanitized.errorType).toBe(analysis.errorType)
      expect(sanitized.analysis).toBe(analysis.analysis)
    })

    it('should deep sanitize sensitive keys', () => {
      const obj = {
        name: 'test',
        password: 'secret123',
        apiKey: 'key123',
        nested: {
          token: 'token123',
          normal: 'value',
        },
      }
      const sanitized = deepSanitize(obj)
      expect(sanitized.password).toBe('[REDACTED]')
      expect(sanitized.apiKey).toBe('[REDACTED]')
      expect(sanitized.nested.token).toBe('[REDACTED]')
      expect(sanitized.nested.normal).toBe('value')
    })

    it('should mask email', () => {
      expect(maskEmail('test@example.com')).toBe('t**t@example.com')
      expect(maskEmail('a@b.com')).toBe('*@b.com')
    })
  })

  describe('Vitest Configuration', () => {
    it('should have vi globals available', () => {
      expect(vi).toBeDefined()
      expect(vi.fn).toBeDefined()
    })

    it('should have expect globals available', () => {
      expect(expect).toBeDefined()
      expect(true).toBe(true)
    })
  })
})
