# Release Checklist - api-error-lookup

## Overview
This checklist ensures all quality gates are met before deploying to production.

---

## Pre-Release Checks

### 📋 Code Quality
- [ ] All TypeScript compilation passes (`npx tsc --noEmit`)
- [ ] ESLint passes with 0 errors (`npm run lint`)
- [ ] Prettier formatting applied (`npx prettier --write .`)
- [ ] No `console.log` or `debugger` statements in production code
- [ ] No TODO/FIXME comments without linked issues

### 🧪 Testing
- [ ] **Unit Tests**: ≥ 80% coverage (lines, branches, functions, statements)
  - [ ] `npm run test:unit -- --coverage` passes
- [ ] **Integration Tests**: ≥ 70% coverage (lines, branches)
  - [ ] `npm run test:integration` passes with test database
- [ ] **E2E Tests**: 100% core user paths pass
  - [ ] `npm run test:e2e` passes against staging
  - [ ] Auth flow: login, logout, session persistence, protected routes
  - [ ] Analysis flow: error input, results display, history
  - [ ] Subscription flow: pricing, checkout, portal, dashboard
- [ ] **Cross-browser**: Tests pass on Chromium, Firefox, WebKit
- [ ] **Mobile**: Tests pass on Mobile Chrome, Mobile Safari

### 🏗️ Build & Deploy
- [ ] Production build succeeds (`npm run build`)
- [ ] Build artifacts verified (`.next/` directory exists)
- [ ] Docker image builds successfully (`docker build -t api-error-lookup .`)
- [ ] Docker image passes health check (`curl /api/health`)
- [ ] Environment variables documented and set in target environment
- [ ] Database migrations ready (`npm run db:migrate deploy`)

### 🔒 Security
- [ ] `npm audit` shows no high/critical vulnerabilities
- [ ] Snyk scan passes (if configured)
- [ ] No secrets in code (API keys, passwords, tokens)
- [ ] Dependencies updated to latest secure versions
- [ ] Content Security Policy headers configured
- [ ] Rate limiting enabled on all API endpoints
- [ ] Authentication/authorization tested on all protected routes

### 📊 Monitoring & Observability
- [ ] Health check endpoint responds (`/api/health`)
- [ ] Error tracking configured (Sentry/equivalent)
- [ ] Analytics tracking verified (PostHog/equivalent)
- [ ] Logging structured and non-sensitive
- [ ] Alerts configured for:
  - [ ] High error rates (> 1%)
  - [ ] Slow response times (> 2s p95)
  - [ ] Database connection failures
  - [ ] Payment webhook failures

---

## Staging Validation (Pre-Production)

### 🚀 Deploy to Staging
- [ ] Deploy latest main branch to staging environment
- [ ] Run smoke tests against staging
- [ ] Verify all external integrations:
  - [ ] Ollama AI service reachable
  - [ ] Stripe test mode working
  - [ ] Database connections healthy
  - [ ] Redis/Upstash connections healthy
  - [ ] Email service (Resend) working

### 🔥 Smoke Tests (Manual)
- [ ] **Home page** loads without errors
- [ ] **Login/Register** flow works end-to-end
- [ ] **Dashboard** shows user data correctly
- [ ] **Error Analysis**:
  - [ ] Submit TypeError → get analysis
  - [ ] Submit Auth error → get analysis
  - [ ] View history → see previous analyses
  - [ ] Click history item → see details
- [ ] **Subscription**:
  - [ ] View pricing page
  - [ ] Click Pro plan → Stripe checkout
  - [ ] Complete test checkout → success page
  - [ ] Access billing portal
- [ ] **Rate Limiting**:
  - [ ] Free user hits limit → gets 429
  - [ ] Upgrade prompt shows
- [ ] **Responsive**: Works on mobile viewport
- [ ] **Performance**: Pages load < 3s

---

## Database Migration Checklist

### 📦 Pre-Migration
- [ ] Migration files reviewed and tested locally
- [ ] Backup staging database before migration
- [ ] Backup production database before migration
- [ ] Migration is backward compatible (if possible)
- [ ] Rollback plan documented

### 🔄 Migration Execution
- [ ] Run migrations on staging first
- [ ] Verify data integrity post-migration
- [ ] Run migrations on production during low-traffic window
- [ ] Verify production data integrity
- [ ] Monitor for errors 30 min post-migration

---

## Rollback Plan

### ⚡ Quick Rollback (< 5 min)
```bash
# Revert to previous Docker image
docker tag api-error-lookup:previous api-error-lookup:latest
docker-compose up -d

# Or if using Vercel
vercel rollback [deployment-url]
```

### 🔧 Database Rollback
```bash
# If migration was run
npm run db:migrate resolve --rolled-back <migration-name>
# Then redeploy previous version
```

### 📞 Communication
- [ ] Team notified of rollback
- [ ] Status page updated
- [ ] Incident document created

---

## Post-Release Validation (First 30 min)

- [ ] Health check passing
- [ ] Error rate < 0.1%
- [ ] Response times normal
- [ ] Database connections stable
- [ ] No new errors in logs
- [ ] Key user flows working (login → analyze → dashboard)
- [ ] Payment webhooks processing
- [ ] Background jobs running

---

## Release Sign-off

| Role | Name | Approval | Date |
|------|------|----------|------|
| QA Lead | | ☐ | |
| Engineering Lead | | ☐ | |
| Product Owner | | ☐ | |
| DevOps/SRE | | ☐ | |

---

## Version Tagging
```bash
# After successful release
git tag -a v1.2.3 -m "Release v1.2.3"
git push origin v1.2.3
```

---

## Emergency Contacts

| Service | Contact | Escalation |
|---------|---------|------------|
| Database | | |
| Stripe | | |
| Ollama/AI | | |
| Hosting | | |
| Monitoring | | |

---

*Last Updated: 2026-10-21*
*Version: 1.0*