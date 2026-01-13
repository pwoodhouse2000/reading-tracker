import { cookies } from 'next/headers';

const AUTH_COOKIE_NAME = 'reading-tracker-auth';
const AUTH_TOKEN_VALUE = 'authenticated';

// Check if admin password is configured
export function isAuthConfigured(): boolean {
  return !!process.env.ADMIN_PASSWORD;
}

// Verify the provided password against the env variable
export function verifyPassword(password: string): boolean {
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) {
    // If no password is set, allow access (for backwards compatibility)
    return true;
  }
  return password === adminPassword;
}

// Check if the current request is authenticated (server-side)
export async function isAuthenticated(): Promise<boolean> {
  // If no password is configured, everyone is authenticated
  if (!isAuthConfigured()) {
    return true;
  }
  
  const cookieStore = await cookies();
  const authCookie = cookieStore.get(AUTH_COOKIE_NAME);
  return authCookie?.value === AUTH_TOKEN_VALUE;
}

// Set authentication cookie
export async function setAuthCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(AUTH_COOKIE_NAME, AUTH_TOKEN_VALUE, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: '/',
  });
}

// Clear authentication cookie
export async function clearAuthCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(AUTH_COOKIE_NAME);
}
