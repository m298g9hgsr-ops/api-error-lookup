import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'

// Use vi.hoisted to create mocks BEFORE any imports
const { mockGetServerSession, mockPrisma, mockGetRateLimitStatus } = vi.hoisted(() => ({
  mockGetServerSession: vi.fn(),
  mockPrisma: {
    analysis: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
  },
  mockGetRateLimitStatus: vi.fn(),
}))

// Mock modules using the hoisted mocks
vi.mock('next-auth', () => ({
  getServerSession: mockGetServerSession,
}))

vi.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
}))

vi.mock('@/lib/rate-limit', () => ({
  getRateLimitStatus: mockGetRateLimitStatus,
}))

// Import routes AFTER mocks are hoisted
const { GET, POST } = await import('@/app/api/error-history/route')
const { GET: GET_ID, DELETE } = await import('@/app/api/error-history/[id]/route')

describe('Error History API', () => {
  const mockUser = {
    id: 'user_123',
    email: 'test@example.com',
    name: 'Test User',
    role: 'USER',
  }

  const mockAdminUser = {
    id: 'admin_123',
    email: 'admin@example.com',
    name: 'Admin User',
    role: 'ADMIN',
  }

  const mockAnalysis = {
    id: 'analysis_123',
    userId: 'user_123',
    errorInput: 'TypeError: Cannot read property of undefined',
    stackTrace: 'at Component.jsx:1:1',
    context: 'React component',
    model: 'deepseek-coder:6.7b',
    errorType: 'TypeError',
    analysis: 'The variable is undefined.',
    suggestions: '["Add null checks", "Use optional chaining"]',
    documentation: 'https://developer.mozilla.org/...',
    confidence: 0.95,
    tokensUsed: 180,
    createdAt: new Date('2024-01-15T10:00:00Z'),
    updatedAt: new Date('2024-01-15T10:00:00Z'),
    deletedAt: null,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockGetRateLimitStatus.mockResolvedValue({
      used: 0,
      limit: 10,
      remaining: 10,
      resetAt: new Date().toISOString(),
      isUnlimited: false,
    })
    mockGetServerSession.mockResolvedValue({ user: mockUser })
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('GET /api/error-history', () => {
    it('should return 401 when not authenticated', async () => {
      mockGetServerSession.mockResolvedValue(null)

      const request = new NextRequest(new URL('http://localhost/api/error-history'))
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return paginated history with default params', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user_123',
        subscriptions: [],
      })
      mockPrisma.analysis.count.mockResolvedValue(1)
      mockPrisma.analysis.findMany.mockResolvedValue([mockAnalysis])

      const request = new NextRequest(new URL('http://localhost/api/error-history'))
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data).toHaveLength(1)
      expect(data.pagination).toEqual({
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      })
      expect(data.rateLimit).toBeDefined()
    })

    it('should filter by search query', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user_123',
        subscriptions: [],
      })
      mockPrisma.analysis.count.mockResolvedValue(0)
      mockPrisma.analysis.findMany.mockResolvedValue([])

      const request = new NextRequest(new URL('http://localhost/api/error-history?search=TypeError'))
      await GET(request)

      expect(mockPrisma.analysis.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              expect.objectContaining({ errorInput: expect.any(Object) }),
              expect.objectContaining({ errorType: expect.any(Object) }),
            ]),
          }),
        })
      )
    })

    it('should filter by errorType', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user_123',
        subscriptions: [],
      })
      mockPrisma.analysis.count.mockResolvedValue(0)
      mockPrisma.analysis.findMany.mockResolvedValue([])

      const request = new NextRequest(new URL('http://localhost/api/error-history?errorType=ReferenceError'))
      await GET(request)

      expect(mockPrisma.analysis.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ errorType: 'ReferenceError' }),
        })
      )
    })

    it('should filter by date range', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user_123',
        subscriptions: [],
      })
      mockPrisma.analysis.count.mockResolvedValue(0)
      mockPrisma.analysis.findMany.mockResolvedValue([])

      const request = new NextRequest(new URL('http://localhost/api/error-history?dateFrom=2024-01-01&dateTo=2024-01-31'))
      await GET(request)

      expect(mockPrisma.analysis.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: expect.objectContaining({
              gte: expect.any(Date),
              lte: expect.any(Date),
            }),
          }),
        })
      )
    })

    it('should use custom pagination params', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user_123',
        subscriptions: [],
      })
      mockPrisma.analysis.count.mockResolvedValue(50)
      mockPrisma.analysis.findMany.mockResolvedValue([])

      const request = new NextRequest(new URL('http://localhost/api/error-history?page=3&limit=10'))
      const response = await GET(request)
      const data = await response.json()

      expect(data.pagination).toEqual({
        total: 50,
        page: 3,
        limit: 10,
        totalPages: 5,
      })
      expect(mockPrisma.analysis.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 10,
          skip: 20,
        })
      )
    })

    it('should sort by createdAt desc by default', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user_123',
        subscriptions: [],
      })
      mockPrisma.analysis.count.mockResolvedValue(0)
      mockPrisma.analysis.findMany.mockResolvedValue([])

      const request = new NextRequest(new URL('http://localhost/api/error-history'))
      await GET(request)

      expect(mockPrisma.analysis.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { createdAt: 'desc' },
        })
      )
    })

    it('should exclude soft-deleted records', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user_123',
        subscriptions: [],
      })
      mockPrisma.analysis.count.mockResolvedValue(0)
      mockPrisma.analysis.findMany.mockResolvedValue([])

      const request = new NextRequest(new URL('http://localhost/api/error-history'))
      await GET(request)

      expect(mockPrisma.analysis.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ deletedAt: null }),
        })
      )
    })

    it('should respect history limit from plan', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user_123',
        subscriptions: [{
          plan: { features: JSON.stringify({ errorHistory: 30 }) }
        }],
      })
      mockPrisma.analysis.count.mockResolvedValue(0)
      mockPrisma.analysis.findMany.mockResolvedValue([])

      const request = new NextRequest(new URL('http://localhost/api/error-history'))
      const response = await GET(request)
      const data = await response.json()

      expect(data.historyLimitDays).toBe(30)
    })

    it('should work same as GET with body params', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user_123',
        subscriptions: [],
      })
      mockPrisma.analysis.count.mockResolvedValue(0)
      mockPrisma.analysis.findMany.mockResolvedValue([])

      const request = new NextRequest(new URL('http://localhost/api/error-history'), {
        method: 'POST',
        body: JSON.stringify({ page: 2, limit: 5 }),
        headers: { 'Content-Type': 'application/json' },
      })
      const response = await POST(request)
      const data = await response.json()

      expect(data.pagination.page).toBe(2)
      expect(data.pagination.limit).toBe(5)
    })
  })

  describe('GET /api/error-history/[id]', () => {
    it('should return 401 when not authenticated', async () => {
      mockGetServerSession.mockResolvedValue(null)

      const request = new NextRequest(new URL('http://localhost/api/error-history/analysis_123'))
      const response = await GET_ID(request, { params: Promise.resolve({ id: 'analysis_123' }) })
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return 404 when analysis not found', async () => {
      mockPrisma.analysis.findUnique.mockResolvedValue(null)

      const request = new NextRequest(new URL('http://localhost/api/error-history/analysis_123'))
      const response = await GET_ID(request, { params: Promise.resolve({ id: 'analysis_123' }) })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Analysis not found')
    })

    it('should return 403 when not owner and not admin', async () => {
      mockPrisma.analysis.findUnique.mockResolvedValue({
        ...mockAnalysis,
        userId: 'other_user',
      })

      const request = new NextRequest(new URL('http://localhost/api/error-history/analysis_123'))
      const response = await GET_ID(request, { params: Promise.resolve({ id: 'analysis_123' }) })
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Forbidden')
    })

    it('should return analysis detail for owner', async () => {
      mockPrisma.analysis.findUnique.mockResolvedValue(mockAnalysis)

      const request = new NextRequest(new URL('http://localhost/api/error-history/analysis_123'))
      const response = await GET_ID(request, { params: Promise.resolve({ id: 'analysis_123' }) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.id).toBe('analysis_123')
      expect(data.data.errorInput).toBe(mockAnalysis.errorInput)
      expect(data.data.createdAt).toBe(mockAnalysis.createdAt.toISOString())
      expect(data.data.updatedAt).toBe(mockAnalysis.updatedAt.toISOString())
      expect(data.data.deletedAt).toBeNull()
    })

    it('should allow admin to view any analysis', async () => {
      mockGetServerSession.mockResolvedValue({ user: mockAdminUser })
      mockPrisma.analysis.findUnique.mockResolvedValue({
        ...mockAnalysis,
        userId: 'other_user',
      })

      const request = new NextRequest(new URL('http://localhost/api/error-history/analysis_123'))
      const response = await GET_ID(request, { params: Promise.resolve({ id: 'analysis_123' }) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it('should return 404 for soft-deleted analysis for non-admin', async () => {
      mockPrisma.analysis.findUnique.mockResolvedValue({
        ...mockAnalysis,
        deletedAt: new Date(),
      })

      const request = new NextRequest(new URL('http://localhost/api/error-history/analysis_123'))
      const response = await GET_ID(request, { params: Promise.resolve({ id: 'analysis_123' }) })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Analysis not found')
    })

    it('should allow admin to view soft-deleted analysis', async () => {
      mockGetServerSession.mockResolvedValue({ user: mockAdminUser })
      mockPrisma.analysis.findUnique.mockResolvedValue({
        ...mockAnalysis,
        deletedAt: new Date(),
      })

      const request = new NextRequest(new URL('http://localhost/api/error-history/analysis_123'))
      const response = await GET_ID(request, { params: Promise.resolve({ id: 'analysis_123' }) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.deletedAt).not.toBeNull()
    })
  })

  describe('DELETE /api/error-history/[id]', () => {
    it('should return 401 when not authenticated', async () => {
      mockGetServerSession.mockResolvedValue(null)

      const request = new NextRequest(new URL('http://localhost/api/error-history/analysis_123'))
      const response = await DELETE(request, { params: Promise.resolve({ id: 'analysis_123' }) })
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return 404 when analysis not found', async () => {
      mockPrisma.analysis.findUnique.mockResolvedValue(null)

      const request = new NextRequest(new URL('http://localhost/api/error-history/analysis_123'))
      const response = await DELETE(request, { params: Promise.resolve({ id: 'analysis_123' }) })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Analysis not found')
    })

    it('should return 403 when not owner and not admin', async () => {
      mockPrisma.analysis.findUnique.mockResolvedValue({
        ...mockAnalysis,
        userId: 'other_user',
      })

      const request = new NextRequest(new URL('http://localhost/api/error-history/analysis_123'))
      const response = await DELETE(request, { params: Promise.resolve({ id: 'analysis_123' }) })
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Forbidden')
    })

    it('should soft delete for regular user', async () => {
      mockPrisma.analysis.findUnique.mockResolvedValue(mockAnalysis)
      mockPrisma.analysis.update.mockResolvedValue({ ...mockAnalysis, deletedAt: new Date() })

      const request = new NextRequest(new URL('http://localhost/api/error-history/analysis_123'))
      const response = await DELETE(request, { params: Promise.resolve({ id: 'analysis_123' }) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(mockPrisma.analysis.update).toHaveBeenCalledWith({
        where: { id: 'analysis_123' },
        data: { deletedAt: expect.any(Date) },
      })
    })

    it('should hard delete for admin', async () => {
      mockGetServerSession.mockResolvedValue({ user: mockAdminUser })
      mockPrisma.analysis.findUnique.mockResolvedValue(mockAnalysis)
      mockPrisma.analysis.delete.mockResolvedValue(mockAnalysis)

      const request = new NextRequest(new URL('http://localhost/api/error-history/analysis_123'))
      const response = await DELETE(request, { params: Promise.resolve({ id: 'analysis_123' }) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(mockPrisma.analysis.delete).toHaveBeenCalledWith({
        where: { id: 'analysis_123' },
      })
    })

    it('should return 400 when already deleted', async () => {
      mockPrisma.analysis.findUnique.mockResolvedValue({
        ...mockAnalysis,
        deletedAt: new Date(),
      })

      const request = new NextRequest(new URL('http://localhost/api/error-history/analysis_123'))
      const response = await DELETE(request, { params: Promise.resolve({ id: 'analysis_123' }) })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Analysis already deleted')
    })
  })
})