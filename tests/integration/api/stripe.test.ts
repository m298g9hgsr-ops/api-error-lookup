import { POST } from '@/app/api/stripe/checkout/route'
import { POST as portalPOST } from '@/app/api/stripe/portal/route'
import { POST as webhookPOST } from '@/app/api/stripe/webhook/route'
import { getServerSession } from 'next-auth'
import { createCheckoutSession, createCustomer } from '@/services/stripe'
import { createPortalSession } from '@/services/stripe'
import { constructWebhookEvent } from '@/services/stripe'
import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'
import Stripe from 'stripe'
import { type Mock } from 'vitest'

// Mock dependencies
vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}))

vi.mock('@/services/stripe', () => ({
  createCheckoutSession: vi.fn(),
  createCustomer: vi.fn(),
  createPortalSession: vi.fn(),
  constructWebhookEvent: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    subscription: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    plan: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
    },
  },
}))

vi.mock('@/lib/auth', () => ({
  authOptions: {},
}))

describe('POST /api/stripe/checkout', () => {
  const mockSession = {
    user: { id: 'user_123', email: 'test@example.com' },
  }

  beforeEach(() => {
    vi.clearAllMocks()
    ;(getServerSession as Mock).mockResolvedValue(mockSession)
    ;(prisma.user.findUnique as Mock).mockResolvedValue({
      id: 'user_123',
      email: 'test@example.com',
      stripeCustomerId: null,
      subscriptions: [],
    })
    ;(createCustomer as Mock).mockResolvedValue('cus_new123')
    ;(prisma.subscription.update as Mock).mockResolvedValue({})
    ;(createCheckoutSession as Mock).mockResolvedValue('https://checkout.stripe.com/session_123')
  })

  function createRequest(body: object) {
    return new NextRequest('http://localhost:3000/api/stripe/checkout', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' },
    })
  }

  it('should return 401 when not authenticated', async () => {
    ;(getServerSession as Mock).mockResolvedValueOnce(null)

    const request = createRequest({ priceId: 'price_pro' })
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('Unauthorized')
  })

  it('should return 400 when priceId is missing', async () => {
    const request = createRequest({ successUrl: 'https://app.com/success' })
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Price ID is required')
  })

  it('should return 404 when user not found', async () => {
    ;(prisma.user.findUnique as Mock).mockResolvedValueOnce(null)

    const request = createRequest({ priceId: 'price_pro' })
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('User not found')
  })

  it('should create Stripe customer and update subscription if not exists', async () => {
    ;(prisma.user.findUnique as Mock).mockResolvedValueOnce({
      id: 'user_123',
      email: 'test@example.com',
      stripeCustomerId: null,
      subscriptions: [{ id: 'sub_123', stripeCustomerId: null }],
    })

    const request = createRequest({ priceId: 'price_pro' })
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.url).toBe('https://checkout.stripe.com/session_123')
    expect(createCustomer).toHaveBeenCalledWith('test@example.com', 'user_123')
    expect(prisma.subscription.update).toHaveBeenCalledWith({
      where: { id: 'sub_123' },
      data: { stripeCustomerId: 'cus_new123' },
    })
  })

  it('should use existing Stripe customer ID from subscription', async () => {
    ;(prisma.user.findUnique as Mock).mockResolvedValueOnce({
      id: 'user_123',
      email: 'test@example.com',
      subscriptions: [{ id: 'sub_123', stripeCustomerId: 'cus_existing' }],
    })

    const request = createRequest({ priceId: 'price_pro' })
    await POST(request)

    expect(createCustomer).not.toHaveBeenCalled()
    expect(createCheckoutSession).toHaveBeenCalledWith(
      expect.objectContaining({ customerId: 'cus_existing' })
    )
  })

  it('should use default URLs when not provided', async () => {
    process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000'

    const request = createRequest({ priceId: 'price_pro' })
    await POST(request)

    expect(createCheckoutSession).toHaveBeenCalledWith(
      expect.objectContaining({
        successUrl: 'http://localhost:3000/dashboard?success=true',
        cancelUrl: 'http://localhost:3000/pricing?canceled=true',
      })
    )
  })

  it('should use custom URLs when provided', async () => {
    const request = createRequest({
      priceId: 'price_pro',
      successUrl: 'https://custom.com/success',
      cancelUrl: 'https://custom.com/cancel',
    })
    await POST(request)

    expect(createCheckoutSession).toHaveBeenCalledWith(
      expect.objectContaining({
        successUrl: 'https://custom.com/success',
        cancelUrl: 'https://custom.com/cancel',
      })
    )
  })

  it('should return 500 on checkout session creation failure', async () => {
    ;(createCheckoutSession as Mock).mockRejectedValueOnce(new Error('Stripe error'))

    const request = createRequest({ priceId: 'price_pro' })
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Failed to create checkout session')
  })
})

describe('POST /api/stripe/portal', () => {
  const mockSession = {
    user: { id: 'user_123', email: 'test@example.com' },
  }

  beforeEach(() => {
    vi.clearAllMocks()
    ;(getServerSession as Mock).mockResolvedValue(mockSession)
    ;(prisma.user.findUnique as Mock).mockResolvedValue({
      id: 'user_123',
      email: 'test@example.com',
      subscriptions: [{ stripeCustomerId: 'cus_123' }],
    })
    ;(createPortalSession as Mock).mockResolvedValue('https://billing.stripe.com/portal_123')
  })

  function createRequest(body: object) {
    return new NextRequest('http://localhost:3000/api/stripe/portal', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' },
    })
  }

  it('should return 401 when not authenticated', async () => {
    ;(getServerSession as Mock).mockResolvedValueOnce(null)

    const request = createRequest({})
    const response = await portalPOST(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('Unauthorized')
  })

  it('should return 404 when no Stripe customer ID', async () => {
    ;(prisma.user.findUnique as Mock).mockResolvedValueOnce({
      id: 'user_123',
      email: 'test@example.com',
      subscriptions: [{ stripeCustomerId: null }],
    })

    const request = createRequest({})
    const response = await portalPOST(request)
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('No subscription found')
  })

  it('should create portal session with return URL', async () => {
    const request = createRequest({ returnUrl: 'https://app.com/dashboard' })
    const response = await portalPOST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.url).toBe('https://billing.stripe.com/portal_123')
    expect(createPortalSession).toHaveBeenCalledWith({
      customerId: 'cus_123',
      returnUrl: 'https://app.com/dashboard',
    })
  })

  it('should use default return URL when not provided', async () => {
    process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000'

    const request = createRequest({})
    await portalPOST(request)

    expect(createPortalSession).toHaveBeenCalledWith(
      expect.objectContaining({
        returnUrl: 'http://localhost:3000/dashboard',
      })
    )
  })

  it('should return 500 on portal session creation failure', async () => {
    ;(createPortalSession as Mock).mockRejectedValueOnce(new Error('Portal error'))

    const request = createRequest({})
    const response = await portalPOST(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Failed to create portal session')
  })
})

describe('POST /api/stripe/webhook', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(constructWebhookEvent as Mock).mockImplementation((payload) => JSON.parse(payload))
    ;(prisma.subscription.findFirst as Mock).mockResolvedValue({ id: 'sub_db_123' })
    ;(prisma.plan.findFirst as Mock).mockResolvedValue({ id: 'plan_pro' })
    ;(prisma.plan.findUnique as Mock).mockResolvedValue({ id: 'plan_free' })
    ;(prisma.subscription.update as Mock).mockResolvedValue({})
    ;(prisma.subscription.create as Mock).mockResolvedValue({})
  })

  function createRequest(body: object, signature = 'sig_test') {
    return new NextRequest('http://localhost:3000/api/stripe/webhook', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: {
        'Content-Type': 'application/json',
        'stripe-signature': signature,
      },
    })
  }

  it('should return 400 for invalid signature', async () => {
    ;(constructWebhookEvent as Mock).mockImplementationOnce(() => {
      throw new Error('Invalid signature')
    })

    const request = createRequest({ type: 'test.event' }, 'bad_sig')
    const response = await webhookPOST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Webhook signature verification failed')
  })

  it('should handle customer.subscription.created event', async () => {
    // No active subscription for this user -> the webhook must create one
    ;(prisma.subscription.findFirst as Mock).mockResolvedValueOnce(null)

    const event = {
      type: 'customer.subscription.created',
      data: {
        object: {
          id: 'sub_new123',
          metadata: { userId: 'user_123' },
          items: { data: [{ price: { id: 'price_pro' } }] },
          current_period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
          current_period_start: Math.floor(Date.now() / 1000),
          cancel_at_period_end: false,
          customer: 'cus_123',
        },
      },
    }

    const request = createRequest(event)
    const response = await webhookPOST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.received).toBe(true)
    expect(prisma.subscription.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        userId: 'user_123',
        stripeSubscriptionId: 'sub_new123',
        stripePriceId: 'price_pro',
        planId: 'plan_pro',
      }),
    }))
  })

  it('should handle customer.subscription.updated event', async () => {
    const event = {
      type: 'customer.subscription.updated',
      data: {
        object: {
          id: 'sub_123',
          metadata: { userId: 'user_123' },
          items: { data: [{ price: { id: 'price_pro' } }] },
          current_period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
          current_period_start: Math.floor(Date.now() / 1000),
          cancel_at_period_end: false,
          customer: 'cus_123',
        },
      },
    }

    const request = createRequest(event)
    await webhookPOST(request)

    expect(prisma.subscription.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'sub_db_123' },
        data: expect.objectContaining({
          stripeSubscriptionId: 'sub_123',
        }),
      })
    )
  })

  it('should handle customer.subscription.deleted event', async () => {
    const event = {
      type: 'customer.subscription.deleted',
      data: {
        object: {
          id: 'sub_123',
          metadata: { userId: 'user_123' },
        },
      },
    }

    const request = createRequest(event)
    await webhookPOST(request)

    expect(prisma.subscription.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'sub_db_123' },
        data: expect.objectContaining({
          status: 'canceled',
          stripeSubscriptionId: null,
          stripePriceId: null,
          planId: 'plan_free',
        }),
      })
    )
  })

  it('should handle invoice.payment_succeeded event', async () => {
    const event = {
      type: 'invoice.payment_succeeded',
      data: {
        object: {
          id: 'in_123',
          subscription: 'sub_123',
          lines: {
            data: [{
              period: { end: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60 },
            }],
          },
          subscription_details: { metadata: { userId: 'user_123' } },
        },
      },
    }

    const request = createRequest(event)
    await webhookPOST(request)

    expect(prisma.subscription.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'sub_db_123' },
        data: expect.objectContaining({
          currentPeriodEnd: expect.any(Date),
        }),
      })
    )
  })

  it('should handle invoice.payment_failed event', async () => {
    const event = {
      type: 'invoice.payment_failed',
      data: { object: { id: 'in_failed', metadata: { userId: 'user_123' } } },
    }

    const request = createRequest(event)
    const response = await webhookPOST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.received).toBe(true)
    expect(prisma.subscription.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'sub_db_123' },
        data: { status: 'past_due' },
      })
    )
  })

  it('should ignore unhandled event types', async () => {
    const event = {
      type: 'some.unknown.event',
      data: { object: {} },
    }

    const request = createRequest(event)
    const response = await webhookPOST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.received).toBe(true)
    expect(prisma.subscription.update).not.toHaveBeenCalled()
    expect(prisma.subscription.create).not.toHaveBeenCalled()
  })

  it('should return 500 on unexpected error', async () => {
    // A failure inside the switch (not in signature verification) must surface
    // as a 500 from the outer catch block.
    ;(prisma.subscription.findFirst as Mock).mockRejectedValueOnce(new Error('Unexpected error'))

    const request = createRequest({
      type: 'customer.subscription.created',
      data: {
        object: {
          id: 'sub_new123',
          metadata: { userId: 'user_123' },
          items: { data: [{ price: { id: 'price_pro' } }] },
          current_period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
          current_period_start: Math.floor(Date.now() / 1000),
          cancel_at_period_end: false,
          customer: 'cus_123',
        },
      },
    })
    const response = await webhookPOST(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Webhook handler failed')
  })
})