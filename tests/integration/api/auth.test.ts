import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { type Mock } from 'vitest'

// Use vi.hoisted to avoid hoisting issues with mocks
const { mockCredentialsProvider, mockPrismaAdapter, mockGetServerSession, mockBcryptCompare, mockPrismaUserFindUnique } = vi.hoisted(() => ({
  mockCredentialsProvider: vi.fn((opts) => ({ ...opts, id: 'credentials' })),
  mockPrismaAdapter: vi.fn(() => ({})),
  mockGetServerSession: vi.fn(),
  mockBcryptCompare: vi.fn(),
  mockPrismaUserFindUnique: vi.fn(),
}))

vi.mock('next-auth', () => ({
  getServerSession: mockGetServerSession,
}))

vi.mock('next-auth/providers/credentials', () => ({
  __esModule: true,
  default: mockCredentialsProvider,
}))

vi.mock('@next-auth/prisma-adapter', () => ({
  PrismaAdapter: mockPrismaAdapter,
}))

vi.mock('bcryptjs', () => {
  const compare = mockBcryptCompare
  const hash = vi.fn()
  return { __esModule: true, default: { compare, hash }, compare, hash }
})

vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: mockPrismaUserFindUnique,
    },
  },
}))

describe('Auth Configuration (authOptions)', () => {
  it('should have credentials provider configured', () => {
    const credentialsProvider = authOptions.providers.find(
      (p) => p.id === 'credentials'
    )
    
    expect(credentialsProvider).toBeDefined()
    expect(credentialsProvider?.name).toBe('credentials')
  })

  it('should have correct credentials fields', () => {
    const credentialsProvider = authOptions.providers.find(
      (p) => p.id === 'credentials'
    ) as any
    
    expect(credentialsProvider?.credentials).toEqual({
      email: { label: 'Email', type: 'email' },
      password: { label: 'Password', type: 'password' },
    })
  })

  it('should use PrismaAdapter', () => {
    expect(authOptions.adapter).toBeDefined()
  })

  it('should have JWT session strategy', () => {
    expect(authOptions.session?.strategy).toBe('jwt')
  })

  it('should have correct signIn page', () => {
    expect(authOptions.pages?.signIn).toBe('/auth/signin')
  })

  it('should have secret configured', () => {
    expect(authOptions.secret).toBeDefined()
  })
})

describe('Credentials Authorization', () => {
  const mockAuthorize = authOptions.providers.find(
    (p) => p.id === 'credentials'
  ) as any

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should throw error for missing email', async () => {
    await expect(
      mockAuthorize.authorize({ password: 'password123' })
    ).rejects.toThrow('請輸入 Email 和密碼')
  })

  it('should throw error for missing password', async () => {
    await expect(
      mockAuthorize.authorize({ email: 'test@example.com' })
    ).rejects.toThrow('請輸入 Email 和密碼')
  })

  it('should throw error for non-existent user', async () => {
    mockPrismaUserFindUnique.mockResolvedValueOnce(null)

    await expect(
      mockAuthorize.authorize({ 
        email: 'nonexistent@example.com', 
        password: 'password123' 
      })
    ).rejects.toThrow('帳號不存在或密碼錯誤')
  })

  it('should throw error for user without password', async () => {
    mockPrismaUserFindUnique.mockResolvedValueOnce({
      id: 'user_123',
      email: 'test@example.com',
      passwordHash: null, // OAuth user without password
    })

    await expect(
      mockAuthorize.authorize({ 
        email: 'test@example.com', 
        password: 'password123' 
      })
    ).rejects.toThrow('帳號不存在或密碼錯誤')
  })

  it('should throw error for invalid password', async () => {
    mockPrismaUserFindUnique.mockResolvedValueOnce({
      id: 'user_123',
      email: 'test@example.com',
      passwordHash: 'hashed_password',
    })
    mockBcryptCompare.mockResolvedValueOnce(false)

    await expect(
      mockAuthorize.authorize({ 
        email: 'test@example.com', 
        password: 'wrong_password' 
      })
    ).rejects.toThrow('密碼錯誤')
  })

  it('should return user object for valid credentials', async () => {
    const mockUser = {
      id: 'user_123',
      email: 'test@example.com',
      name: 'Test User',
      image: 'https://example.com/avatar.jpg',
      passwordHash: 'hashed_password',
      role: 'USER',
    }
    
    mockPrismaUserFindUnique.mockResolvedValueOnce(mockUser)
    mockBcryptCompare.mockResolvedValueOnce(true)

    const result = await mockAuthorize.authorize({ 
      email: 'test@example.com', 
      password: 'correct_password' 
    })

    expect(result).toEqual({
      id: 'user_123',
      email: 'test@example.com',
      name: 'Test User',
      image: 'https://example.com/avatar.jpg',
      role: 'USER',
    })
  })

  it('should include role in returned user object', async () => {
    const mockUser = {
      id: 'user_123',
      email: 'admin@example.com',
      name: 'Admin User',
      passwordHash: 'hashed_password',
      role: 'ADMIN',
    }
    
    mockPrismaUserFindUnique.mockResolvedValueOnce(mockUser)
    mockBcryptCompare.mockResolvedValueOnce(true)

    const result = await mockAuthorize.authorize({ 
      email: 'admin@example.com', 
      password: 'correct_password' 
    })

    expect(result?.role).toBe('ADMIN')
  })
})

describe('JWT Callback', () => {
  const jwtCallback = authOptions.callbacks?.jwt

  it('should add user id and role to token on sign in', async () => {
    const mockToken = { sub: 'token_123' }
    const mockUser = {
      id: 'user_123',
      email: 'test@example.com',
      role: 'USER',
    }

    const result = await jwtCallback?.({ token: mockToken, user: mockUser as any })

    expect(result?.id).toBe('user_123')
    expect(result?.role).toBe('USER')
  })

  it('should return token unchanged when no user', async () => {
    const mockToken = { sub: 'token_123', id: 'user_123', role: 'USER' }

    const result = await jwtCallback?.({ token: mockToken, user: null })

    expect(result).toEqual(mockToken)
  })
})

describe('Session Callback', () => {
  const sessionCallback = authOptions.callbacks?.session

  it('should add user id and role to session', async () => {
    const mockSession = {
      user: { email: 'test@example.com', name: 'Test User' },
    }
    const mockToken = { id: 'user_123', role: 'ADMIN' }

    const result = await sessionCallback?.({ 
      session: mockSession as any, 
      token: mockToken as any 
    })

    expect(result?.user?.id).toBe('user_123')
    expect(result?.user?.role).toBe('ADMIN')
  })

  it('should return session unchanged when no token', async () => {
    const mockSession = {
      user: { email: 'test@example.com' },
    }

    const result = await sessionCallback?.({ 
      session: mockSession as any, 
      token: null 
    })

    expect(result).toEqual(mockSession)
  })
})