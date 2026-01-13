import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const AUTH_COOKIE_NAME = 'reading-tracker-auth';
const AUTH_TOKEN_VALUE = 'authenticated';

// Check if admin password is configured
function isAuthConfigured(): boolean {
  return !!process.env.ADMIN_PASSWORD;
}

// Check if the request is authenticated
async function isRequestAuthenticated(): Promise<boolean> {
  if (!isAuthConfigured()) {
    return true; // No password set, allow all
  }
  
  const cookieStore = await cookies();
  const authCookie = cookieStore.get(AUTH_COOKIE_NAME);
  return authCookie?.value === AUTH_TOKEN_VALUE;
}

// Guard function to protect API routes that modify data
export async function requireAuth(): Promise<NextResponse | null> {
  const authenticated = await isRequestAuthenticated();
  
  if (!authenticated) {
    return NextResponse.json(
      { error: 'Unauthorized. Please log in to perform this action.' },
      { status: 401 }
    );
  }
  
  return null; // Authenticated, proceed
}

// Helper to wrap route handlers with auth check
export function withAuth(
  handler: (request: NextRequest, context?: any) => Promise<NextResponse>
) {
  return async (request: NextRequest, context?: any): Promise<NextResponse> => {
    const authError = await requireAuth();
    if (authError) return authError;
    return handler(request, context);
  };
}
