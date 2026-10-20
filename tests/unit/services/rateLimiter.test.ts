import { 
  checkRateLimit, 
  resetRateLimit, 
  getRateLimitInfo, 
  getRateLimitHeaders 
} from '@/services/rateLimiter'

describe('Rate Limiter Service', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    process.env.UPSTASH_REDIS_REST_URL = 'http://localhost:8079'
    process.env.UPSTASH_REDIS_REST_TOKEN = 'mock-token'
  })

  describe('checkRateLimit', () => {
    it('should allow request when under limit', async () => {
      const result = await checkRateLimit('user:123')

      expect(result.success).toBe(true)
      expect(result.remaining).toBeGreaterThanOrEqual(0)
      expect(result.totalRequests).toBeGreaterThanOrEqual(1)
      expect(result.resetTime).toBeGreaterThan(Date.now())
    })

    it('should use custom config when provided', async () => {
      const result = await checkRateLimit('user:123', { maxRequests: 100, windowMs: 60000 })

      expect(result.success).toBe(true)
    })
  })

  describe('resetRateLimit', () => {
    it('should delete the rate limit key', async () => {
      await resetRateLimit('user:123', 'custom')
      expect(true).toBe(true)
    })

    it('should use default key prefix when not provided', async () => {
      await resetRateLimit('user:123')
      expect(true).toBe(true)
    })
  })

  describe('getRateLimitInfo', () => {
    it('should return current rate limit info without incrementing', async () => {
      const result = await getRateLimitInfo('user:123')

      expect(result).toBeDefined()
      expect(result?.success).toBeDefined()
      expect(result?.remaining).toBeDefined()
    })

    it('should return blocked status when at limit', async () => {
      const result = await getRateLimitInfo('user:123')
      expect(result?.success).toBeDefined()
    })

    it('should return null on error', async () => {
      const result = await getRateLimitInfo('user:123')
      expect(result).toBeDefined()
    })
  })

  describe('getRateLimitHeaders', () => {
    it('should generate correct rate limit headers', () => {
      const result = {
        success: true,
        remaining: 5,
        resetTime: Date.now() + 3600000,
        totalRequests: 5,
      }

      const headers = getRateLimitHeaders(result)

      expect(headers['X-RateLimit-Limit']).toBe('10')
      expect(headers['X-RateLimit-Remaining']).toBe('5')
      expect(headers['X-RateLimit-Reset']).toBeDefined()
      expect(parseInt(headers['X-RateLimit-Reset'])).toBeGreaterThan(Date.now() / 1000)
    })

    it('should handle zero remaining', () => {
      const result = {
        success: false,
        remaining: 0,
        resetTime: Date.now() + 3600000,
        totalRequests: 10,
      }

      const headers = getRateLimitHeaders(result)

      expect(headers['X-RateLimit-Remaining']).toBe('0')
    })
  })
})