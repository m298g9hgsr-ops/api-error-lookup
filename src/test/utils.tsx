import React from 'react'
import { render, RenderOptions, RenderResult } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { SessionProvider } from 'next-auth/react'
import { expect } from 'vitest'
import '@testing-library/jest-dom/vitest'

interface TestWrapperProps {
  children: React.ReactNode
  session?: {
    user?: {
      id: string
      email: string
      name?: string
      role?: string
    }
    expires: string
  } | null
}

/**
 * Custom render function with all necessary providers
 */
export function renderWithProviders(
  ui: React.ReactElement,
  options: Partial<TestWrapperProps> & Omit<RenderOptions, 'wrapper'> = {}
): RenderResult {
  const { session = null, children: _children, ...renderOptions } = options

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  })

  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <QueryClientProvider client={queryClient}>
      <SessionProvider session={session}>
        {children}
      </SessionProvider>
    </QueryClientProvider>
  )

  return render(ui, {
    wrapper: Wrapper,
    ...renderOptions,
  })
}

/**
 * Create a mock session for testing
 */
export function createMockSession(overrides: Partial<{
  user: {
    id: string
    email: string
    name?: string
    role?: string
  }
  expires: string
}> = {}) {
  return {
    user: {
      id: 'user_123',
      email: 'test@example.com',
      name: 'Test User',
      role: 'USER',
      ...overrides.user,
    },
    expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    ...overrides,
  }
}

/**
 * Create a mock user object
 */
export function createMockUser(overrides: Partial<{
  id: string
  email: string
  name: string
  role: string
  stripeCustomerId: string | null
  stripeSubscriptionId: string | null
  stripePriceId: string | null
}> = {}) {
  return {
    id: 'user_123',
    email: 'test@example.com',
    name: 'Test User',
    passwordHash: 'hashed_password',
    role: 'USER',
    stripeCustomerId: null,
    stripeSubscriptionId: null,
    stripePriceId: null,
    stripeCurrentPeriodEnd: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

/**
 * Wait for async operations to complete
 */
export async function waitFor(ms: number = 0): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Mock form data
 */
export function createFormData(data: Record<string, string | File>): FormData {
  const formData = new FormData()
  Object.entries(data).forEach(([key, value]) => {
    formData.append(key, value)
  })
  return formData
}

/**
 * Mock request/response helpers
 */
export function createMockRequest(
  body: unknown,
  options: {
    method?: string
    headers?: Record<string, string>
    url?: string
  } = {}
) {
  const { method = 'POST', headers = {}, url = 'http://localhost:3000/api/test' } = options
  
  return new Request(url, {
    method,
    body: JSON.stringify(body),
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  })
}

export async function parseResponse(response: Response) {
  const data = await response.json()
  return {
    status: response.status,
    headers: Object.fromEntries(response.headers.entries()),
    data,
  }
}

/**
 * Test ID helpers
 */
export const testIds = {
  // Auth
  loginForm: 'login-form',
  emailInput: 'email-input',
  passwordInput: 'password-input',
  submitButton: 'submit-button',
  logoutButton: 'logout-button',
  registerLink: 'register-link',
  
  // Dashboard
  dashboard: 'dashboard',
  currentPlan: 'current-plan',
  usageStats: 'usage-stats',
  billingLink: 'billing-link',
  
  // Analyze
  analyzePage: 'analyze-page',
  errorMessageInput: 'error-message-input',
  stackTraceInput: 'stack-trace-input',
  analyzeButton: 'analyze-button',
  loadingIndicator: 'loading-indicator',
  analysisResult: 'analysis-result',
  errorTypeBadge: 'error-type-badge',
  suggestionsList: 'suggestions-list',
  confidenceScore: 'confidence-score',
  
  // Pricing
  pricingPage: 'pricing-page',
  freePlanCard: 'free-plan-card',
  proPlanCard: 'pro-plan-card',
  enterprisePlanCard: 'enterprise-plan-card',
  subscribeButton: 'subscribe-button',
  
  // History
  historyPage: 'history-page',
  analysisItem: 'analysis-item',
  analysisDetail: 'analysis-detail',
  
  // Toast/Alerts
  toast: 'toast',
  toastSuccess: 'toast-success',
  toastError: 'toast-error',
  toastInfo: 'toast-info',
  
  // Common
  errorAlert: 'error-alert',
  successAlert: 'success-alert',
  loadingSpinner: 'loading-spinner',
} as const

/**
 * Assertion helpers
 */
export function expectToBeVisible(element: HTMLElement | null) {
  expect(element).toBeInTheDocument()
  expect(element).toBeVisible()
}

export function expectToHaveText(element: HTMLElement | null, text: string | RegExp) {
  expectToBeVisible(element)
  if (typeof text === 'string') {
    expect(element).toHaveTextContent(text)
  } else {
    expect(element).toHaveTextContent(text)
  }
}

export function expectToHaveAttribute(element: HTMLElement | null, attr: string, value?: string) {
  expectToBeVisible(element)
  expect(element).toHaveAttribute(attr, value)
}

/**
 * Accessibility helpers
 */
export function expectToBeAccessible(element: HTMLElement | null) {
  expectToBeVisible(element)
  // Add more a11y checks as needed
}

export * from '@testing-library/react'
export { renderWithProviders as render }