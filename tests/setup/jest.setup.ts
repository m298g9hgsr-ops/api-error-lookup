import { jest } from '@jest/globals'

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
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    upsert: jest.fn(),
  },
  analysis: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  plan: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  subscription: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    upsert: jest.fn(),
  },
  account: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  session: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  verificationToken: {
    findUnique: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
  },
  errorLog: {
    count: jest.fn(),
    create: jest.fn(),
    findMany: jest.fn(),
  },
  $connect: jest.fn(),
  $disconnect: jest.fn(),
  $transaction: jest.fn((callback) => callback(mockPrismaClient)),
}

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => mockPrismaClient),
}))

// Mock next-auth
jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}))

jest.mock('next-auth/providers/credentials', () => ({
  __esModule: true,
  default: jest.fn(),
}))

jest.mock('@next-auth/prisma-adapter', () => ({
  PrismaAdapter: jest.fn(),
}))

// Mock @upstash/redis
try {
  jest.mock('@upstash/redis', () => ({
    Redis: jest.fn().mockImplementation(() => ({
      pipeline: jest.fn().mockReturnThis(),
      zremrangebyscore: jest.fn().mockReturnThis(),
      zcard: jest.fn().mockReturnThis(),
      zadd: jest.fn().mockReturnThis(),
      expire: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([null, 0]),
      del: jest.fn().mockResolvedValue(1),
    })),
  }))
} catch {
  // Module not installed, skip mock
  console.warn('@upstash/redis not installed, skipping mock')
}

// Mock stripe
jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => ({
    checkout: {
      sessions: {
        create: jest.fn().mockResolvedValue({ 
          url: 'https://checkout.stripe.com/test',
          id: 'cs_test',
          subscription: 'sub_test',
        }),
      },
    },
    billingPortal: {
      sessions: {
        create: jest.fn().mockResolvedValue({ 
          url: 'https://billing.stripe.com/test',
        }),
      },
    },
    subscriptions: {
      retrieve: jest.fn().mockResolvedValue({
        status: 'active',
        current_period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
        items: {
          data: [{ 
            id: 'si_test', 
            price: { id: 'price_test', nickname: 'Pro Plan' } 
          }],
        },
      }),
      cancel: jest.fn().mockResolvedValue({}),
      update: jest.fn().mockResolvedValue({}),
    },
    customers: {
      create: jest.fn().mockResolvedValue({ id: 'cus_test' }),
    },
    prices: {
      list: jest.fn().mockResolvedValue({ data: [] }),
    },
    webhooks: {
      constructEvent: jest.fn().mockImplementation((payload, sig, secret) => {
        return JSON.parse(payload)
      }),
    },
  }))
})

// Mock bcrypt
jest.mock('bcryptjs', () => ({
  compare: jest.fn().mockResolvedValue(true),
  hash: jest.fn().mockResolvedValue('hashed-password'),
}))

// Mock fetch globally
global.fetch = jest.fn()

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
  jest.clearAllMocks()
})