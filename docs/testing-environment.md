# Testing Environment Setup - api-error-lookup

## Overview
This document describes how to set up and configure the testing environment for local development, CI/CD, and staging.

---

## Local Development Setup

### Prerequisites
- Node.js 20+
- npm/pnpm/yarn
- PostgreSQL 15+ (or Docker)
- Redis 7+ (or Docker)

### Quick Start
```bash
# 1. Clone and install
cd pstack-project/api-error-lookup
npm install

# 2. Set up environment
cp .env.example .env.local
# Edit .env.local with your local values

# 3. Start dependencies (using Docker)
docker-compose up -d postgres redis ollama

# 4. Set up database
npm run db:generate
npm run db:migrate dev

# 5. Seed test data (optional)
npm run db:seed

# 6. Run tests
npm run test              # All tests
npm run test:unit         # Unit tests only
npm run test:integration  # Integration tests only
npm run test:e2e          # E2E tests (requires dev server)
```

---

## Environment Variables

### Required for All Tests
```env
# App
NODE_ENV=test
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Auth
NEXTAUTH_SECRET=test-secret-key-for-testing-only
NEXTAUTH_URL=http://localhost:3000

# Database
DATABASE_URL=postgresql://test:test@localhost:5432/test_db

# External Services (Mocked in Unit/Integration)
STRIPE_SECRET_KEY=sk_test_mock
STRIPE_WEBHOOK_SECRET=whsec_mock
OLLAMA_BASE_URL=http://localhost:11434
DEFAULT_AI_MODEL=deepseek-coder:6.7b
UPSTASH_REDIS_REST_URL=http://localhost:8079
UPSTASH_REDIS_REST_TOKEN=mock-token
```

### For E2E Tests
```env
PLAYWRIGHT_BASE_URL=http://localhost:3000
```

### For Local Development (Non-Test)
```env
# Use real services
DATABASE_URL=postgresql://user:pass@localhost:5432/api_error_lookup
STRIPE_SECRET_KEY=sk_test_real_key_from_stripe_dashboard
STRIPE_WEBHOOK_SECRET=whsec_real_from_stripe_cli
OLLAMA_BASE_URL=http://localhost:11434/v1
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_real_token
```

---

## Test Database Setup

### Using Docker (Recommended)
```bash
# Start test database
docker run -d \
  --name test-postgres \
  -e POSTGRES_DB=test_db \
  -e POSTGRES_USER=test \
  -e POSTGRES_PASSWORD=test \
  -p 5432:5432 \
  postgres:15-alpine

# Start test Redis
docker run -d \
  --name test-redis \
  -p 6379:6379 \
  redis:7-alpine
```

### Using Local PostgreSQL
```bash
# Create test database
createdb test_db
createuser test --pwprompt

# Or with psql
psql -c "CREATE DATABASE test_db;"
psql -c "CREATE USER test WITH PASSWORD 'test';"
psql -c "GRANT ALL PRIVILEGES ON DATABASE test_db TO test;"
```

### Run Migrations
```bash
# Development
npm run db:migrate dev

# Test/CI (deploy mode)
npm run db:migrate deploy
```

---

## Mocking External Services

### Ollama (AI Analysis)
For unit/integration tests, Ollama is mocked via:
- `tests/setup/vitest.setup.ts` - global fetch mock
- `src/test/msw/handlers.ts` - MSW handler for `/v1/chat/completions`

For E2E tests against real Ollama:
```bash
# Start Ollama locally
docker run -d -p 11434:11434 ollama/ollama
# Pull model
docker exec ollama ollama pull deepseek-coder:6.7b
```

### Stripe
- Unit/Integration: Mocked via `jest.mock('stripe')` in setup
- E2E: Use Stripe test mode with `stripe listen --forward-to localhost:3000/api/stripe/webhook`

### Redis/Upstash
- Unit/Integration: Mocked via `@upstash/redis` mock in setup
- E2E: Use local Redis or Upstash test instance

---

## Test Commands Reference

### Package.json Scripts
```json
{
  "test": "vitest run",
  "test:watch": "vitest",
  "test:unit": "vitest run tests/unit",
  "test:integration": "vitest run tests/integration",
  "test:e2e": "playwright test",
  "test:coverage": "vitest run --coverage",
  "test:ui": "vitest --ui"
}
```

### Vitest Commands
```bash
# Run all tests
npx vitest run

# Run with coverage
npx vitest run --coverage

# Run specific file
npx vitest run tests/unit/services/aiAnalysis.test.ts

# Run with pattern
npx vitest run --testNamePattern="analyzeError"

# Watch mode
npx vitest

# UI mode
npx vitest --ui
```

### Playwright Commands
```bash
# Run all E2E tests
npx playwright test

# Run specific test file
npx playwright test tests/e2e/auth.spec.ts

# Run with headed browser
npx playwright test --headed

# Run with specific project
npx playwright test --project=chromium

# Debug mode
npx playwright test --debug

# Generate trace
npx playwright test --trace on

# Show report
npx playwright show-report
```

---

## CI/CD Environment

### GitHub Actions Services
The CI pipeline uses these service containers:

```yaml
services:
  postgres:
    image: postgres:15-alpine
    env:
      POSTGRES_DB: test_db
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports: ['5432:5432']
    options: >-
      --health-cmd "pg_isready -U postgres"
      --health-interval 10s
      --health-timeout 5s
      --health-retries 5

  redis:
    image: redis:7-alpine
    ports: ['6379:6379']
    options: --health-cmd "redis-cli ping" --health-interval 10s --health-timeout 5s --health-retries 5
```

### Coverage Thresholds (Enforced in CI)
| Metric | Unit Tests | Integration Tests |
|--------|-----------|-------------------|
| Lines | 80% | 70% |
| Branches | 80% | 70% |
| Functions | 80% | - |
| Statements | 80% | 70% |

---

## Test Data Management

### Fixtures
Located in `src/test/factories/`:
- `user.factory.ts` - User scenarios (free, pro, admin, past_due, etc.)
- `analysis.factory.ts` - Analysis with various error types
- `subscription.factory.ts` - Subscription states (active, canceled, past_due, etc.)
- `plan.factory.ts` - Plan tiers (free, starter, pro, business, enterprise)

### Creating Test Data
```typescript
import { createProUser, createAnalysis, createActiveSubscription } from '@/test/factories'

// In tests
const user = createProUser({ email: 'test@example.com' })
const analysis = createAnalysis({ userId: user.id, errorType: 'TypeError' })
const subscription = createActiveSubscription(user.id)
```

### Seeding Database
```bash
# Run seed script
npm run db:seed

# Or programmatically
import { seedTestDatabase } from '@/tests/setup/seed'
await seedTestDatabase()
```

---

## Debugging Tests

### Unit/Integration Tests
```bash
# Run single test with verbose output
npx vitest run tests/unit/services/aiAnalysis.test.ts --reporter=verbose

# Debug with Node inspector
node --inspect-brk node_modules/.bin/vitest run tests/unit/services/aiAnalysis.test.ts

# VS Code launch.json
{
  "type": "node",
  "request": "launch",
  "name": "Debug Vitest",
  "program": "${workspaceFolder}/node_modules/.bin/vitest",
  "args": ["run", "tests/unit/services/aiAnalysis.test.ts"],
  "console": "integratedTerminal"
}
```

### E2E Tests
```bash
# Headed mode (see browser)
npx playwright test --headed

# Debug mode (step through)
npx playwright test --debug tests/e2e/auth.spec.ts

# Trace viewer
npx playwright test --trace on
npx playwright show-trace test-results/trace.zip

# Slow motion
npx playwright test --slowmo=1000
```

### Common Issues

| Issue | Solution |
|-------|----------|
| Tests timeout | Increase `testTimeout` in vitest.config.ts |
| Port 3000 in use | Kill existing process: `lsof -ti:3000 \| xargs kill -9` |
| Database connection failed | Check PostgreSQL is running and DATABASE_URL is correct |
| Module not found | Check `moduleNameMapper` / `resolve.alias` in vitest.config.ts |
| Mock not working | Ensure mock is in setup file and `vi.mock()` is called |
| E2E test flaky | Add `await page.waitForLoadState('networkidle')` |

---

## Staging Environment

### Deployment
```bash
# Deploy to staging (Vercel example)
vercel --prod=false

# Or Docker
docker build -t api-error-lookup:staging .
docker run -d -p 3000:3000 --env-file .env.staging api-error-lookup:staging
```

### Staging-Specific Config
```env
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://staging.api-error-lookup.com
DATABASE_URL=postgresql://staging_user:pass@staging-db:5432/staging
STRIPE_SECRET_KEY=sk_test_staging_key
STRIPE_WEBHOOK_SECRET=whsec_staging
OLLAMA_BASE_URL=https://ollama-staging.internal/v1
UPSTASH_REDIS_REST_URL=https://staging-redis.upstash.io
```

### Running Tests Against Staging
```bash
# Set staging URL
export PLAYWRIGHT_BASE_URL=https://staging.api-error-lookup.com

# Run E2E tests
npm run test:e2e
```

---

## Performance Testing (k6)

### Basic Load Test
```bash
# Install k6
# Run script
k6 run scripts/load-test.js
```

### Load Test Script Template
```javascript
// scripts/load-test.js
import http from 'k6/http'
import { check, sleep } from 'k6'

export const options = {
  stages: [
    { duration: '30s', target: 10 },
    { duration: '1m', target: 50 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'],
    http_req_failed: ['rate<0.01'],
  },
}

export default function () {
  const res = http.post('https://staging.api-error-lookup.com/api/analyze', {
    errorMessage: 'Test error for load testing',
  })
  
  check(res, {
    'status is 200': (r) => r.status === 200,
    'response has analysis': (r) => r.json().analysis !== undefined,
  })
  
  sleep(1)
}
```

---

## Maintenance

### Updating Dependencies
```bash
# Check outdated
npm outdated

# Update test dependencies
npm update vitest @playwright/test @testing-library/react @faker-js/faker msw

# Update and test
npm install && npm run test
```

### Adding New Test Files
1. Create test file in appropriate directory:
   - `tests/unit/` - Unit tests
   - `tests/integration/` - Integration tests
   - `tests/e2e/` - E2E tests
2. Follow naming convention: `*.test.ts` or `*.spec.ts`
3. Import from `@/test/utils` for helpers
4. Use factories from `@/test/factories`

### Cleaning Up
```bash
# Clear test artifacts
rm -rf coverage/ test-results/ .vitest/

# Clear node_modules and reinstall
rm -rf node_modules/ && npm install

# Clear Docker test containers
docker stop test-postgres test-redis && docker rm test-postgres test-redis
```

---

*Last Updated: 2026-10-21*
*Version: 1.0*