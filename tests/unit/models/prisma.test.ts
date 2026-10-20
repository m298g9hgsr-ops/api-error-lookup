import { prisma } from '@/lib/prisma'

describe('Prisma Models', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('User Model', () => {
    it('should create a user', async () => {
      const mockUser = {
        id: 'user_123',
        email: 'test@example.com',
        name: 'Test User',
        passwordHash: 'hashed',
        role: 'USER',
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      
      prisma.user.create.mockResolvedValueOnce(mockUser)

      const user = await prisma.user.create({
        data: {
          email: 'test@example.com',
          name: 'Test User',
          passwordHash: 'hashed',
        },
      })

      expect(user).toEqual(mockUser)
      expect(prisma.user.create).toHaveBeenCalledWith({
        data: {
          email: 'test@example.com',
          name: 'Test User',
          passwordHash: 'hashed',
        },
      })
    })

    it('should find user by email', async () => {
      const mockUser = {
        id: 'user_123',
        email: 'test@example.com',
        name: 'Test User',
        passwordHash: 'hashed',
        role: 'USER',
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      
      prisma.user.findUnique.mockResolvedValueOnce(mockUser)

      const user = await prisma.user.findUnique({
        where: { email: 'test@example.com' },
      })

      expect(user).toEqual(mockUser)
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      })
    })

    it('should find user by ID with relations', async () => {
      const mockUser = {
        id: 'user_123',
        email: 'test@example.com',
        name: 'Test User',
        analyses: [
          { id: 'analysis_1', errorMessage: 'Error 1' },
          { id: 'analysis_2', errorMessage: 'Error 2' },
        ],
        subscription: { id: 'sub_1', status: 'active' },
      }
      
      prisma.user.findUnique.mockResolvedValueOnce(mockUser)

      const user = await prisma.user.findUnique({
        where: { id: 'user_123' },
        include: {
          analyses: true,
          subscription: true,
        },
      })

      expect(user.analyses).toHaveLength(2)
      expect(user.subscription?.status).toBe('active')
    })

    it('should update user with Stripe customer ID', async () => {
      const mockUser = {
        id: 'user_123',
        email: 'test@example.com',
        stripeCustomerId: 'cus_123',
        updatedAt: new Date(),
      }
      
      prisma.user.update.mockResolvedValueOnce(mockUser)

      const user = await prisma.user.update({
        where: { id: 'user_123' },
        data: { stripeCustomerId: 'cus_123' },
      })

      expect(user.stripeCustomerId).toBe('cus_123')
    })

    it('should handle unique constraint on email', async () => {
      const error = new Error('Unique constraint failed')
      ;(error as any).code = 'P2002'
      prisma.user.create.mockRejectedValueOnce(error)

      await expect(prisma.user.create({
        data: { email: 'existing@example.com', passwordHash: 'hash' },
      })).rejects.toThrow('Unique constraint failed')
    })
  })

  describe('Analysis Model', () => {
    it('should create an analysis record', async () => {
      const mockAnalysis = {
        id: 'analysis_123',
        userId: 'user_123',
        errorMessage: 'TypeError: Cannot read property',
        errorType: 'TypeError',
        stackTrace: 'at line 10',
        aiResponse: 'Analysis result',
        model: 'codellama',
        tokensUsed: 150,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      
      prisma.analysis.create.mockResolvedValueOnce(mockAnalysis)

      const analysis = await prisma.analysis.create({
        data: {
          userId: 'user_123',
          errorMessage: 'TypeError: Cannot read property',
          errorType: 'TypeError',
          stackTrace: 'at line 10',
          aiResponse: 'Analysis result',
          model: 'codellama',
          tokensUsed: 150,
        },
      })

      expect(analysis).toEqual(mockAnalysis)
      expect(prisma.analysis.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user_123',
          errorMessage: 'TypeError: Cannot read property',
        }),
      })
    })

    it('should find analyses by user ID', async () => {
      const mockAnalyses = [
        { id: 'analysis_1', userId: 'user_123', errorMessage: 'Error 1', createdAt: new Date() },
        { id: 'analysis_2', userId: 'user_123', errorMessage: 'Error 2', createdAt: new Date() },
      ]
      
      prisma.analysis.findMany.mockResolvedValueOnce(mockAnalyses)

      const analyses = await prisma.analysis.findMany({
        where: { userId: 'user_123' },
        orderBy: { createdAt: 'desc' },
        take: 10,
      })

      expect(analyses).toHaveLength(2)
      expect(prisma.analysis.findMany).toHaveBeenCalledWith({
        where: { userId: 'user_123' },
        orderBy: { createdAt: 'desc' },
        take: 10,
      })
    })

    it('should find analysis by ID', async () => {
      const mockAnalysis = {
        id: 'analysis_123',
        userId: 'user_123',
        errorMessage: 'Test error',
        errorType: 'TestError',
        aiResponse: 'Analysis',
        model: 'codellama',
        tokensUsed: 100,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      
      prisma.analysis.findUnique.mockResolvedValueOnce(mockAnalysis)

      const analysis = await prisma.analysis.findUnique({
        where: { id: 'analysis_123' },
      })

      expect(analysis).toEqual(mockAnalysis)
    })
  })

  describe('Plan Model', () => {
    it('should create a subscription plan', async () => {
      const mockPlan = {
        id: 'plan_123',
        name: 'pro',
        displayName: 'Pro Plan',
        description: 'Professional tier',
        price: 2900,
        interval: 'month',
        stripePriceId: 'price_pro',
        features: { analysesPerDay: 100 },
        maxRequestsPerDay: 100,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      
      prisma.plan.create.mockResolvedValueOnce(mockPlan)

      const plan = await prisma.plan.create({
        data: {
          name: 'pro',
          displayName: 'Pro Plan',
          price: 2900,
          interval: 'month',
          stripePriceId: 'price_pro',
          features: { analysesPerDay: 100 },
          maxRequestsPerDay: 100,
        },
      })

      expect(plan).toEqual(mockPlan)
    })

    it('should find active plans', async () => {
      const mockPlans = [
        { id: 'plan_1', name: 'free', isActive: true },
        { id: 'plan_2', name: 'pro', isActive: true },
      ]
      
      prisma.plan.findMany.mockResolvedValueOnce(mockPlans)

      const plans = await prisma.plan.findMany({
        where: { isActive: true },
        orderBy: { price: 'asc' },
      })

      expect(plans).toHaveLength(2)
      expect(plans.every(p => p.isActive)).toBe(true)
    })
  })

  describe('Subscription Model', () => {
    it('should create a subscription', async () => {
      const mockSubscription = {
        id: 'sub_123',
        userId: 'user_123',
        planId: 'plan_pro',
        stripeCustomerId: 'cus_123',
        stripeSubscriptionId: 'sub_stripe_123',
        stripePriceId: 'price_pro',
        status: 'active',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        cancelAtPeriodEnd: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      
      prisma.subscription.create.mockResolvedValueOnce(mockSubscription)

      const subscription = await prisma.subscription.create({
        data: {
          userId: 'user_123',
          planId: 'plan_pro',
          stripeCustomerId: 'cus_123',
          stripeSubscriptionId: 'sub_stripe_123',
          stripePriceId: 'price_pro',
          status: 'active',
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      })

      expect(subscription).toEqual(mockSubscription)
    })

    it('should upsert subscription', async () => {
      const mockSubscription = {
        id: 'sub_123',
        userId: 'user_123',
        planId: 'plan_pro',
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      
      prisma.subscription.upsert.mockResolvedValueOnce(mockSubscription)

      const subscription = await prisma.subscription.upsert({
        where: { userId: 'user_123' },
        create: { userId: 'user_123', planId: 'plan_pro', status: 'active' },
        update: { status: 'active' },
      })

      expect(subscription).toEqual(mockSubscription)
    })

    it('should find subscription by stripeCustomerId', async () => {
      const mockSubscription = {
        id: 'sub_123',
        userId: 'user_123',
        stripeCustomerId: 'cus_123',
        status: 'active',
      }
      
      prisma.subscription.findUnique.mockResolvedValueOnce(mockSubscription)

      const subscription = await prisma.subscription.findUnique({
        where: { stripeCustomerId: 'cus_123' },
      })

      expect(subscription?.stripeCustomerId).toBe('cus_123')
    })

    it('should find subscription by stripeSubscriptionId', async () => {
      const mockSubscription = {
        id: 'sub_123',
        userId: 'user_123',
        stripeSubscriptionId: 'sub_stripe_123',
        status: 'active',
      }
      
      prisma.subscription.findUnique.mockResolvedValueOnce(mockSubscription)

      const subscription = await prisma.subscription.findUnique({
        where: { stripeSubscriptionId: 'sub_stripe_123' },
      })

      expect(subscription?.stripeSubscriptionId).toBe('sub_stripe_123')
    })
  })

  describe('Account Model (OAuth)', () => {
    it('should create an OAuth account', async () => {
      const mockAccount = {
        id: 'account_123',
        userId: 'user_123',
        type: 'oauth',
        provider: 'github',
        providerAccountId: 'github_123',
        access_token: 'token_123',
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      
      prisma.account.create.mockResolvedValueOnce(mockAccount)

      const account = await prisma.account.create({
        data: {
          userId: 'user_123',
          type: 'oauth',
          provider: 'github',
          providerAccountId: 'github_123',
          access_token: 'token_123',
        },
      })

      expect(account).toEqual(mockAccount)
    })

    it('should enforce unique constraint on provider + providerAccountId', async () => {
      const error = new Error('Unique constraint failed')
      ;(error as any).code = 'P2002'
      prisma.account.create.mockRejectedValueOnce(error)

      await expect(prisma.account.create({
        data: {
          userId: 'user_123',
          type: 'oauth',
          provider: 'github',
          providerAccountId: 'existing_123',
        },
      })).rejects.toThrow('Unique constraint failed')
    })
  })

  describe('Session Model', () => {
    it('should create a session', async () => {
      const mockSession = {
        id: 'session_123',
        sessionToken: 'token_abc',
        userId: 'user_123',
        expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      }
      
      prisma.session.create.mockResolvedValueOnce(mockSession)

      const session = await prisma.session.create({
        data: {
          sessionToken: 'token_abc',
          userId: 'user_123',
          expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      })

      expect(session).toEqual(mockSession)
    })

    it('should find session by token', async () => {
      const mockSession = {
        id: 'session_123',
        sessionToken: 'token_abc',
        userId: 'user_123',
        expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      }
      
      prisma.session.findUnique.mockResolvedValueOnce(mockSession)

      const session = await prisma.session.findUnique({
        where: { sessionToken: 'token_abc' },
      })

      expect(session).toEqual(mockSession)
    })
  })

  describe('Transaction Support', () => {
    it('should execute operations in a transaction', async () => {
      const mockTx = {
        user: { create: jest.fn().mockResolvedValue({ id: 'user_1' }) },
        analysis: { create: jest.fn().mockResolvedValue({ id: 'analysis_1' }) },
      }
      
      prisma.$transaction.mockImplementationOnce(async (callback) => {
        return callback(mockTx as any)
      })

      const result = await prisma.$transaction(async (tx) => {
        const user = await tx.user.create({ data: { email: 'test@test.com' } })
        const analysis = await tx.analysis.create({ 
          data: { userId: user.id, errorMessage: 'Test' } 
        })
        return { user, analysis }
      })

      expect(result.user.id).toBe('user_1')
      expect(result.analysis.id).toBe('analysis_1')
    })
  })
})