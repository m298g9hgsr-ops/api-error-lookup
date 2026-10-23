# Test Plan - api-error-lookup

## Overview
This document defines the testing strategy for the api-error-lookup project, covering unit tests, integration tests, and end-to-end (E2E) tests.

## Test Architecture

```
tests/
├── unit/              # Unit tests for individual functions/services
│   ├── services/      # Service layer tests
│   ├── lib/           # Library/utility tests
│   └── models/        # Prisma model tests
├── integration/       # API route integration tests
│   ├── api/           # API endpoint tests
│   └── auth/          # Authentication flow tests
├── e2e/               # Playwright E2E tests
│   ├── auth.spec.ts   # Authentication flows
│   ├── analyze.spec.ts # Error analysis flows
│   └── subscription.spec.ts # Subscription flows
├── fixtures/          # Test data fixtures
├── setup/             # Test setup and utilities
└── helpers/           # Test helper functions
```

## 1. Unit Tests (Target: 80% Coverage)

### 1.1 Prisma Models (`tests/unit/models/`)
- User model CRUD operations
- Analysis model CRUD operations
- Subscription/Plan model operations
- Database relations and constraints
- Index performance validation

### 1.2 AI Analysis Service (`tests/unit/services/aiAnalysis.test.ts`)
- `analyzeError()` - successful analysis with valid input
- `analyzeError()` - error handling for Ollama failures
- `validateAnalysisRequest()` - valid/invalid request validation
- `buildAnalysisPrompt()` - prompt construction
- `parseAIResponse()` - JSON parsing from AI response
- Edge cases: empty input, malformed responses, network timeouts

### 1.3 Stripe Service (`tests/unit/services/stripe.test.ts`)
- `createCheckoutSession()` - session creation
- `createPortalSession()` - portal session creation
- `getSubscriptionInfo()` - subscription retrieval
- `createCustomer()` - customer creation
- `cancelSubscription()` - subscription cancellation
- `updateSubscription()` - plan changes
- `constructWebhookEvent()` - webhook verification
- Error handling: invalid keys, network errors, Stripe API errors

### 1.4 Rate Limiter (`tests/unit/services/rateLimiter.test.ts`)
- `checkRateLimit()` - allow request under limit
- `checkRateLimit()` - block request over limit
- `checkRateLimit()` - sliding window behavior
- `resetRateLimit()` - manual reset
- `getRateLimitInfo()` - info retrieval
- `getRateLimitHeaders()` - header generation
- Concurrent request handling

### 1.5 Auth Library (`tests/unit/lib/auth.test.ts`)
- `authOptions` configuration validation
- JWT token callbacks
- Session callbacks
- Credentials provider authorization

## 2. Integration Tests (Target: 70% Coverage)

### 2.1 POST /api/analyze (`tests/integration/api/analyze.test.ts`)
- Successful analysis with authenticated user
- Rate limiting enforcement (429 response)
- Unauthorized access (401 response)
- Invalid request body (400 response)
- AI service failure handling (500 response)
- Database persistence verification
- Response headers include rate limit info

### 2.2 POST /api/auth/* (`tests/integration/api/auth.test.ts`)
- NextAuth sign-in flow
- Credentials validation
- Session creation and retrieval
- JWT token generation
- Invalid credentials rejection
- Protected route access with session

### 2.3 POST /api/stripe/checkout (`tests/integration/api/stripe-checkout.test.ts`)
- Checkout session creation for authenticated user
- Customer creation if not exists
- Stripe customer ID persistence
- Invalid price ID handling
- Unauthorized access

### 2.4 POST /api/stripe/portal (`tests/integration/api/stripe-portal.test.ts`)
- Portal session creation
- Customer ID validation
- Return URL handling
- Unauthorized access

### 2.5 POST /api/stripe/webhook (`tests/integration/api/stripe-webhook.test.ts`)
- Signature verification
- subscription.created event handling
- subscription.updated event handling
- subscription.deleted event handling
- invoice.payment_succeeded handling
- invoice.payment_failed handling
- Invalid signature rejection

## 3. E2E Tests (Target: 100% Core Flow Coverage)

### 3.1 Authentication Flow (`tests/e2e/auth.spec.ts`)
- User registration (if implemented)
- User login with valid credentials
- User login with invalid credentials
- Session persistence across page reloads
- Logout flow
- Protected route redirect

### 3.2 Error Analysis Flow (`tests/e2e/analyze.spec.ts`)
- Login → Navigate to analyze page → Input error → View results
- Error message input validation
- Stack trace input handling
- Results display formatting
- Rate limit UI feedback
- Analysis history display

### 3.3 Subscription Upgrade Flow (`tests/e2e/subscription.spec.ts`)
- Login → Navigate to pricing → Select plan → Checkout → Success → Portal access
- Free tier rate limit enforcement
- Pro tier higher limits
- Subscription management via portal
- Cancellation flow

## 4. Test Environment Configuration

### 4.1 Unit/Integration Test Environment
```bash
# Test database (separate from dev/prod)
DATABASE_URL=postgresql://test:test@localhost:5432/api_error_lookup_test

# Mock external services
OLLAMA_BASE_URL=http://localhost:11434  # Mock server
STRIPE_SECRET_KEY=sk_test_mock
STRIPE_WEBHOOK_SECRET=whsec_mock
UPSTASH_REDIS_REST_URL=http://localhost:8079  # Mock Redis
NEXTAUTH_SECRET=test-secret
```

### 4.2 E2E Test Environment
```bash
# Full stack with real services (or Docker compose)
DATABASE_URL=postgresql://test:test@localhost:5432/api_error_lookup_e2e
NEXT_PUBLIC_APP_URL=http://localhost:3000
PLAYWRIGHT_BASE_URL=http://localhost:3000
```

## 5. Test Commands

```bash
# Run all tests
bun test

# Run unit tests only
bun test tests/unit

# Run integration tests only
bun test tests/integration

# Run E2E tests only
bun test tests/e2e

# Run with coverage
bun test --coverage

# Watch mode
bun test --watch
```

## 6. Coverage Targets

| Test Type | Target | Measurement |
|-----------|--------|-------------|
| Unit | 80% | Lines, Branches, Functions |
| Integration | 70% | Lines, Branches |
| E2E | 100% | Critical user paths |

## 7. CI/CD Integration

```yaml
# .github/workflows/test.yml
jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v1
      - run: bun install
      - run: bun test tests/unit --coverage
      - uses: codecov/codecov-action@v3

  integration-tests:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env: { POSTGRES_DB: test, POSTGRES_PASSWORD: test }
      redis:
        image: redis:7
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v1
      - run: bun install
      - run: bun test tests/integration

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v1
      - uses: microsoft/playwright-github-action@v1
      - run: bun install
      - run: bun run build
      - run: bun run dev & sleep 10
      - run: bun test tests/e2e
```

## 8. Test Data Management

### 8.1 Fixtures
- User fixtures (free, pro, admin)
- Analysis fixtures (various error types)
- Subscription fixtures (active, canceled, past_due)
- Plan fixtures (free, pro, enterprise)

### 8.2 Database Seeding
```typescript
// tests/setup/seed.ts
async function seedTestDatabase() {
  await prisma.user.createMany({ data: testUsers })
  await prisma.plan.createMany({ data: testPlans })
  await prisma.analysis.createMany({ data: testAnalyses })
}
```

## 9. Mocking Strategy

### 9.1 External Services
- **Ollama**: Mock server returning predefined responses
- **Stripe**: Mock using stripe-mock or jest mocks
- **Redis**: Use @upstash/redis mock or fakeredis
- **NextAuth**: Mock session in test helpers

### 9.2 Test Utilities
```typescript
// tests/helpers/auth.ts
export function createMockSession(user?: Partial<User>) { ... }
export function mockNextAuthSession(session: Session | null) { ... }

// tests/helpers/api.ts
export function createMockRequest(body: any, headers?: HeadersInit) { ... }
export function createMockResponse() { ... }
```

## 10. Quality Gates

- All tests must pass before merge
- Coverage thresholds enforced in CI
- E2E tests run on staging deployment
- Performance benchmarks for rate limiter
- Security tests for auth endpoints