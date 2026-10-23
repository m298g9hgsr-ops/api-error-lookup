import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

// In-memory rate limiter for API routes (fallback when Redis unavailable)
const apiRateLimitMap = new Map<string, { count: number; resetAt: number }>();

const API_RATE_LIMIT = 100; // 100 requests per window
const API_RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute window

// Security headers
const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
};

function getRateLimitKey(req: Request): string {
  const forwardedFor = req.headers.get('x-forwarded-for');
  const realIp = req.headers.get('x-real-ip');
  const ip = forwardedFor?.split(',')[0]?.trim() || realIp || 'unknown';
  return `api:${ip}`;
}

function checkApiRateLimit(key: string): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const current = apiRateLimitMap.get(key);
  const windowStart = Math.floor(now / API_RATE_LIMIT_WINDOW_MS) * API_RATE_LIMIT_WINDOW_MS;
  const windowEnd = windowStart + API_RATE_LIMIT_WINDOW_MS;

  if (!current || current.resetAt <= now) {
    apiRateLimitMap.set(key, { count: 0, resetAt: windowEnd });
  }

  const bucket = apiRateLimitMap.get(key)!;
  bucket.count += 1;

  return {
    allowed: bucket.count <= API_RATE_LIMIT,
    remaining: Math.max(0, API_RATE_LIMIT - bucket.count),
    resetAt: bucket.resetAt,
  };
}

function addSecurityHeaders(response: NextResponse): NextResponse {
  Object.entries(securityHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  return response;
}

function addRateLimitHeaders(response: NextResponse, limitInfo: { remaining: number; resetAt: number }): NextResponse {
  response.headers.set('X-RateLimit-Limit', API_RATE_LIMIT.toString());
  response.headers.set('X-RateLimit-Remaining', limitInfo.remaining.toString());
  response.headers.set('X-RateLimit-Reset', Math.ceil(limitInfo.resetAt / 1000).toString());
  return response;
}

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;

    // Handle API routes with rate limiting and security headers
    if (path.startsWith('/api/')) {
      const rateLimitKey = getRateLimitKey(req);
      const rateLimitInfo = checkApiRateLimit(rateLimitKey);

      // Create response with security headers
      let response = NextResponse.next();
      response = addSecurityHeaders(response);
      response = addRateLimitHeaders(response, rateLimitInfo);

      // Block if rate limited
      if (!rateLimitInfo.allowed) {
        return NextResponse.json(
          {
            success: false,
            error: 'Too many requests. Please try again later.',
            rateLimit: {
              limit: API_RATE_LIMIT,
              remaining: 0,
              resetAt: new Date(rateLimitInfo.resetAt).toISOString(),
            },
          },
          {
            status: 429,
            headers: {
              'X-RateLimit-Limit': API_RATE_LIMIT.toString(),
              'X-RateLimit-Remaining': '0',
              'X-RateLimit-Reset': Math.ceil(rateLimitInfo.resetAt / 1000).toString(),
              ...securityHeaders,
            },
          }
        );
      }

      // Handle CORS preflight
      if (req.method === 'OPTIONS') {
        return new NextResponse(null, {
          status: 204,
          headers: {
            'Access-Control-Allow-Origin': process.env.NEXT_PUBLIC_APP_URL || '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            'Access-Control-Max-Age': '86400',
            ...securityHeaders,
          },
        });
      }

      // Add CORS headers for actual requests
      response.headers.set('Access-Control-Allow-Origin', process.env.NEXT_PUBLIC_APP_URL || '*');
      response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

      return response;
    }

    // Protect dashboard routes
    if (path.startsWith('/dashboard')) {
      if (!token) {
        const callbackUrl = encodeURIComponent(req.nextUrl.pathname + req.nextUrl.search);
        return NextResponse.redirect(new URL(`/auth/login?callbackUrl=${callbackUrl}`, req.url));
      }
    }

    // Redirect authenticated users away from auth pages
    if (path.startsWith('/auth/') && token) {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }

    // Add security headers to all responses
    const response = NextResponse.next();
    return addSecurityHeaders(response);
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const path = req.nextUrl.pathname;
        
        // Allow access to auth pages without token
        if (path.startsWith('/auth/')) {
          return true;
        }
        
        // Require token for dashboard
        if (path.startsWith('/dashboard')) {
          return !!token;
        }
        
        // Allow public access to home page
        return true;
      },
    },
  }
);

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/auth/:path*',
    '/api/:path*',
  ],
};