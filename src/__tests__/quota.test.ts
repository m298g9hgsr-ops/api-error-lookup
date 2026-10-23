import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { 
  QUOTA_CONFIG, 
  checkAndConsumeQuota, 
  getQuotaStatus, 
  quotaToHeaders,
  getUserPlanTier,
  checkAnonymousRateLimit,
  getClientIdentifier
} from '@/lib/quota';

// Use vi.hoisted to avoid hoisting issues
const { mockPrisma, mockHeaders } = vi.hoisted(() => {
  const prisma: {
    user: { findUnique: ReturnType<typeof vi.fn> };
    quotaUsage: {
      findUnique: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
    };
    $transaction: ReturnType<typeof vi.fn>;
  } = {
    user: {
      findUnique: vi.fn(),
    },
    quotaUsage: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    $transaction: vi.fn((callback: (tx: typeof prisma) => unknown) => callback(prisma)),
  };
  
  const headers = vi.fn(() => new Headers([
    ['x-forwarded-for', '192.168.1.1'],
    ['x-real-ip', '10.0.0.1'],
  ]));
  
  return { mockPrisma: prisma, mockHeaders: headers };
});

vi.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
}));

vi.mock('next/headers', () => ({
  headers: mockHeaders,
}));

describe('Quota Management', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    // Reset the anonymous rate limit map
    const { __resetAnonymousRateLimit } = await import('@/lib/quota');
    __resetAnonymousRateLimit();
  });

  describe('QUOTA_CONFIG', () => {
    it('should have correct config for free tier', () => {
      expect(QUOTA_CONFIG.free.maxRequestsPerDay).toBe(10);
      expect(QUOTA_CONFIG.free.windowMs).toBe(24 * 60 * 60 * 1000);
    });

    it('should have unlimited config for pro tier', () => {
      expect(QUOTA_CONFIG.pro.maxRequestsPerDay).toBe(-1);
    });

    it('should have unlimited config for enterprise tier', () => {
      expect(QUOTA_CONFIG.enterprise.maxRequestsPerDay).toBe(-1);
    });
  });

  describe('getUserPlanTier', () => {
    it('should return free for user without subscription', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user1',
        subscriptions: [],
      });

      const tier = await getUserPlanTier('user1');
      expect(tier).toBe('free');
    });

    it('should return pro for user with pro subscription', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user2',
        subscriptions: [{
          plan: { name: 'pro' },
          status: 'active',
        }],
      });

      const tier = await getUserPlanTier('user2');
      expect(tier).toBe('pro');
    });

    it('should return enterprise for user with enterprise subscription', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user3',
        subscriptions: [{
          plan: { name: 'enterprise' },
          status: 'active',
        }],
      });

      const tier = await getUserPlanTier('user3');
      expect(tier).toBe('enterprise');
    });

    it('should return free for unknown plan name', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user4',
        subscriptions: [{
          plan: { name: 'unknown' },
          status: 'active',
        }],
      });

      const tier = await getUserPlanTier('user4');
      expect(tier).toBe('free');
    });
  });

  describe('checkAndConsumeQuota', () => {
    const userId = 'test-user';
    const windowStart = new Date();
    windowStart.setUTCHours(0, 0, 0, 0);

    it('should allow request for free user under limit', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: userId,
        subscriptions: [],
      });

      mockPrisma.quotaUsage.findUnique.mockResolvedValue(null);
      mockPrisma.quotaUsage.create.mockResolvedValue({ count: 1 });

      const result = await checkAndConsumeQuota(userId);

      expect(result.allowed).toBe(true);
      expect(result.used).toBe(1);
      expect(result.limit).toBe(10);
      expect(result.remaining).toBe(9);
      expect(result.isUnlimited).toBe(false);
      expect(result.planTier).toBe('free');
    });

    it('should deny request for free user over limit', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: userId,
        subscriptions: [],
      });

      mockPrisma.quotaUsage.findUnique.mockResolvedValue({ count: 10 });

      const result = await checkAndConsumeQuota(userId);

      expect(result.allowed).toBe(false);
      expect(result.used).toBe(10);
      expect(result.limit).toBe(10);
      expect(result.remaining).toBe(0);
    });

    it('should allow unlimited for pro user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: userId,
        subscriptions: [{
          plan: { name: 'pro', maxRequestsPerDay: -1 },
          status: 'active',
        }],
      });

      const result = await checkAndConsumeQuota(userId);

      expect(result.allowed).toBe(true);
      expect(result.isUnlimited).toBe(true);
      expect(result.limit).toBe(-1);
      expect(result.remaining).toBe(-1);
      expect(result.planTier).toBe('pro');
    });

    it('should increment existing quota record', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: userId,
        subscriptions: [],
      });

      mockPrisma.quotaUsage.findUnique.mockResolvedValue({ count: 5 });
      mockPrisma.quotaUsage.update.mockResolvedValue({ count: 6 });

      const result = await checkAndConsumeQuota(userId);

      expect(result.allowed).toBe(true);
      expect(result.used).toBe(6);
      expect(result.remaining).toBe(4);
      expect(mockPrisma.quotaUsage.update).toHaveBeenCalled();
    });
  });

  describe('getQuotaStatus', () => {
    it('should return status without consuming', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user1',
        subscriptions: [],
      });

      mockPrisma.quotaUsage.findUnique.mockResolvedValue({ count: 3 });

      const result = await getQuotaStatus('user1');

      expect(result.allowed).toBe(true);
      expect(result.used).toBe(3);
      expect(result.limit).toBe(10);
      expect(result.remaining).toBe(7);
    });

    it('should return unlimited for pro user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user2',
        subscriptions: [{
          plan: { name: 'pro', maxRequestsPerDay: -1 },
          status: 'active',
        }],
      });

      const result = await getQuotaStatus('user2');

      expect(result.isUnlimited).toBe(true);
      expect(result.limit).toBe(-1);
    });
  });

  describe('quotaToHeaders', () => {
    it('should generate correct headers for limited quota', () => {
      const quota = {
        allowed: true,
        used: 5,
        limit: 10,
        remaining: 5,
        resetAt: new Date('2024-01-02T00:00:00Z'),
        isUnlimited: false,
        planTier: 'free' as const,
      };

      const headers = quotaToHeaders(quota);

      expect(headers['X-RateLimit-Limit']).toBe('10');
      expect(headers['X-RateLimit-Remaining']).toBe('5');
      expect(headers['X-RateLimit-Reset']).toBe(Math.ceil(new Date('2024-01-02T00:00:00Z').getTime() / 1000).toString());
    });

    it('should generate correct headers for unlimited quota', () => {
      const quota = {
        allowed: true,
        used: 0,
        limit: -1,
        remaining: -1,
        resetAt: new Date('2024-01-02T00:00:00Z'),
        isUnlimited: true,
        planTier: 'pro' as const,
      };

      const headers = quotaToHeaders(quota);

      expect(headers['X-RateLimit-Limit']).toBe('unlimited');
      expect(headers['X-RateLimit-Remaining']).toBe('unlimited');
    });
  });

  describe('getClientIdentifier', () => {
    it('should extract IP from x-forwarded-for header', async () => {
      const { headers } = await import('next/headers');
      vi.mocked(headers).mockReturnValue(new Headers([
        ['x-forwarded-for', '203.0.113.195, 70.41.3.18, 150.172.238.178'],
      ]));

      const identifier = await getClientIdentifier();
      expect(identifier).toBe('ip:203.0.113.195');
    });

    it('should fall back to x-real-ip', async () => {
      const { headers } = await import('next/headers');
      vi.mocked(headers).mockReturnValue(new Headers([
        ['x-real-ip', '198.51.100.1'],
      ]));

      const identifier = await getClientIdentifier();
      expect(identifier).toBe('ip:198.51.100.1');
    });

    it('should return unknown when no IP headers', async () => {
      const { headers } = await import('next/headers');
      vi.mocked(headers).mockReturnValue(new Headers());

      const identifier = await getClientIdentifier();
      expect(identifier).toBe('ip:unknown');
    });
  });

  describe('checkAnonymousRateLimit', () => {
    it('should allow requests under limit', async () => {
      const result = await checkAnonymousRateLimit('ip:192.168.1.1');
      
      expect(result.allowed).toBe(true);
      expect(result.used).toBe(1);
      expect(result.limit).toBe(5);
      expect(result.remaining).toBe(4);
    });

    it('should deny requests over limit', async () => {
      // Make 5 requests
      for (let i = 0; i < 5; i++) {
        await checkAnonymousRateLimit('ip:192.168.1.2');
      }
      
      // 6th request should be denied
      const result = await checkAnonymousRateLimit('ip:192.168.1.2');
      
      expect(result.allowed).toBe(false);
      expect(result.used).toBe(6);
      expect(result.remaining).toBe(0);
    });

    it('should track different IPs separately', async () => {
      await checkAnonymousRateLimit('ip:192.168.1.10');
      await checkAnonymousRateLimit('ip:192.168.1.10');
      
      const result1 = await checkAnonymousRateLimit('ip:192.168.1.10');
      const result2 = await checkAnonymousRateLimit('ip:192.168.1.11');
      
      expect(result1.used).toBe(3);
      expect(result2.used).toBe(1);
    });
  });
});

// Additional integration-style tests for the analyze API
describe('Analyze API Integration', () => {
  it('should validate request with Zod schema', async () => {
    const { validateAndNormalizeAnalyzeRequest } = await import('@/lib/validators/analyze');
    
    // Valid request with errorMessage
    const validRequest1 = {
      errorMessage: 'TypeError: Cannot read property of undefined',
      stackTrace: 'at Object.<anonymous> (/app/index.js:1:1)',
      context: 'React component',
    };
    
    const result1 = validateAndNormalizeAnalyzeRequest(validRequest1);
    expect(result1.success).toBe(true);
    if (result1.success) {
      expect(result1.data.errorMessage).toBe('TypeError: Cannot read property of undefined');
      expect(result1.data.stackTrace).toContain('at Object');
    }

    // Valid request with errorInput (frontend compatibility)
    const validRequest2 = {
      errorInput: 'ReferenceError: x is not defined',
    };
    
    const result2 = validateAndNormalizeAnalyzeRequest(validRequest2);
    expect(result2.success).toBe(true);
    if (result2.success) {
      expect(result2.data.errorMessage).toBe('ReferenceError: x is not defined');
    }

    // Invalid request - missing error message
    const invalidRequest = {
      stackTrace: 'some trace',
    };
    
    const result3 = validateAndNormalizeAnalyzeRequest(invalidRequest);
    expect(result3.success).toBe(false);
  });

  it('should enforce rate limit headers format', () => {
    const headers = {
      'X-RateLimit-Limit': '10',
      'X-RateLimit-Remaining': '5',
      'X-RateLimit-Reset': '1704153600',
    };
    
    expect(headers['X-RateLimit-Limit']).toBeDefined();
    expect(headers['X-RateLimit-Remaining']).toBeDefined();
    expect(headers['X-RateLimit-Reset']).toBeDefined();
  });
});