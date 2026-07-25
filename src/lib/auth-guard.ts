import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';

// Guard function to protect API routes that modify data
export async function requireAuth(): Promise<NextResponse | null> {
  const authenticated = await isAuthenticated();
  
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
