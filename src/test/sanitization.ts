/**
 * Data Sanitization Utilities
 * For removing sensitive data from test outputs, logs, and snapshots
 */

import { User, Analysis, Subscription, Plan } from '@prisma/client'

/**
 * Sanitize user object - remove sensitive fields
 */
export function sanitizeUser(user: User): Omit<User, 'passwordHash'> {
  const { passwordHash, ...sanitized } = user
  return sanitized
}

/**
 * Sanitize multiple users
 */
export function sanitizeUsers(users: User[]): Omit<User, 'passwordHash'>[] {
  return users.map(sanitizeUser)
}

/**
 * Sanitize analysis - remove potentially sensitive error messages in production
 * (In tests, we usually keep them, but this is here for consistency)
 */
export function sanitizeAnalysis(analysis: Analysis, options: { removeErrorMessage?: boolean } = {}): Analysis {
  const { removeErrorMessage = false } = options
  
  if (removeErrorMessage) {
    const { errorInput, stackTrace, ...sanitized } = analysis
    return {
      ...sanitized,
      errorInput: '[REDACTED]',
      stackTrace: stackTrace ? '[REDACTED]' : null,
    }
  }
  
  return { ...analysis }
}

/**
 * Sanitize subscription - remove Stripe IDs in production
 */
export function sanitizeSubscription(subscription: Subscription, options: { removeStripeIds?: boolean } = {}): Subscription {
  const { removeStripeIds = false } = options
  
  if (removeStripeIds) {
    const { stripeCustomerId, stripeSubscriptionId, stripePriceId, ...sanitized } = subscription
    return {
      ...sanitized,
      stripeCustomerId: stripeCustomerId ? '[REDACTED]' : null,
      stripeSubscriptionId: stripeSubscriptionId ? '[REDACTED]' : null,
      stripePriceId: stripePriceId ? '[REDACTED]' : null,
    }
  }
  
  return { ...subscription }
}

/**
 * Sanitize plan - typically safe, but included for consistency
 */
export function sanitizePlan(plan: Plan): Plan {
  return { ...plan }
}

/**
 * Deep sanitize any object - recursively remove sensitive keys
 */
export function deepSanitize<T extends Record<string, unknown>>(
  obj: T,
  sensitiveKeys: string[] = ['password', 'token', 'secret', 'key', 'authorization', 'cookie', 'session']
): T {
  if (!obj || typeof obj !== 'object') return obj
  
  if (Array.isArray(obj)) {
    return obj.map(item => deepSanitize(item, sensitiveKeys)) as unknown as T
  }
  
  const sanitized: Record<string, unknown> = {}
  
  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase()
    const isSensitive = sensitiveKeys.some(sensitive => lowerKey.includes(sensitive))
    
    if (isSensitive) {
      sanitized[key] = '[REDACTED]'
    } else if (value && typeof value === 'object') {
      sanitized[key] = deepSanitize(value as Record<string, unknown>, sensitiveKeys)
    } else {
      sanitized[key] = value
    }
  }
  
  return sanitized as T
}

/**
 * Sanitize API response for snapshot testing
 */
export function sanitizeApiResponse<T>(response: T): T {
  // Remove timestamp fields that change on each run
  const timestampKeys = ['createdAt', 'updatedAt', 'timestamp', 'expires', 'currentPeriodStart', 'currentPeriodEnd']
  
  return deepSanitize(
    response as unknown as Record<string, unknown>,
    [...timestampKeys, 'password', 'token', 'secret', 'key']
  ) as unknown as T
}

/**
 * Create safe test output for CI logs
 */
export function createSafeTestOutput(data: unknown): string {
  return JSON.stringify(sanitizeApiResponse(data), null, 2)
}

/**
 * Mask sensitive string values
 */
export function maskSensitiveValue(value: string, visibleChars: number = 4): string {
  if (!value || value.length <= visibleChars * 2) {
    return '*'.repeat(value?.length || 8)
  }
  
  const start = value.slice(0, visibleChars)
  const end = value.slice(-visibleChars)
  const middle = '*'.repeat(value.length - visibleChars * 2)
  
  return `${start}${middle}${end}`
}

/**
 * Mask email for logging
 */
export function maskEmail(email: string): string {
  const [local, domain] = email.split('@')
  if (!domain) return maskSensitiveValue(email)
  
  const maskedLocal = local.length > 2 
    ? `${local[0]}${'*'.repeat(local.length - 2)}${local[local.length - 1]}`
    : '*'.repeat(local.length)
  
  return `${maskedLocal}@${domain}`
}

/**
 * Sanitize URL by removing query params that might contain secrets
 */
export function sanitizeUrl(url: string): string {
  try {
    const urlObj = new URL(url)
    // Remove sensitive query parameters
    const sensitiveParams = ['token', 'key', 'secret', 'password', 'api_key', 'access_token', 'refresh_token']
    sensitiveParams.forEach(param => urlObj.searchParams.delete(param))
    return urlObj.toString()
  } catch {
    return '[INVALID_URL]'
  }
}

/**
 * Sanitize headers object
 */
export function sanitizeHeaders(headers: Record<string, string>): Record<string, string> {
  const sensitiveHeaders = [
    'authorization',
    'cookie',
    'set-cookie',
    'x-api-key',
    'x-auth-token',
    'proxy-authorization',
  ]
  
  const sanitized: Record<string, string> = {}
  
  for (const [key, value] of Object.entries(headers)) {
    if (sensitiveHeaders.includes(key.toLowerCase())) {
      sanitized[key] = '[REDACTED]'
    } else {
      sanitized[key] = value
    }
  }
  
  return sanitized
}

/**
 * Sanitize environment variables for logging
 */
export function sanitizeEnvVars(env: NodeJS.ProcessEnv): Record<string, string> {
  const sensitiveKeys = [
    'SECRET', 'KEY', 'TOKEN', 'PASSWORD', 'PASS', 'PRIVATE',
    'DATABASE_URL', 'STRIPE', 'OLLAMA', 'REDIS', 'NEXTAUTH',
    'SENTRY', 'POSTHOG', 'RESEND', 'CLERK',
  ]
  
  const sanitized: Record<string, string> = {}
  
  for (const [key, value] of Object.entries(env)) {
    const isSensitive = sensitiveKeys.some(sensitive => key.toUpperCase().includes(sensitive))
    sanitized[key] = isSensitive ? '[REDACTED]' : (value || '')
  }
  
  return sanitized
}