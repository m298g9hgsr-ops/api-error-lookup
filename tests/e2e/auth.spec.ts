import { test, expect } from '@playwright/test'

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
    // Wait for page to load
    await page.waitForLoadState('networkidle')
  })

  test('should display login form with all required fields', async ({ page }) => {
    await expect(page.locator('h1')).toContainText(/sign in|login/i)
    await expect(page.locator('input[name="email"], input[type="email"]')).toBeVisible()
    await expect(page.locator('input[name="password"], input[type="password"]')).toBeVisible()
    await expect(page.locator('button[type="submit"]')).toBeVisible()
  })

  test('should show validation errors for empty fields', async ({ page }) => {
    await page.click('button[type="submit"]')
    
    // Check for validation messages
    const errorMessages = page.locator('[role="alert"], .error, .text-red, .text-destructive')
    await expect(errorMessages.first()).toBeVisible({ timeout: 5000 })
  })

  test('should show validation error for invalid email format', async ({ page }) => {
    await page.fill('input[name="email"], input[type="email"]', 'invalid-email')
    await page.fill('input[name="password"], input[type="password"]', 'password123')
    await page.click('button[type="submit"]')
    
    const errorMessages = page.locator('[role="alert"], .error, .text-red, .text-destructive')
    await expect(errorMessages.first()).toContainText(/invalid|email/i)
  })

  test('should show error for invalid credentials', async ({ page }) => {
    await page.fill('input[name="email"], input[type="email"]', 'wrong@example.com')
    await page.fill('input[name="password"], input[type="password"]', 'wrongpassword')
    await page.click('button[type="submit"]')
    
    const errorMessages = page.locator('[role="alert"], .error, .text-red, .text-destructive, .toast')
    await expect(errorMessages.first()).toContainText(/invalid|incorrect|wrong|failed/i)
  })

  test('should login successfully with valid credentials', async ({ page }) => {
    // Use test credentials that should work in test environment
    await page.fill('input[name="email"], input[type="email"]', 'test@example.com')
    await page.fill('input[name="password"], input[type="password"]', 'password123')
    await page.click('button[type="submit"]')
    
    // Should redirect to dashboard or home
    await expect(page).toHaveURL(/\/(dashboard|$)/, { timeout: 10000 })
  })

  test('should persist session after page reload', async ({ page }) => {
    await page.fill('input[name="email"], input[type="email"]', 'test@example.com')
    await page.fill('input[name="password"], input[type="password"]', 'password123')
    await page.click('button[type="submit"]')
    
    await expect(page).toHaveURL(/\/(dashboard|$)/, { timeout: 10000 })
    
    // Reload and verify still logged in
    await page.reload()
    await expect(page).toHaveURL(/\/(dashboard|$)/)
    
    // Check for user indicator
    const userIndicator = page.locator('text=Welcome, text=Test User, [data-testid="user-menu"], button:has-text("Test User")')
    await expect(userIndicator.first()).toBeVisible({ timeout: 5000 })
  })

  test('should logout successfully', async ({ page }) => {
    await page.fill('input[name="email"], input[type="email"]', 'test@example.com')
    await page.fill('input[name="password"], input[type="password"]', 'password123')
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL(/\/(dashboard|$)/, { timeout: 10000 })
    
    // Find and click logout
    const logoutButton = page.locator('button:has-text("Logout"), a:has-text("Logout"), [data-testid="logout-button"]')
    if (await logoutButton.count() > 0) {
      await logoutButton.first().click()
    } else {
      // Try user menu
      const userMenu = page.locator('[data-testid="user-menu"], button:has-text("Test User")').first()
      if (await userMenu.count() > 0) {
        await userMenu.click()
        await page.locator('button:has-text("Logout"), a:has-text("Logout")').first().click()
      }
    }
    
    // Should redirect to login or home
    await expect(page).toHaveURL(/.*login|\//, { timeout: 5000 })
    await expect(page.locator('input[name="email"], input[type="email"]')).toBeVisible()
  })

  test('should redirect to login when accessing protected route', async ({ page }) => {
    await page.goto('/dashboard')
    
    // Should be redirected to login
    await expect(page).toHaveURL(/.*login/, { timeout: 5000 })
  })

  test('should show register link', async ({ page }) => {
    const registerLink = page.locator('a:has-text("Register"), a:has-text("Sign up"), a[href*="register"]')
    await expect(registerLink.first()).toBeVisible()
  })

  test('should navigate to register page', async ({ page }) => {
    const registerLink = page.locator('a:has-text("Register"), a:has-text("Sign up"), a[href*="register"]').first()
    await registerLink.click()
    await expect(page).toHaveURL(/.*register/)
  })
})