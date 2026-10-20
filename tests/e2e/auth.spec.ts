import { test, expect } from '@playwright/test'

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
  })

  test('should display login form', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Sign In')
    await expect(page.locator('input[name="email"]')).toBeVisible()
    await expect(page.locator('input[name="password"]')).toBeVisible()
    await expect(page.locator('button[type="submit"]')).toBeVisible()
  })

  test('should show error for invalid credentials', async ({ page }) => {
    await page.fill('input[name="email"]', 'wrong@example.com')
    await page.fill('input[name="password"]', 'wrongpassword')
    await page.click('button[type="submit"]')

    await expect(page.locator('[role="alert"], .error, .toast')).toContainText(/invalid|incorrect|wrong/i)
  })

  test('should login successfully with valid credentials', async ({ page }) => {
    await page.fill('input[name="email"]', 'test@example.com')
    await page.fill('input[name="password"]', 'password123')
    await page.click('button[type="submit"]')

    // Should redirect to dashboard or home
    await expect(page).toHaveURL(/.*dashboard|\//)
    await expect(page.locator('text=Welcome, Test User')).toBeVisible()
  })

  test('should persist session after page reload', async ({ page }) => {
    await page.fill('input[name="email"]', 'test@example.com')
    await page.fill('input[name="password"]', 'password123')
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL(/.*dashboard|\//)

    await page.reload()
    await expect(page.locator('text=Welcome, Test User')).toBeVisible()
  })

  test('should logout successfully', async ({ page }) => {
    await page.fill('input[name="email"]', 'test@example.com')
    await page.fill('input[name="password"]', 'password123')
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL(/.*dashboard|\//)

    await page.click('button:has-text("Logout"), a:has-text("Logout")')
    await expect(page).toHaveURL(/.*login|\//)
    await expect(page.locator('input[name="email"]')).toBeVisible()
  })

  test('should redirect to login when accessing protected route', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/.*login/)
  })

  test('should show validation errors for empty fields', async ({ page }) => {
    await page.click('button[type="submit"]')
    await expect(page.locator('[role="alert"], .error')).toContainText(/required|email|password/i)
  })

  test('should show validation error for invalid email format', async ({ page }) => {
    await page.fill('input[name="email"]', 'invalid-email')
    await page.fill('input[name="password"]', 'password123')
    await page.click('button[type="submit"]')

    await expect(page.locator('[role="alert"], .error')).toContainText(/invalid|email/i)
  })
})