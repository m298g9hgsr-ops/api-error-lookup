const API_BASE = process.env.NEXT_PUBLIC_API_BASE || '/api';

class ApiError extends Error {
  public readonly status: number;
  public readonly code: string;
  public readonly data?: unknown;

  constructor(message: string, status: number, code: string, data?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.data = data;
  }

  static fromResponse(response: Response, data: unknown): ApiError {
    const message = (data as { error?: string })?.error || `HTTP ${response.status}`;
    const code = (data as { code?: string })?.code || 'API_ERROR';
    return new ApiError(message, response.status, code, data);
  }
}

async function getAuthToken(): Promise<string | null> {
  if (typeof window === 'undefined') return null;
  
  // Try to get token from next-auth session
  try {
    const res = await fetch('/api/auth/session');
    if (res.ok) {
      const session = await res.json();
      return session?.accessToken || session?.user?.id || null;
    }
  } catch {
    // Ignore errors
  }
  return null;
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await getAuthToken();
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  const contentType = response.headers.get('content-type');
  const isJson = contentType?.includes('application/json');
  const data = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    throw ApiError.fromResponse(response, data);
  }

  return data as T;
}

export const apiClient = {
  // Analysis
  analyzeError: (input: import('@/lib/validators').AnalyzeInput) =>
    request<import('@/lib/validators').AnalyzeResponse>('/analyze', {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  getHistory: (params: import('@/lib/validators').HistoryParams) => {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.append(key, String(value));
      }
    });
    return request<import('@/lib/validators').PaginatedAnalysis>(`/error-history?${searchParams}`);
  },

  getAnalysis: (id: string) =>
    request<import('@/lib/validators').Analysis>(`/error-history/${id}`),

  deleteAnalysis: (id: string) =>
    request<void>(`/error-history/${id}`, { method: 'DELETE' }),

  // Usage / Subscription
  getUsage: () =>
    request<import('@/lib/validators').UsageResponse>('/usage'),

  getSubscription: () =>
    request<import('@/lib/validators').SubscriptionStatus>('/subscription'),

  createCheckoutSession: (input: import('@/lib/validators').CreateCheckoutSessionInput) =>
    request<import('@/lib/validators').CreateCheckoutSessionResponse>('/stripe/checkout', {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  openBillingPortal: () =>
    request<import('@/lib/validators').BillingPortalResponse>('/stripe/portal', {
      method: 'POST',
    }),

  getInvoices: () =>
    request<import('@/lib/validators').InvoicesResponse>('/stripe/invoices'),

  // Patterns
  getPatterns: (params: import('@/lib/validators').PatternParams) => {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.append(key, String(value));
      }
    });
    return request<import('@/lib/validators').PaginatedPatterns>(`/patterns?${searchParams}`);
  },

  // Auth
  register: (input: import('@/lib/validators').RegisterInput) =>
    request<{ user: { id: string; email: string; name: string | null } }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  login: (input: import('@/lib/validators').LoginInput) =>
    request<{ user: { id: string; email: string; name: string | null } }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  forgotPassword: (input: import('@/lib/validators').ForgotPasswordInput) =>
    request<void>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  resetPassword: (input: import('@/lib/validators').ResetPasswordInput) =>
    request<void>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  changePassword: (input: import('@/lib/validators').ChangePasswordInput) =>
    request<void>('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
};

export { ApiError };