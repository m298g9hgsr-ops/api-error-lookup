import { POST } from '@/app/api/analyze/route'
import { getServerSession } from 'next-auth'
import { analyzeError } from '@/services/aiAnalysis'
import { checkAndConsumeQuota, checkAnonymousRateLimit, __resetAnonymousRateLimit } from '@/lib/quota'
import { validateAndNormalizeAnalyzeRequest } from '@/lib/validators/analyze'
import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'
import { type Mock } from 'vitest'

// Mock dependencies
vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}))

vi.mock('@/services/aiAnalysis', () => ({
  analyzeError: vi.fn(),
}))

vi.mock('@/lib/quota', () => ({
  checkAndConsumeQuota: vi.fn(),
  checkAnonymousRateLimit: vi.fn(),
  quotaToHeaders: vi.fn(() => ({
    'X-RateLimit-Limit': '10',
    'X-RateLimit-Remaining': '9',
    'X-RateLimit-Reset': '0',
  })),
  getClientIdentifier: vi.fn(async () => 'ip:127.0.0.1'),
  __resetAnonymousRateLimit: vi.fn(),
}))

vi.mock('@/lib/validators/analyze', () => ({
  validateAndNormalizeAnalyzeRequest: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
    analysis: {
      create: vi.fn(),
    },
    quotaUsage: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}))

vi.mock('@/lib/auth', () => ({
  authOptions: {},
}))

describe('POST /api/analyze', () => {
  const mockSession = {
    user: {
      id: 'user_123',
      email: 'test@example.com',
      name: 'Test User',
    },
  }

  const mockAnalysisResult = {
    errorType: 'TypeError',
    analysis: 'Variable is undefined',
    suggestions: ['Initialize variable'],
    confidence: 0.9,
    tokensUsed: 150,
    model: 'codellama',
    documentation: [],
    severity: undefined,
    cwe: undefined,
    relatedConcepts: undefined,
    latencyMs: 100,
  }

  const mockQuotaResult = {
    allowed: true,
    used: 1,
    limit: 10,
    remaining: 9,
    resetAt: new Date(Date.now() + 3600000),
    isUnlimited: false,
    planTier: 'free' as const,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    ;(getServerSession as Mock).mockResolvedValue(mockSession)
    // The mock mirrors the real validator: it normalizes the incoming body
    // instead of returning a fixed payload, so per-field forwarding can be
    // asserted downstream.
    ;(validateAndNormalizeAnalyzeRequest as Mock).mockImplementation((input: any) => ({
      success: true,
      data: {
        errorMessage: input?.errorMessage ?? input?.errorInput ?? 'Test error',
        stackTrace: input?.stackTrace,
        context: input?.context,
        model: input?.model,
        promptVersion: input?.promptVersion,
        language: input?.language,
        framework: input?.framework,
        trackExperiment: input?.trackExperiment ?? true,
        testCase: input?.testCase ?? 'production',
      },
    }))
    ;(analyzeError as Mock).mockResolvedValue(mockAnalysisResult)
    ;(checkAndConsumeQuota as Mock).mockResolvedValue(mockQuotaResult)
    ;(checkAnonymousRateLimit as Mock).mockResolvedValue(mockQuotaResult)
    ;(prisma.analysis.create as Mock).mockResolvedValue({ id: 'analysis_123' })
    ;(prisma.user.findUnique as Mock).mockResolvedValue({
      id: 'user_123',
      subscriptions: [{ plan: { name: 'Free', maxRequestsPerDay: 10 } }],
    })
    ;(prisma.quotaUsage.findUnique as Mock).mockResolvedValue(null)
    ;(prisma.quotaUsage.create as Mock).mockResolvedValue({ count: 1 })
  })

  function createRequest(body: object, headers: Record<string, string> = {}) {
    return new NextRequest('http://localhost:3000/api/analyze', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    })
  }

  it('should allow anonymous access (no 401)', async () => {
    ;(getServerSession as Mock).mockResolvedValueOnce(null)

    const request = createRequest({ errorMessage: 'Test error' })
    const response = await POST(request)
    const data = await response.json()

    // Anonymous users are allowed, not 401
    expect(response.status).not.toBe(401)
    expect(data.success).toBe(true)
  })

  it('should return 400 when errorMessage is missing', async () => {
    ;(validateAndNormalizeAnalyzeRequest as Mock).mockReturnValueOnce({
      success: false,
      errors: {
        errors: [{ path: ['errorMessage'], message: 'errorMessage is required' }],
      },
    } as any)

    const request = createRequest({ stackTrace: 'at line 1' })
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
    expect(data.error).toBe('請求格式錯誤')
    expect(data.details).toContain('errorMessage is required')
  })

  it('should return 429 when rate limit exceeded for authenticated user', async () => {
    ;(checkAndConsumeQuota as Mock).mockResolvedValueOnce({
      ...mockQuotaResult,
      allowed: false,
      remaining: 0,
      used: 10,
    })

    const request = createRequest({ errorMessage: 'Test error' })
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(429)
    expect(data.success).toBe(false)
    expect(data.error).toContain('今日分析次數上限')
    expect(data.rateLimit.remaining).toBe(0)
  })

  it('should return 429 when anonymous rate limit exceeded', async () => {
    ;(getServerSession as Mock).mockResolvedValueOnce(null)
    ;(checkAnonymousRateLimit as Mock).mockResolvedValueOnce({
      ...mockQuotaResult,
      allowed: false,
      remaining: 0,
      used: 5,
      limit: 5,
    })

    const request = createRequest({ errorMessage: 'Test error' })
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(429)
    expect(data.success).toBe(false)
    expect(data.rateLimit.remaining).toBe(0)
  })

  it('should successfully analyze error and return result', async () => {
    const request = createRequest({ 
      errorMessage: 'TypeError: Cannot read property',
      stackTrace: 'at line 10',
    })
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data.errorType).toBe('TypeError')
    expect(data.data.analysis).toBe('Variable is undefined')
    expect(data.data.suggestions).toEqual(['Initialize variable'])
    expect(data.data.confidence).toBe(0.9)
    expect(data.data.tokensUsed).toBe(150)
    expect(data.data.model).toBe('codellama')
    expect(data.rateLimit).toBeDefined()
  })

  it('should save analysis to database', async () => {
    const request = createRequest({ errorMessage: 'Test error' })
    await POST(request)

    expect(prisma.analysis.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        userId: 'user_123',
        errorInput: 'Test error',
        errorType: 'TypeError',
        stackTrace: undefined,
        model: 'codellama',
        tokensUsed: 150,
      }),
    }))
  })

  it('should include rate limit info in successful response', async () => {
    const request = createRequest({ errorMessage: 'Test error' })
    const response = await POST(request)
    const data = await response.json()

    expect(data.rateLimit).toBeDefined()
    expect(data.rateLimit.limit).toBe(10)
    expect(data.rateLimit.remaining).toBe(9)
    expect(data.rateLimit.resetAt).toBeDefined()
  })

  it('should include rate limit info in 429 response', async () => {
    ;(checkAndConsumeQuota as Mock).mockResolvedValueOnce({
      ...mockQuotaResult,
      allowed: false,
      remaining: 0,
      used: 10,
    })

    const request = createRequest({ errorMessage: 'Test error' })
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(429)
    expect(data.rateLimit.remaining).toBe(0)
  })

  it('should return 502 when AI analysis fails', async () => {
    ;(analyzeError as Mock).mockRejectedValueOnce({
      code: 'AI_ANALYSIS_ERROR',
      error: 'Ollama API error',
    })

    const request = createRequest({ errorMessage: 'Test error' })
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(502)
    expect(data.success).toBe(false)
    expect(data.error).toBe('AI analysis failed')
  })

  it('should return 500 for unexpected errors', async () => {
    ;(analyzeError as Mock).mockRejectedValueOnce(new Error('Unexpected error'))

    const request = createRequest({ errorMessage: 'Test error' })
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.success).toBe(false)
    expect(data.error).toBe('Internal server error')
  })

  it('should pass stackTrace and context to analyzeError', async () => {
    const request = createRequest({ 
      errorMessage: 'Test error',
      stackTrace: 'at line 10',
      context: 'Production',
    })
    await POST(request)

    expect(analyzeError).toHaveBeenCalledWith(expect.objectContaining({
      errorMessage: 'Test error',
      stackTrace: 'at line 10',
      context: 'Production',
      model: undefined,
      trackExperiment: true,
      testCase: 'production',
    }))
  })

  it('should call checkAndConsumeQuota for authenticated user', async () => {
    const request = createRequest({ errorMessage: 'Test error' })
    await POST(request)

    expect(checkAndConsumeQuota).toHaveBeenCalledWith('user_123')
  })

  it('should call checkAnonymousRateLimit for anonymous user', async () => {
    ;(getServerSession as Mock).mockResolvedValueOnce(null)

    const request = createRequest({ errorMessage: 'Test error' })
    await POST(request)

    expect(checkAnonymousRateLimit).toHaveBeenCalled()
  })
})