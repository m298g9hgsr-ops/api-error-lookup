import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;

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

    return NextResponse.next();
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
  ],
};