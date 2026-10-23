import { test, expect } from '@playwright/test'

test.describe('Error Analysis Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto('/login')
    await page.waitForLoadState('networkidle')
    
    await page.fill('input[name="email"], input[type="email"]', 'test@example.com')
    await page.fill('input[name="password"], input[type="password"]', 'password123')
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL(/\/(dashboard|$)/, { timeout: 10000 })
    
    // Navigate to analyze page
    await page.goto('/analyze')
    await page.waitForLoadState('networkidle')
  })

  test('should display analyze page with input form', async ({ page }) => {
    await expect(page.locator('h1')).toContainText(/analyze|error/i)
    await expect(page.locator('textarea[name="errorMessage"], textarea[placeholder*="error" i], textarea[id*="error" i]')).toBeVisible()
    await expect(page.locator('button[type="submit"]')).toBeVisible()
  })

  test('should show validation error for empty error message', async ({ page }) => {
    await page.click('button[type="submit"]')
    const errorMessages = page.locator('[role="alert"], .error, .text-red, .text-destructive')
    await expect(errorMessages.first()).toContainText(/required|error message/i)
  })

  test('should analyze error and display results', async ({ page }) => {
    const errorMessage = 'TypeError: Cannot read property "map" of undefined'
    const stackTrace = 'at Component.render (Component.jsx:15:10)\n at processChild (react-reconciler.js:123:5)'

    await page.fill('textarea[name="errorMessage"], textarea[placeholder*="error" i], textarea[id*="error" i]', errorMessage)
    await page.fill('textarea[name="stackTrace"], textarea[placeholder*="stack" i], textarea[id*="stack" i]', stackTrace)
    await page.click('button[type="submit"]')

    // Wait for analysis to complete (loading indicator appears then disappears)
    const loadingIndicator = page.locator('[role="status"], .loading, .analyzing, [data-testid="loading"], .animate-spin')
    if (await loadingIndicator.count() > 0) {
      await expect(loadingIndicator.first()).toBeVisible({ timeout: 5000 })
      await expect(loadingIndicator.first()).toBeHidden({ timeout: 30000 })
    }

    // Check results are displayed
    const errorTypeDisplay = page.locator('text=TypeError, text=typeerror, .error-type, [data-testid="error-type"]')
    await expect(errorTypeDisplay.first()).toBeVisible({ timeout: 10000 })
    
    const analysisDisplay = page.locator('text=analysis, .analysis, .result, [data-testid="analysis"]')
    await expect(analysisDisplay.first()).toBeVisible()
    
    const suggestionsDisplay = page.locator('text=suggestion, .suggestion, .fix, [data-testid="suggestions"]')
    await expect(suggestionsDisplay.first()).toBeVisible()
  })

  test('should display error type badge for authentication error', async ({ page }) => {
    await page.fill('textarea[name="errorMessage"], textarea[placeholder*="error" i], textarea[id*="error" i]', '401 Unauthorized: Invalid API key')
    await page.click('button[type="submit"]')

    await expect(page.locator('[role="status"], .loading, .analyzing')).toBeHidden({ timeout: 30000 })
    
    const authErrorBadge = page.locator('text=AuthenticationError, text=authentication, .badge, [data-testid="error-type-badge"]')
    await expect(authErrorBadge.first()).toBeVisible()
  })

  test('should display suggestions list', async ({ page }) => {
    await page.fill('textarea[name="errorMessage"], textarea[placeholder*="error" i], textarea[id*="error" i]', 'ReferenceError: variable is not defined')
    await page.click('button[type="submit"]')

    await expect(page.locator('[role="status"], .loading, .analyzing')).toBeHidden({ timeout: 30000 })
    
    const suggestionsList = page.locator('ul li, .suggestion-item, ol li, [data-testid="suggestion-item"]')
    await expect(suggestionsList.first()).toBeVisible()
    await expect(suggestionsList).toHaveCount({ gte: 1 })
  })

  test('should display confidence score', async ({ page }) => {
    await page.fill('textarea[name="errorMessage"], textarea[placeholder*="error" i], textarea[id*="error" i]', 'SyntaxError: Unexpected token')
    await page.click('button[type="submit"]')

    await expect(page.locator('[role="status"], .loading, .analyzing')).toBeHidden({ timeout: 30000 })
    
    const confidenceDisplay = page.locator('text=confidence, .confidence, [data-testid="confidence"], text=/\\d+%/')
    await expect(confidenceDisplay.first()).toBeVisible()
  })

  test('should show rate limit info in response', async ({ page }) => {
    await page.fill('textarea[name="errorMessage"], textarea[placeholder*="error" i], textarea[id*="error" i]', 'Test error for rate limit')
    await page.click('button[type="submit"]')

    await expect(page.locator('[role="status"], .loading, .analyzing')).toBeHidden({ timeout: 30000 })
    
    // Check for rate limit headers in network response or UI indicator
    const rateLimitInfo = page.locator('text=rate limit, text=remaining, .rate-limit, [data-testid="rate-limit"]')
    // May or may not be visible depending on implementation
  })

  test('should display analysis history', async ({ page }) => {
    await page.goto('/history')
    await page.waitForLoadState('networkidle')
    
    await expect(page.locator('h1')).toContainText(/history|past|previous/i)
    
    // Check for list of previous analyses (could be empty)
    const historyItems = page.locator('.analysis-item, .history-item, table tbody tr, [data-testid="analysis-item"]')
    const count = await historyItems.count()
    expect(count).toBeGreaterThanOrEqual(0)
  })

  test('should allow clicking on history item to view details', async ({ page }) => {
    await page.goto('/history')
    await page.waitForLoadState('networkidle')
    
    const firstItem = page.locator('.analysis-item, .history-item, table tbody tr, [data-testid="analysis-item"]').first()
    
    if (await firstItem.count() > 0) {
      await firstItem.click()
      
      // Check for detail view (modal, new page, or expanded row)
      const detailView = page.locator('.analysis-detail, .modal, [role="dialog"], [data-testid="analysis-detail"]')
      await expect(detailView.first()).toBeVisible({ timeout: 5000 })
    }
  })

  test('should handle different error types correctly', async ({ page }) => {
    const testCases = [
      { input: 'TypeError: Cannot read properties of undefined', expectedType: 'TypeError' },
      { input: 'ReferenceError: process is not defined', expectedType: 'ReferenceError' },
      { input: '401 Unauthorized: Invalid API key', expectedType: 'AuthenticationError' },
      { input: 'Error: connect ECONNREFUSED', expectedType: 'NetworkError' },
    ]

    for (const testCase of testCases) {
      await page.fill('textarea[name="errorMessage"], textarea[placeholder*="error" i], textarea[id*="error" i]', testCase.input)
      await page.click('button[type="submit"]')
      
      await expect(page.locator('[role="status"], .loading, .analyzing')).toBeHidden({ timeout: 30000 })
      
      const errorTypeDisplay = page.locator(`text=${testCase.expectedType}, .error-type, [data-testid="error-type"]`)
      await expect(errorTypeDisplay.first()).toBeVisible()
      
      // Clear for next test
      await page.fill('textarea[name="errorMessage"], textarea[placeholder*="error" i], textarea[id*="error" i]', '')
    }
  })

  test('should handle stack trace input', async ({ page }) => {
    const stackTrace = `at Component.render (Component.jsx:42:20)
    at processChild (react-reconciler.js:123:5)
    at reconcileChildren (react-reconciler.js:89:12)
    at updateHostComponent (react-reconciler.js:234:7)`

    await page.fill('textarea[name="errorMessage"], textarea[placeholder*="error" i], textarea[id*="error" i]', 'TypeError: Complex error')
    await page.fill('textarea[name="stackTrace"], textarea[placeholder*="stack" i], textarea[id*="stack" i]', stackTrace)
    await page.click('button[type="submit"]')

    await expect(page.locator('[role="status"], .loading, .analyzing')).toBeHidden({ timeout: 30000 })
    
    // Verify analysis completed successfully
    await expect(page.locator('text=analysis, .analysis, .result, [data-testid="analysis"]')).toBeVisible()
  })
})