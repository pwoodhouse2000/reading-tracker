import { cookies } from 'next/headers';
import { createHash, timingSafeEqual } from 'node:crypto';
import {
  AUTH_COOKIE_MAX_AGE_SECONDS,
  AUTH_COOKIE_NAME,
  createAuthToken,
  verifyAuthToken,
} from '@/lib/auth-token';

// Check if admin password is configured
export function isAuthConfigured(): boolean {
  return !!process.env.ADMIN_PASSWORD;
}

// Production must fail closed if its password/secret configuration is lost.
export function isAuthRequired(): boolean {
  return process.env.NODE_ENV === 'production' || isAuthConfigured();
}

// Verify the provided password against the env variable
export function verifyPassword(password: string): boolean {
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) {
    return !isAuthRequired();
  }

  // Hash both values first so timingSafeEqual always compares equal lengths.
  const suppliedDigest = createHash('sha256').update(password).digest();
  const expectedDigest = createHash('sha256').update(adminPassword).digest();
  return timingSafeEqual(suppliedDigest, expectedDigest);
}

// Check if the current request is authenticated (server-side)
export async function isAuthenticated(): Promise<boolean> {
  if (!isAuthRequired()) {
    return true;
  }
  
  const cookieStore = await cookies();
  const authCookie = cookieStore.get(AUTH_COOKIE_NAME);
  return verifyAuthToken(authCookie?.value);
}

// Set authentication cookie
export async function setAuthCookie(): Promise<void> {
  const token = await createAuthToken();
  if (!token) {
    throw new Error('Authentication secret is not configured');
  }

  const cookieStore = await cookies();
  cookieStore.set(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: AUTH_COOKIE_MAX_AGE_SECONDS,
    path: '/',
  });
}

// Clear authentication cookie
export async function clearAuthCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(AUTH_COOKIE_NAME);
}
