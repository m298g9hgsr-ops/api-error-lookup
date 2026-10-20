# Testing Guide - api-error-lookup

## Overview
This project uses a comprehensive testing strategy with three layers:
- **Unit Tests** (80% coverage target): Test individual functions and services in isolation
- **Integration Tests** (70% coverage target): Test API routes and their interactions
- **E2E Tests** (100% core flow coverage): Test critical user journeys with Playwright

## Quick Start

```bash
# Install dependencies
bun install

# Run all tests
bun test

# Run specific test suites
bun test tests/unit          # Unit tests only
bun test tests/integration   # Integration tests only
bun test tests/e2e           # E2E tests only (requires dev server)

# Run with coverage
bun test --coverage

# Watch mode for development
bun test:watch
```

## Test Structure

```
tests/
├── unit/
│   ├── services/
│   │   ├── aiAnalysis.test.ts      # AI analysis service tests
│   │   ├── stripe.test.ts          # Stripe service tests
│   │   └── rateLimiter.test.ts     # Rate limiter tests
│   └── models/
│       └── prisma.test.ts          # Prisma model tests
├── integration/
│   └── api/
│       ├── analyze.test.ts         # /api/analyze endpoint tests
│       ├── auth.test.ts            # Auth configuration tests
│       └── stripe.test.ts          # Stripe API endpoint tests
├── e2e/
│   ├── auth.spec.ts                # Authentication flows
│   ├── analyze.spec.ts             # Error analysis flows
│   └── subscription.spec.ts        # Subscription/upgrade flows
├── fixtures/
│   └── data.ts                     # Test data fixtures
├── helpers/
│   ├── api.ts                      # API test helpers
│   └── auth.ts                     # Auth test helpers
└── setup/
    └── jest.setup.ts               # Jest global setup
```

## Coverage Targets

| Test Type | Target | Current Status |
|-----------|--------|----------------|
| Unit | 80% (lines, branches, functions) | Configured |
| Integration | 70% (lines, branches) | Configured |
| E2E | 100% core user paths | Manual verification |

## Configuration Files

- **jest.config.js** - Jest configuration with coverage thresholds
- **playwright.config.ts** - Playwright E2E configuration
- **TEST_PLAN.md** - Detailed test strategy document

## Mocking Strategy

### External Services
- **Ollama AI**: Mocked via global fetch in jest.setup.ts
- **Stripe**: Mocked using jest.mock('stripe')
- **Redis (Upstash)**: Mocked using jest.mock('@upstash/redis')
- **NextAuth**: Mocked session and providers
- **Prisma**: Mocked via __mocks__/@prisma/client.ts

### Test Helpers
- `tests/helpers/api.ts` - Create mock requests, parse responses
- `tests/helpers/auth.ts` - Mock sessions, create test users
- `tests/fixtures/data.ts` - Predefined test data (users, plans, analyses)

## CI/CD Integration

The test suite is designed to run in CI environments:

```yaml
# Example GitHub Actions workflow
jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v1
      - run: bun install
      - run: bun test tests/unit --coverage

  integration-tests:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env: { POSTGRES_DB: test, POSTGRES_PASSWORD: test }
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

## Writing New Tests

### Unit Test Template
```typescript
// tests/unit/services/myService.test.ts
import { myFunction } from '@/services/myService'

describe('myFunction', () => {
  it('should do something', async () => {
    const result = await myFunction(input)
    expect(result).toEqual(expected)
  })
})
```

### Integration Test Template
```typescript
// tests/integration/api/myRoute.test.ts
import { POST } from '@/app/api/myRoute/route'
import { createMockRequest } from '@/tests/helpers/api'

describe('POST /api/myRoute', () => {
  it('should handle valid request', async () => {
    const request = createMockRequest({ key: 'value' })
    const response = await POST(request)
    const data = await response.json()
    
    expect(response.status).toBe(200)
    expect(data).toMatchObject({ ... })
  })
})
```

### E2E Test Template
```typescript
// tests/e2e/myFlow.spec.ts
import { test, expect } from '@playwright/test'

test.describe('My Feature', () => {
  test('should complete user flow', async ({ page }) => {
    await page.goto('/my-page')
    await page.click('button')
    await expect(page.locator('text=Success')).toBeVisible()
  })
})
```

## Environment Variables for Testing

Create a `.env.test` file for test-specific configuration:

```env
NODE_ENV=test
DATABASE_URL=postgresql://test:test@localhost:5432/test
NEXTAUTH_SECRET=test-secret
STRIPE_SECRET_KEY=sk_test_mock
STRIPE_WEBHOOK_SECRET=whsec_mock
OLLAMA_BASE_URL=http://localhost:11434
UPSTASH_REDIS_REST_URL=http://localhost:8079
UPSTASH_REDIS_REST_TOKEN=mock-token
NEXT_PUBLIC_APP_URL=http://localhost:3000
PLAYWRIGHT_BASE_URL=http://localhost:3000
```

## Debugging Tests

### Unit/Integration Tests
```bash
# Run single test file
bun test tests/unit/services/aiAnalysis.test.ts

# Run with verbose output
bun test tests/unit/services/aiAnalysis.test.ts --verbose

# Debug with Node inspector
node --inspect-brk node_modules/.bin/jest tests/unit/services/aiAnalysis.test.ts
```

### E2E Tests
```bash
# Run with headed browser (visible)
bun test tests/e2e --headed

# Run specific test
bun test tests/e2e/auth.spec.ts

# Generate trace for debugging
bun test tests/e2e --trace on
```

## Best Practices

1. **Isolate Tests**: Each test should be independent and not rely on other tests
2. **Use Fixtures**: Leverage `tests/fixtures/data.ts` for consistent test data
3. **Mock External Dependencies**: Always mock external services
4. **Test Edge Cases**: Include error scenarios, empty states, boundary conditions
5. **Descriptive Names**: Use clear test names describing the expected behavior
6. **AAA Pattern**: Arrange, Act, Assert - structure tests clearly

## Troubleshooting

### Common Issues

**Tests fail with "Cannot find module"**
- Check `moduleNameMapper` in jest.config.js
- Ensure `@/*` paths match tsconfig.json

**Mock not working**
- Verify mock is in `tests/__mocks__/` or jest.mock() is called
- Check jest.setup.ts loads before tests

**E2E tests timeout**
- Increase timeout in playwright.config.ts
- Ensure dev server is running before tests

**Coverage below threshold**
- Run `bun test --coverage` to see detailed report
- Add tests for uncovered branches/functions
- Check `coverage/lcov-report/index.html` for details