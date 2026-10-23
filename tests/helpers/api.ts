import { NextRequest } from 'next/server'

/**
 * Create a mock NextRequest for testing API routes
 */
export function createMockRequest(
  body: unknown,
  options: {
    method?: string
    headers?: Record<string, string>
    url?: string
  } = {}
): NextRequest {
  const { method = 'POST', headers = {}, url = 'http://localhost:3000/api/test' } = options
  
  return new NextRequest(url, {
    method,
    body: JSON.stringify(body),
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  })
}

/**
 * Create a mock GET request
 */
export function createMockGetRequest(
  url: string = 'http://localhost:3000/api/test',
  headers: Record<string, string> = {}
): NextRequest {
  return new NextRequest(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  })
}

/**
 * Parse response from API route handler
 */
export async function parseResponse(response: Response) {
  const data = await response.json()
  return {
    status: response.status,
    headers: Object.fromEntries(response.headers.entries()),
    data,
  }
}

/**
 * Create mock session for testing
 */
export function createMockSession(user: {
  id: string
  email: string
  name?: string
  role?: string
} = {
  id: 'user_123',
  email: 'test@example.com',
  name: 'Test User',
  role: 'USER',
}) {
  return {
    user,
    expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  }
}

/**
 * Create mock auth headers
 */
export function createAuthHeaders(session: ReturnType<typeof createMockSession>) {
  // In a real app, this would be the session cookie or JWT
  return {
    'Authorization': `Bearer mock-token-${session.user.id}`,
    'Cookie': `next-auth.session-token=mock-session-${session.user.id}`,
  }
}