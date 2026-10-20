import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

// Mock dependencies
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

jest.mock('bcryptjs', () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}))

jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
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
    expect(authOptions.pages?.signIn).toBe('/login')
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
    jest.clearAllMocks()
  })

  it('should throw error for missing email', async () => {
    await expect(
      mockAuthorize.authorize({ password: 'password123' })
    ).rejects.toThrow('Invalid credentials')
  })

  it('should throw error for missing password', async () => {
    await expect(
      mockAuthorize.authorize({ email: 'test@example.com' })
    ).rejects.toThrow('Invalid credentials')
  })

  it('should throw error for non-existent user', async () => {
    ;(prisma.user.findUnique as jest.Mock).mockResolvedValueOnce(null)

    await expect(
      mockAuthorize.authorize({ 
        email: 'nonexistent@example.com', 
        password: 'password123' 
      })
    ).rejects.toThrow('Invalid credentials')
  })

  it('should throw error for user without password', async () => {
    ;(prisma.user.findUnique as jest.Mock).mockResolvedValueOnce({
      id: 'user_123',
      email: 'test@example.com',
      passwordHash: null, // OAuth user without password
    })

    await expect(
      mockAuthorize.authorize({ 
        email: 'test@example.com', 
        password: 'password123' 
      })
    ).rejects.toThrow('Invalid credentials')
  })

  it('should throw error for invalid password', async () => {
    ;(prisma.user.findUnique as jest.Mock).mockResolvedValueOnce({
      id: 'user_123',
      email: 'test@example.com',
      passwordHash: 'hashed_password',
    })
    ;(bcrypt.compare as jest.Mock).mockResolvedValueOnce(false)

    await expect(
      mockAuthorize.authorize({ 
        email: 'test@example.com', 
        password: 'wrong_password' 
      })
    ).rejects.toThrow('Invalid credentials')
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
    
    ;(prisma.user.findUnique as jest.Mock).mockResolvedValueOnce(mockUser)
    ;(bcrypt.compare as jest.Mock).mockResolvedValueOnce(true)

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
    
    ;(prisma.user.findUnique as jest.Mock).mockResolvedValueOnce(mockUser)
    ;(bcrypt.compare as jest.Mock).mockResolvedValueOnce(true)

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