import { NextResponse } from 'next/server';
import { isAuthenticated, isAuthConfigured } from '@/lib/auth';

export async function GET() {
  try {
    const authenticated = await isAuthenticated();
    const authRequired = isAuthConfigured();
    
    return NextResponse.json({
      authenticated,
      authRequired,
    });
  } catch (error) {
    console.error('Auth check error:', error);
    return NextResponse.json(
      { authenticated: false, authRequired: true },
      { status: 500 }
    );
  }
}
