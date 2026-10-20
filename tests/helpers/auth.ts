import { getServerSession } from 'next-auth'
import { User } from '@prisma/client'

/**
 * Mock NextAuth session for testing
 */
export function mockNextAuthSession(session: {
  user: {
    id: string
    email: string
    name?: string
    image?: string
    role?: string
  }
  expires: string
} | null) {
  ;(getServerSession as jest.Mock).mockResolvedValue(session)
}

/**
 * Create a mock user object
 */
export function createMockUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user_123',
    email: 'test@example.com',
    name: 'Test User',
    passwordHash: 'hashed_password',
    image: null,
    role: 'USER',
    stripeCustomerId: null,
    stripeSubscriptionId: null,
    stripePriceId: null,
    stripeCurrentPeriodEnd: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

/**
 * Create a mock admin user
 */
export function createMockAdminUser(overrides: Partial<User> = {}): User {
  return createMockUser({
    id: 'admin_123',
    email: 'admin@example.com',
    name: 'Admin User',
    role: 'ADMIN',
    ...overrides,
  })
}

/**
 * Create a mock pro user with subscription
 */
export function createMockProUser(overrides: Partial<User> = {}): User {
  return createMockUser({
    id: 'pro_123',
    email: 'pro@example.com',
    name: 'Pro User',
    stripeCustomerId: 'cus_pro_123',
    stripeSubscriptionId: 'sub_pro_123',
    stripePriceId: 'price_pro',
    stripeCurrentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    ...overrides,
  })
}

/**
 * Create a mock free user (no subscription)
 */
export function createMockFreeUser(overrides: Partial<User> = {}): User {
  return createMockUser({
    id: 'free_123',
    email: 'free@example.com',
    name: 'Free User',
    stripeCustomerId: null,
    stripeSubscriptionId: null,
    stripePriceId: null,
    stripeCurrentPeriodEnd: null,
    ...overrides,
  })
}