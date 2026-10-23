import { http, HttpResponse, delay } from 'msw'
import { faker } from '@faker-js/faker'

// Type for request body
interface RequestBody {
  email?: string
  password?: string
  errorMessage?: string
  stackTrace?: string
  priceId?: string
  messages?: Array<{ content?: string }>
  [key: string]: unknown
}

// Helper to safely parse JSON body
async function getJsonBody(request: Request): Promise<RequestBody> {
  try {
    const body = await request.json()
    return (body as RequestBody) || {}
  } catch {
    return {}
  }
}

// Test data factories for MSW
const testUsers = {
  free: {
    id: 'user_free_123',
    email: 'free@example.com',
    name: 'Free User',
    role: 'USER',
    stripeCustomerId: null,
    stripeSubscriptionId: null,
    stripePriceId: null,
    stripeCurrentPeriodEnd: null,
  },
  pro: {
    id: 'user_pro_123',
    email: 'pro@example.com',
    name: 'Pro User',
    role: 'USER',
    stripeCustomerId: 'cus_pro_123',
    stripeSubscriptionId: 'sub_pro_123',
    stripePriceId: 'price_pro',
    stripeCurrentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  },
  admin: {
    id: 'user_admin_123',
    email: 'admin@example.com',
    name: 'Admin User',
    role: 'ADMIN',
    stripeCustomerId: null,
    stripeSubscriptionId: null,
    stripePriceId: null,
    stripeCurrentPeriodEnd: null,
  },
}

const testPlans = {
  free: {
    id: 'plan_free',
    name: 'free',
    displayName: 'Free',
    description: 'Free tier with basic features',
    price: 0,
    interval: 'month',
    stripePriceId: null,
    features: { analysesPerDay: 10 },
    maxRequestsPerDay: 10,
    isActive: true,
  },
  pro: {
    id: 'plan_pro',
    name: 'pro',
    displayName: 'Pro',
    description: 'Professional tier with higher limits',
    price: 2900,
    interval: 'month',
    stripePriceId: 'price_pro',
    features: { analysesPerDay: 100 },
    maxRequestsPerDay: 100,
    isActive: true,
  },
  enterprise: {
    id: 'plan_enterprise',
    name: 'enterprise',
    displayName: 'Enterprise',
    description: 'Enterprise tier with unlimited access',
    price: 9900,
    interval: 'month',
    stripePriceId: 'price_enterprise',
    features: { analysesPerDay: -1 },
    maxRequestsPerDay: 1000,
    isActive: true,
  },
}

// Store for in-memory state
const analysisStore = new Map<string, any>()
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

// Helper to get user from auth header
function getUserFromRequest(request: Request): { id: string; role: string } | null {
  const authHeader = request.headers.get('Authorization')
  const cookieHeader = request.headers.get('Cookie')
  
  // In tests, we'll use a simple token format
  const token = authHeader?.replace('Bearer ', '') || 
    cookieHeader?.match(/next-auth.session-token=([^;]+)/)?.[1]
  
  if (!token) return null
  
  // Parse mock token
  if (token.includes('user_free')) return { id: 'user_free_123', role: 'USER' }
  if (token.includes('user_pro')) return { id: 'user_pro_123', role: 'USER' }
  if (token.includes('user_admin')) return { id: 'user_admin_123', role: 'ADMIN' }
  if (token.includes('user_123')) return { id: 'user_123', role: 'USER' }
  
  return { id: 'user_123', role: 'USER' }
}

// Rate limiter helper
function checkRateLimit(userId: string, maxRequests: number = 10, windowMs: number = 86400000) {
  const now = Date.now()
  const userLimit = rateLimitStore.get(userId)
  
  if (!userLimit || userLimit.resetTime < now) {
    rateLimitStore.set(userId, { count: 1, resetTime: now + windowMs })
    return { success: true, remaining: maxRequests - 1, resetTime: now + windowMs, totalRequests: 1 }
  }
  
  if (userLimit.count >= maxRequests) {
    return { success: false, remaining: 0, resetTime: userLimit.resetTime, totalRequests: userLimit.count }
  }
  
  userLimit.count++
  return { success: true, remaining: maxRequests - userLimit.count, resetTime: userLimit.resetTime, totalRequests: userLimit.count }
}

// MSW Handlers
export const handlers = [
  // Auth endpoints
  http.post('/api/auth/signin', async ({ request }) => {
    await delay(100)
    const body = await getJsonBody(request)
    
    if (!body.email || !body.password) {
      return HttpResponse.json({ error: 'Email and password required' }, { status: 400 })
    }
    
    // Find matching test user
    let user = null
    if (body.email === 'free@example.com') user = testUsers.free
    else if (body.email === 'pro@example.com') user = testUsers.pro
    else if (body.email === 'admin@example.com') user = testUsers.admin
    else if (body.email === 'test@example.com') user = testUsers.free
    
    if (!user || body.password !== 'password123') {
      return HttpResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }
    
    const sessionToken = `mock-session-${user.id}`
    return HttpResponse.json(
      { user: { id: user.id, email: user.email, name: user.name, role: user.role } },
      {
        headers: {
          'Set-Cookie': `next-auth.session-token=${sessionToken}; Path=/; HttpOnly; SameSite=Lax`,
        },
      }
    )
  }),
  
  http.post('/api/auth/signout', async () => {
    await delay(50)
    return HttpResponse.json({ success: true }, {
      headers: {
        'Set-Cookie': 'next-auth.session-token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0',
      },
    })
  }),
  
  http.get('/api/auth/session', async ({ request }) => {
    await delay(50)
    const user = getUserFromRequest(request)
    if (!user) {
      return HttpResponse.json(null)
    }
    return HttpResponse.json({
      user: { id: user.id, email: testUsers.free.email, name: testUsers.free.name, role: user.role },
      expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    })
  }),
  
  // Analyze endpoint
  http.post('/api/analyze', async ({ request }) => {
    await delay(200)
    const user = getUserFromRequest(request)
    
    if (!user) {
      return HttpResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const body = await getJsonBody(request)
    
    if (!body.errorMessage) {
      return HttpResponse.json({ error: 'errorMessage is required' }, { status: 400 })
    }
    
    // Check rate limit
    const userPlan = user.id === 'user_pro_123' ? 'pro' : 'free'
    const maxRequests = userPlan === 'pro' ? 100 : 10
    const rateLimit = checkRateLimit(`user:${user.id}`, maxRequests)
    
    if (!rateLimit.success) {
      return HttpResponse.json(
        { error: 'Rate limit exceeded. Please upgrade your plan.' },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': String(maxRequests),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(Math.floor(rateLimit.resetTime / 1000)),
          },
        }
      )
    }
    
    // Mock AI analysis response
    const errorMessage = body.errorMessage.toLowerCase()
    let analysisResult
    
    if (errorMessage.includes('typeerror') || errorMessage.includes('undefined')) {
      analysisResult = {
        errorType: 'TypeError',
        analysis: 'Attempting to access a property on an undefined value.',
        suggestions: [
          'Add null/undefined checks before accessing properties',
          'Use optional chaining (?.) operator',
          'Initialize the variable with a default value',
        ],
        confidence: 0.95,
        tokensUsed: 180,
        model: 'deepseek-coder:6.7b',
        documentation: ['https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Errors/TypeError'],
        severity: 'high',
        cwe: ['CWE-476'],
      }
    } else if (errorMessage.includes('401') || errorMessage.includes('unauthorized') || errorMessage.includes('api key')) {
      analysisResult = {
        errorType: 'AuthenticationError',
        analysis: 'The provided API key is invalid or has expired.',
        suggestions: [
          'Verify the API key is correct',
          'Regenerate the API key from the provider dashboard',
          'Check if the API key has the required permissions',
        ],
        confidence: 0.98,
        tokensUsed: 160,
        model: 'deepseek-coder:6.7b',
        documentation: ['https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/401'],
        severity: 'high',
        cwe: ['CWE-306'],
      }
    } else if (errorMessage.includes('rate limit') || errorMessage.includes('429')) {
      analysisResult = {
        errorType: 'RateLimitError',
        analysis: 'Too many requests have been made in a given timeframe.',
        suggestions: [
          'Implement exponential backoff retry logic',
          'Request a rate limit increase from the API provider',
          'Cache responses to reduce API calls',
        ],
        confidence: 0.9,
        tokensUsed: 140,
        model: 'deepseek-coder:6.7b',
        documentation: ['https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/429'],
        severity: 'medium',
        cwe: ['CWE-770'],
      }
    } else if (errorMessage.includes('referenceerror') || errorMessage.includes('not defined')) {
      analysisResult = {
        errorType: 'ReferenceError',
        analysis: 'A variable or function is being used before it is declared.',
        suggestions: [
          'Check variable declaration order',
          'Ensure all imports are correct',
          'Verify the variable is in scope',
        ],
        confidence: 0.92,
        tokensUsed: 170,
        model: 'deepseek-coder:6.7b',
        documentation: ['https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Errors/ReferenceError'],
        severity: 'high',
        cwe: ['CWE-476'],
      }
    } else {
      analysisResult = {
        errorType: 'UnknownError',
        analysis: 'An unexpected error occurred. Please review the error message and stack trace.',
        suggestions: [
          'Check the error message for specific details',
          'Review the stack trace for the source of the error',
          'Search for the error message online',
        ],
        confidence: 0.5,
        tokensUsed: 100,
        model: 'deepseek-coder:6.7b',
        documentation: [],
        severity: 'medium',
        cwe: [],
      }
    }
    
    // Store analysis
    const analysisId = `analysis_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const analysisRecord = {
      id: analysisId,
      userId: user.id,
      errorMessage: body.errorMessage,
      errorType: analysisResult.errorType,
      stackTrace: body.stackTrace || null,
      aiResponse: analysisResult.analysis,
      model: analysisResult.model,
      tokensUsed: analysisResult.tokensUsed,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    analysisStore.set(analysisId, analysisRecord)
    
    return HttpResponse.json(
      { ...analysisResult, id: analysisId },
      {
        headers: {
          'X-RateLimit-Limit': String(maxRequests),
          'X-RateLimit-Remaining': String(rateLimit.remaining),
          'X-RateLimit-Reset': String(Math.floor(rateLimit.resetTime / 1000)),
        },
      }
    )
  }),
  
  // History endpoints
  http.get('/api/history', async ({ request }) => {
    await delay(100)
    const user = getUserFromRequest(request)
    
    if (!user) {
      return HttpResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const userAnalyses = Array.from(analysisStore.values())
      .filter(a => a.userId === user.id)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 50)
    
    return HttpResponse.json({ analyses: userAnalyses })
  }),
  
  http.get('/api/history/:id', async ({ params }) => {
    await delay(50)
    const { id } = params
    const analysis = analysisStore.get(id as string)
    
    if (!analysis) {
      return HttpResponse.json({ error: 'Analysis not found' }, { status: 404 })
    }
    
    return HttpResponse.json(analysis)
  }),
  
  // Plans endpoint
  http.get('/api/plans', async () => {
    await delay(50)
    return HttpResponse.json({ plans: Object.values(testPlans) })
  }),
  
  // Stripe checkout
  http.post('/api/stripe/checkout', async ({ request }) => {
    await delay(200)
    const user = getUserFromRequest(request)
    
    if (!user) {
      return HttpResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const body = await getJsonBody(request)
    
    if (!body.priceId) {
      return HttpResponse.json({ error: 'Price ID is required' }, { status: 400 })
    }
    
    // Check if user has Stripe customer ID
    const testUser = Object.values(testUsers).find(u => u.id === user.id)
    
    if (!testUser?.stripeCustomerId) {
      // Would create customer in real implementation
    }
    
    return HttpResponse.json({
      url: 'https://checkout.stripe.com/test_session',
      sessionId: 'cs_test_123',
    })
  }),
  
  // Stripe portal
  http.post('/api/stripe/portal', async ({ request }) => {
    await delay(100)
    const user = getUserFromRequest(request)
    
    if (!user) {
      return HttpResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const testUser = Object.values(testUsers).find(u => u.id === user.id)
    
    if (!testUser?.stripeCustomerId) {
      return HttpResponse.json({ error: 'No subscription found' }, { status: 404 })
    }
    
    const body = await getJsonBody(request)
    
    return HttpResponse.json({
      url: 'https://billing.stripe.com/test_portal',
    })
  }),
  
  // Stripe webhook
  http.post('/api/stripe/webhook', async ({ request }) => {
    await delay(50)
    // In real implementation, verify signature
    const payload = await request.text()
    
    try {
      JSON.parse(payload)
      return HttpResponse.json({ received: true })
    } catch {
      return HttpResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }
  }),
  
  // Rate limit status
  http.get('/api/rate-limit', async ({ request }) => {
    await delay(50)
    const user = getUserFromRequest(request)
    
    if (!user) {
      return HttpResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const userPlan = user.id === 'user_pro_123' ? 'pro' : 'free'
    const maxRequests = userPlan === 'pro' ? 100 : 10
    const rateLimit = checkRateLimit(`user:${user.id}`, maxRequests)
    
    return HttpResponse.json({
      success: rateLimit.success,
      remaining: rateLimit.remaining,
      limit: maxRequests,
      resetTime: rateLimit.resetTime,
    })
  }),
  
  // Health check
  http.get('/api/health', async () => {
    return HttpResponse.json({ status: 'ok', timestamp: new Date().toISOString() })
  }),
  
  // Ollama mock
  http.post('http://localhost:11434/v1/chat/completions', async ({ request }) => {
    await delay(500) // Simulate AI processing time
    const body = await getJsonBody(request)
    
    // Return structured response based on the prompt
    const userMessage = body.messages?.[1]?.content || ''
    
    let responseContent = {
      errorType: 'TestError',
      analysis: 'Test analysis response',
      suggestions: ['Test suggestion 1', 'Test suggestion 2'],
      confidence: 0.8,
      tokensUsed: 150,
      model: 'deepseek-coder:6.7b',
    }
    
    if (userMessage.includes('TypeError') || userMessage.includes('undefined')) {
      responseContent = {
        errorType: 'TypeError',
        analysis: 'Attempting to access a property on an undefined value.',
        suggestions: [
          'Add null/undefined checks before accessing properties',
          'Use optional chaining (?.) operator',
        ],
        confidence: 0.95,
        tokensUsed: 180,
        model: 'deepseek-coder:6.7b',
      }
    } else if (userMessage.includes('401') || userMessage.includes('Unauthorized')) {
      responseContent = {
        errorType: 'AuthenticationError',
        analysis: 'The provided API key is invalid or has expired.',
        suggestions: ['Verify the API key', 'Regenerate the API key'],
        confidence: 0.98,
        tokensUsed: 160,
        model: 'deepseek-coder:6.7b',
      }
    }
    
    return HttpResponse.json({
      choices: [{
        message: {
          content: JSON.stringify(responseContent),
        },
      }],
      usage: {
        total_tokens: responseContent.tokensUsed,
      },
    })
  }),
]

// Export test utilities
export function resetMSWState() {
  analysisStore.clear()
  rateLimitStore.clear()
}

export function getAnalysisStore() {
  return analysisStore
}

export function getRateLimitStore() {
  return rateLimitStore
}

export { testUsers, testPlans }