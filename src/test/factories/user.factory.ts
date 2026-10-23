import { faker } from '@faker-js/faker'
import { User } from '@prisma/client'

export type UserRole = 'USER' | 'ADMIN'

export interface UserFactoryOptions {
  id?: string
  email?: string
  name?: string
  passwordHash?: string
  image?: string | null
  role?: UserRole
  createdAt?: Date
  updatedAt?: Date
}

/**
 * Create a single test user with faker data
 */
export function createUser(overrides: UserFactoryOptions = {}): User {
  const now = new Date()
  
  return {
    id: overrides.id || faker.string.uuid(),
    email: overrides.email || faker.internet.email().toLowerCase(),
    name: overrides.name || faker.person.fullName(),
    passwordHash: overrides.passwordHash || faker.string.alphanumeric(60), // bcrypt-like hash length
    image: overrides.image ?? faker.image.avatar(),
    role: overrides.role || 'USER',
    emailVerified: null,
    createdAt: overrides.createdAt || faker.date.past({ years: 1 }),
    updatedAt: overrides.updatedAt || now,
  }
}

/**
 * Create multiple test users
 */
export function createUsers(count: number, baseOverrides: UserFactoryOptions = {}): User[] {
  return Array.from({ length: count }, (_, i) => 
    createUser({
      ...baseOverrides,
      email: baseOverrides.email ? `${baseOverrides.email.split('@')[0]}+${i}@${baseOverrides.email.split('@')[1]}` : undefined,
    })
  )
}

/**
 * Create a free tier user
 */
export function createFreeUser(overrides: UserFactoryOptions = {}): User {
  return createUser({
    ...overrides,
    role: 'USER',
  })
}

/**
 * Create a pro tier user with subscription
 */
export function createProUser(overrides: UserFactoryOptions = {}): User {
  return createUser({
    ...overrides,
    role: 'USER',
  })
}

/**
 * Create an enterprise tier user
 */
export function createEnterpriseUser(overrides: UserFactoryOptions = {}): User {
  return createUser({
    ...overrides,
    role: 'USER',
  })
}

/**
 * Create an admin user
 */
export function createAdminUser(overrides: UserFactoryOptions = {}): User {
  return createUser({
    ...overrides,
    role: 'ADMIN',
    email: overrides.email || 'admin@example.com',
  })
}

/**
 * Create a user with expired subscription
 */
export function createExpiredSubscriptionUser(overrides: UserFactoryOptions = {}): User {
  return createUser({
    ...overrides,
    role: 'USER',
  })
}

/**
 * User fixtures for common test scenarios
 */
export const userFixtures = {
  // Single users
  free: () => createFreeUser(),
  pro: () => createProUser(),
  enterprise: () => createEnterpriseUser(),
  admin: () => createAdminUser(),
  expired: () => createExpiredSubscriptionUser(),
  
  // Mixed batch for testing
  mixedBatch: (counts?: { free: number; pro: number; admin: number; pastDue: number }): User[] => {
    const c = counts || { free: 5, pro: 3, admin: 1, pastDue: 2 };
    return [
      ...createUsers(c.free, { role: 'USER' }),
      ...createUsers(c.pro, { role: 'USER' }),
      ...createUsers(c.admin, { role: 'ADMIN' }),
      ...createUsers(c.pastDue, { role: 'USER' }),
    ].map((user, i) => ({
      ...user,
      email: `batch-user-${i}@example.com`,
    }))
  },
}