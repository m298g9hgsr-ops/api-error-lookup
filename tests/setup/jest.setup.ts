import { vi, beforeAll, afterAll, afterEach, beforeEach } from 'vitest'
import '@testing-library/jest-dom'

// Mock environment variables
process.env.NODE_ENV = 'test'
process.env.NEXTAUTH_SECRET = 'test-secret-key-for-testing-only'
process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000'
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test'
process.env.STRIPE_SECRET_KEY = 'sk_test_mock'
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_mock'
process.env.OLLAMA_BASE_URL = 'http://localhost:11434'
process.env.DEFAULT_AI_MODEL = 'codellama'
process.env.UPSTASH_REDIS_REST_URL = 'http://localhost:8079'
process.env.UPSTASH_REDIS_REST_TOKEN = 'mock-token'

// Mock Prisma Client
const mockPrismaClient = {
  user: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    upsert: vi.fn(),
  },
  analysis: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  plan: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  subscription: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    upsert: vi.fn(),
  },
  account: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  session: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  verificationToken: {
    findUnique: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
  },
  errorLog: {
    count: vi.fn(),
    create: vi.fn(),
    findMany: vi.fn(),
  },
  $connect: vi.fn(),
  $disconnect: vi.fn(),
  $transaction: vi.fn((callback) => callback(mockPrismaClient)),
}

vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn().mockImplementation(() => mockPrismaClient),
}))

// Mock next-auth
vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}))

vi.mock('next-auth/providers/credentials', () => ({
  __esModule: true,
  default: vi.fn(),
}))

vi.mock('@next-auth/prisma-adapter', () => ({
  PrismaAdapter: vi.fn(),
}))

// Mock @upstash/redis
try {
  vi.mock('@upstash/redis', () => ({
    Redis: vi.fn().mockImplementation(() => ({
      pipeline: vi.fn().mockReturnThis(),
      zremrangebyscore: vi.fn().mockReturnThis(),
      zcard: vi.fn().mockReturnThis(),
      zadd: vi.fn().mockReturnThis(),
      expire: vi.fn().mockReturnThis(),
      exec: vi.fn().mockResolvedValue([null, 0]),
      del: vi.fn().mockResolvedValue(1),
    })),
  }))
} catch {
  // Module not installed, skip mock
  console.warn('@upstash/redis not installed, skipping mock')
}

// Mock stripe
vi.mock('stripe', () => {
  const StripeMock = vi.fn().mockImplementation(() => ({
    checkout: {
      sessions: {
        create: vi.fn().mockResolvedValue({ 
          url: 'https://checkout.stripe.com/test',
          id: 'cs_test',
          subscription: 'sub_test',
        }),
      },
    },
    billingPortal: {
      sessions: {
        create: vi.fn().mockResolvedValue({ 
          url: 'https://billing.stripe.com/test',
        }),
      },
    },
    subscriptions: {
      retrieve: vi.fn().mockResolvedValue({
        status: 'active',
        current_period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
        items: {
          data: [{ 
            id: 'si_test', 
            price: { id: 'price_test', nickname: 'Pro Plan' } 
          }],
        },
      }),
      cancel: vi.fn().mockResolvedValue({}),
      update: vi.fn().mockResolvedValue({}),
    },
    customers: {
      create: vi.fn().mockResolvedValue({ id: 'cus_test' }),
    },
    prices: {
      list: vi.fn().mockResolvedValue({ data: [] }),
    },
    webhooks: {
      constructEvent: vi.fn().mockImplementation((payload, sig, secret) => {
        return JSON.parse(payload)
      }),
    },
  }))
  return { __esModule: true, default: StripeMock, Stripe: StripeMock }
})

// Mock bcrypt
vi.mock('bcryptjs', () => ({
  compare: vi.fn().mockResolvedValue(true),
  hash: vi.fn().mockResolvedValue('hashed-password'),
}))

// Mock fetch globally
global.fetch = vi.fn()

// Console suppress for tests
const originalError = console.error
const originalWarn = console.warn

beforeAll(() => {
  console.error = (...args) => {
    if (args[0]?.includes?.('Warning: ReactDOM.render is no longer supported')) return
    originalError.apply(console, args)
  }
  console.warn = (...args) => {
    if (args[0]?.includes?.('Warning:')) return
    originalWarn.apply(console, args)
  }
})

afterAll(() => {
  console.error = originalError
  console.warn = originalWarn
})

// Clean up mocks between tests
afterEach(() => {
  vi.clearAllMocks()
})