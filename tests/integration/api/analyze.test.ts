import { POST } from '@/app/api/analyze/route'
import { getServerSession } from 'next-auth'
import { analyzeError, validateAnalysisRequest } from '@/services/aiAnalysis'
import { checkRateLimit, getRateLimitHeaders } from '@/services/rateLimiter'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

// Mock dependencies
jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}))

jest.mock('@/services/aiAnalysis', () => ({
  analyzeError: jest.fn(),
  validateAnalysisRequest: jest.fn(),
}))

jest.mock('@/services/rateLimiter', () => ({
  checkRateLimit: jest.fn(),
  getRateLimitHeaders: jest.fn(),
}))

jest.mock('@/lib/prisma', () => ({
  prisma: {
    analysis: {
      create: jest.fn(),
    },
  },
}))

jest.mock('@/lib/auth', () => ({
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
  }

  const mockRateLimitResult = {
    success: true,
    remaining: 9,
    resetTime: Date.now() + 3600000,
    totalRequests: 1,
  }

  const mockHeaders = {
    'X-RateLimit-Limit': '10',
    'X-RateLimit-Remaining': '9',
    'X-RateLimit-Reset': '1234567890',
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(getServerSession as jest.Mock).mockResolvedValue(mockSession)
    ;(validateAnalysisRequest as jest.Mock).mockReturnValue(true)
    ;(analyzeError as jest.Mock).mockResolvedValue(mockAnalysisResult)
    ;(checkRateLimit as jest.Mock).mockResolvedValue(mockRateLimitResult)
    ;(getRateLimitHeaders as jest.Mock).mockReturnValue(mockHeaders)
    ;(prisma.analysis.create as jest.Mock).mockResolvedValue({ id: 'analysis_123' })
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

  it('should return 401 when not authenticated', async () => {
    ;(getServerSession as jest.Mock).mockResolvedValueOnce(null)

    const request = createRequest({ errorMessage: 'Test error' })
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('Unauthorized')
  })

  it('should return 400 when errorMessage is missing', async () => {
    ;(validateAnalysisRequest as jest.Mock).mockReturnValueOnce(false)

    const request = createRequest({ stackTrace: 'at line 1' })
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toContain('errorMessage is required')
  })

  it('should return 429 when rate limit exceeded', async () => {
    ;(checkRateLimit as jest.Mock).mockResolvedValueOnce({
      success: false,
      remaining: 0,
      resetTime: Date.now() + 3600000,
      totalRequests: 11,
    })
    ;(getRateLimitHeaders as jest.Mock).mockReturnValueOnce({
      'X-RateLimit-Limit': '10',
      'X-RateLimit-Remaining': '0',
      'X-RateLimit-Reset': '1234567890',
    })

    const request = createRequest({ errorMessage: 'Test error' })
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(429)
    expect(data.error).toContain('Rate limit exceeded')
    expect(response.headers.get('X-RateLimit-Remaining')).toBe('0')
  })

  it('should successfully analyze error and return result', async () => {
    const request = createRequest({ 
      errorMessage: 'TypeError: Cannot read property',
      stackTrace: 'at line 10',
    })
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.errorType).toBe('TypeError')
    expect(data.analysis).toBe('Variable is undefined')
    expect(data.suggestions).toEqual(['Initialize variable'])
    expect(data.confidence).toBe(0.9)
    expect(data.tokensUsed).toBe(150)
    expect(data.model).toBe('codellama')
  })

  it('should save analysis to database', async () => {
    const request = createRequest({ errorMessage: 'Test error' })
    await POST(request)

    expect(prisma.analysis.create).toHaveBeenCalledWith({
      data: {
        userId: 'user_123',
        errorMessage: 'Test error',
        errorType: 'TypeError',
        stackTrace: undefined,
        aiResponse: 'Variable is undefined',
        model: 'codellama',
        tokensUsed: 150,
      },
    })
  })

  it('should include rate limit headers in successful response', async () => {
    const request = createRequest({ errorMessage: 'Test error' })
    const response = await POST(request)

    expect(response.headers.get('X-RateLimit-Limit')).toBe('10')
    expect(response.headers.get('X-RateLimit-Remaining')).toBe('9')
    expect(response.headers.get('X-RateLimit-Reset')).toBe('1234567890')
  })

  it('should include rate limit headers in 429 response', async () => {
    ;(checkRateLimit as jest.Mock).mockResolvedValueOnce({
      success: false,
      remaining: 0,
      resetTime: Date.now() + 3600000,
      totalRequests: 11,
    })
    ;(getRateLimitHeaders as jest.Mock).mockReturnValueOnce({
      'X-RateLimit-Limit': '10',
      'X-RateLimit-Remaining': '0',
      'X-RateLimit-Reset': '1234567890',
    })

    const request = createRequest({ errorMessage: 'Test error' })
    const response = await POST(request)

    expect(response.headers.get('X-RateLimit-Remaining')).toBe('0')
  })

  it('should return 500 when AI analysis fails', async () => {
    ;(analyzeError as jest.Mock).mockRejectedValueOnce({
      code: 'AI_ANALYSIS_ERROR',
      error: 'Ollama API error',
    })

    const request = createRequest({ errorMessage: 'Test error' })
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toContain('AI analysis failed')
  })

  it('should return 500 for unexpected errors', async () => {
    ;(analyzeError as jest.Mock).mockRejectedValueOnce(new Error('Unexpected error'))

    const request = createRequest({ errorMessage: 'Test error' })
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Internal server error')
  })

  it('should pass stackTrace and context to analyzeError', async () => {
    const request = createRequest({ 
      errorMessage: 'Test error',
      stackTrace: 'at line 10',
      context: 'Production',
    })
    await POST(request)

    expect(analyzeError).toHaveBeenCalledWith({
      errorMessage: 'Test error',
      stackTrace: 'at line 10',
      context: 'Production',
      model: undefined,
    })
  })

  it('should call checkRateLimit with correct user identifier', async () => {
    const request = createRequest({ errorMessage: 'Test error' })
    await POST(request)

    expect(checkRateLimit).toHaveBeenCalledWith('user:user_123', undefined)
  })
})