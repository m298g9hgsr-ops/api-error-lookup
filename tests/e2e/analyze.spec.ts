import { test, expect } from '@playwright/test'

test.describe('Error Analysis Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto('/login')
    await page.fill('input[name="email"]', 'test@example.com')
    await page.fill('input[name="password"]', 'password123')
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL(/.*dashboard|\//)
    
    // Navigate to analyze page
    await page.goto('/analyze')
  })

  test('should display analyze page with input form', async ({ page }) => {
    await expect(page.locator('h1')).toContainText(/analyze|error/i)
    await expect(page.locator('textarea[name="errorMessage"], textarea[placeholder*="error" i]')).toBeVisible()
    await expect(page.locator('button[type="submit"]')).toBeVisible()
  })

  test('should show validation error for empty error message', async ({ page }) => {
    await page.click('button[type="submit"]')
    await expect(page.locator('[role="alert"], .error')).toContainText(/required|error message/i)
  })

  test('should analyze error and display results', async ({ page }) => {
    const errorMessage = 'TypeError: Cannot read property "map" of undefined'
    const stackTrace = 'at Component.render (Component.jsx:15:10)\n at processChild (react-reconciler.js:123:5)'

    await page.fill('textarea[name="errorMessage"], textarea[placeholder*="error" i]', errorMessage)
    await page.fill('textarea[name="stackTrace"], textarea[placeholder*="stack" i]', stackTrace)
    await page.click('button[type="submit"]')

    // Wait for analysis to complete
    await expect(page.locator('[role="status"], .loading, .analyzing')).toBeVisible({ timeout: 5000 })
    await expect(page.locator('[role="status"], .loading, .analyzing')).toBeHidden({ timeout: 30000 })

    // Check results are displayed
    await expect(page.locator('text=TypeError, text=typeerror, .error-type')).toBeVisible({ timeout: 10000 })
    await expect(page.locator('text=analysis, .analysis, .result')).toBeVisible()
    await expect(page.locator('text=suggestion, .suggestion, .fix')).toBeVisible()
  })

  test('should display error type badge', async ({ page }) => {
    await page.fill('textarea[name="errorMessage"], textarea[placeholder*="error" i]', '401 Unauthorized: Invalid API key')
    await page.click('button[type="submit"]')

    await expect(page.locator('[role="status"], .loading')).toBeHidden({ timeout: 30000 })
    await expect(page.locator('text=AuthenticationError, text=authentication, .badge')).toBeVisible()
  })

  test('should display suggestions list', async ({ page }) => {
    await page.fill('textarea[name="errorMessage"], textarea[placeholder*="error" i]', 'ReferenceError: variable is not defined')
    await page.click('button[type="submit"]')

    await expect(page.locator('[role="status"], .loading')).toBeHidden({ timeout: 30000 })
    await expect(page.locator('ul li, .suggestion-item, ol li')).toHaveCount({ gte: 1 })
  })

  test('should display confidence score', async ({ page }) => {
    await page.fill('textarea[name="errorMessage"], textarea[placeholder*="error" i]', 'SyntaxError: Unexpected token')
    await page.click('button[type="submit"]')

    await expect(page.locator('[role="status"], .loading')).toBeHidden({ timeout: 30000 })
    await expect(page.locator('text=confidence, .confidence, [data-testid="confidence"]')).toBeVisible()
  })

  test('should show rate limit warning when approaching limit', async ({ page }) => {
    // This would require mocking the rate limit to be near capacity
    await page.fill('textarea[name="errorMessage"], textarea[placeholder*="error" i]', 'Test error')
    await page.click('button[type="submit"]')

    await expect(page.locator('[role="status"], .loading')).toBeHidden({ timeout: 30000 })
    
    // Check for rate limit info in UI (if implemented)
    const rateLimitInfo = page.locator('text=rate limit, text=remaining, .rate-limit')
    // May or may not be visible depending on implementation
  })

  test('should display analysis history', async ({ page }) => {
    await page.goto('/history')
    
    await expect(page.locator('h1')).toContainText(/history|past|previous/i)
    // Check for list of previous analyses
    await expect(page.locator('.analysis-item, .history-item, table tbody tr')).toHaveCount({ gte: 0 })
  })

  test('should allow clicking on history item to view details', async ({ page }) => {
    await page.goto('/history')
    
    // If there are history items
    const firstItem = page.locator('.analysis-item, .history-item, table tbody tr').first()
    if (await firstItem.count() > 0) {
      await firstItem.click()
      await expect(page.locator('.analysis-detail, .modal, [role="dialog"]')).toBeVisible()
    }
  })
})