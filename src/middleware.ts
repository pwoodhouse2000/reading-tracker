import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const AUTH_COOKIE_NAME = 'reading-tracker-auth';
const AUTH_TOKEN_VALUE = 'authenticated';

// Paths that require authentication
const PROTECTED_PATHS = [
  '/books/new',
  '/settings',
];

// Pattern to match book edit pages: /books/[id]/edit
const BOOK_EDIT_PATTERN = /^\/books\/[^/]+\/edit$/;

function isProtectedPath(pathname: string): boolean {
  // Check static protected paths
  for (const path of PROTECTED_PATHS) {
    if (pathname === path || pathname.startsWith(path + '/')) {
      return true;
    }
  }
  
  // Check book edit pattern
  if (BOOK_EDIT_PATTERN.test(pathname)) {
    return true;
  }
  
  return false;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Skip if no admin password is configured (check env)
  // Note: We can't reliably check env vars in edge middleware on all platforms,
  // so we'll rely on the API-level auth checks as the primary gate.
  // The middleware provides a UX improvement by redirecting before page load.
  
  // Check if path requires auth
  if (!isProtectedPath(pathname)) {
    return NextResponse.next();
  }
  
  // Check auth cookie
  const authCookie = request.cookies.get(AUTH_COOKIE_NAME);
  const isAuthenticated = authCookie?.value === AUTH_TOKEN_VALUE;
  
  if (!isAuthenticated) {
    // Redirect to login with return URL
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('returnUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/books/new',
    '/books/:id/edit',
    '/settings/:path*',
  ],
};
