import Stripe from 'stripe'

// Create a lazy-initialized Stripe instance
let stripeInstance: Stripe | null = null

function getStripeInstance(): Stripe {
  if (!stripeInstance) {
    const secretKey = process.env.STRIPE_SECRET_KEY || ''
    if (!secretKey) {
      throw new Error('STRIPE_SECRET_KEY is not set')
    }
    stripeInstance = new Stripe(secretKey, {
      apiVersion: '2023-10-16',
      typescript: true,
    })
  }
  return stripeInstance
}

export interface CreateCheckoutSessionParams {
  userId: string
  email: string
  priceId: string
  successUrl: string
  cancelUrl: string
  customerId?: string
}

export interface CreatePortalSessionParams {
  customerId: string
  returnUrl: string
}

export interface SubscriptionInfo {
  status: string
  currentPeriodEnd: Date
  planName: string
  priceId: string
}

export async function createCheckoutSession(params: CreateCheckoutSessionParams): Promise<string> {
  const stripe = getStripeInstance()
  const session = await stripe.checkout.sessions.create({
    customer: params.customerId,
    customer_email: params.customerId ? undefined : params.email,
    payment_method_types: ['card'],
    line_items: [
      {
        price: params.priceId,
        quantity: 1,
      },
    ],
    mode: 'subscription',
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
    metadata: {
      userId: params.userId,
    },
    subscription_data: {
      metadata: {
        userId: params.userId,
      },
    },
  })

  if (!session.url) {
    throw new Error('Failed to create checkout session URL')
  }

  return session.url
}

export async function createPortalSession(params: CreatePortalSessionParams): Promise<string> {
  const stripe = getStripeInstance()
  const session = await stripe.billingPortal.sessions.create({
    customer: params.customerId,
    return_url: params.returnUrl,
  })

  return session.url
}

export async function getSubscriptionInfo(subscriptionId: string): Promise<SubscriptionInfo | null> {
  try {
    const stripe = getStripeInstance()
    const subscription = await stripe.subscriptions.retrieve(subscriptionId)
    
    return {
      status: subscription.status,
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      planName: subscription.items.data[0]?.price?.nickname || 'Unknown Plan',
      priceId: subscription.items.data[0]?.price?.id || '',
    }
  } catch {
    return null
  }
}

export async function createCustomer(email: string, userId: string): Promise<string> {
  const stripe = getStripeInstance()
  const customer = await stripe.customers.create({
    email,
    metadata: { userId },
  })
  return customer.id
}

export async function cancelSubscription(subscriptionId: string): Promise<void> {
  const stripe = getStripeInstance()
  await stripe.subscriptions.cancel(subscriptionId)
}

export async function updateSubscription(subscriptionId: string, priceId: string): Promise<void> {
  const stripe = getStripeInstance()
  const subscription = await stripe.subscriptions.retrieve(subscriptionId)
  await stripe.subscriptions.update(subscriptionId, {
    items: [
      {
        id: subscription.items.data[0].id,
        price: priceId,
      },
    ],
    proration_behavior: 'create_prorations',
  })
}

export function constructWebhookEvent(payload: string | Buffer, signature: string): Stripe.Event {
  const stripe = getStripeInstance()
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || ''
  return stripe.webhooks.constructEvent(payload, signature, webhookSecret)
}

export async function getPriceIdByPlanName(planName: string): Promise<string | null> {
  const stripe = getStripeInstance()
  const prices = await stripe.prices.list({
    active: true,
    type: 'recurring',
  })
  
  const price = prices.data.find(p => p.nickname === planName)
  return price?.id || null
}

// For testing purposes
export function __resetStripeInstance() {
  stripeInstance = null
}

export { getStripeInstance }