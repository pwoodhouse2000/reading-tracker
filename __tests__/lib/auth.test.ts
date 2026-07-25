/**
 * Tests for src/lib/auth.ts
 * Mocks next/headers cookies().
 */

// Because jest.mock is hoisted, we cannot reference outer const variables in the factory.
// We create the mock object once inside the factory, then access it via jest.requireMock.
jest.mock('next/headers', () => {
  const cookieMock = {
    get: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
  };
  return {
    cookies: jest.fn().mockResolvedValue(cookieMock),
    _cookieMock: cookieMock, // expose for test access
  };
});

import {
  isAuthConfigured,
  isAuthRequired,
  verifyPassword,
  isAuthenticated,
  setAuthCookie,
  clearAuthCookie,
} from '@/lib/auth';
import { createAuthToken } from '@/lib/auth-token';

// Access the shared cookie mock
const { _cookieMock: cookieMock } = jest.requireMock('next/headers') as {
  _cookieMock: { get: jest.Mock; set: jest.Mock; delete: jest.Mock };
};

describe('auth module', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  // -----------------------------------------------------------------------
  describe('isAuthConfigured', () => {
    it('returns false when ADMIN_PASSWORD is not set', () => {
      delete process.env.ADMIN_PASSWORD;
      expect(isAuthConfigured()).toBe(false);
    });

    it('returns true when ADMIN_PASSWORD is set', () => {
      process.env.ADMIN_PASSWORD = 'secret';
      expect(isAuthConfigured()).toBe(true);
    });
  });

  describe('isAuthRequired', () => {
    it('is optional without a password outside production', () => {
      delete process.env.ADMIN_PASSWORD;
      (process.env as Record<string, string>).NODE_ENV = 'test';
      expect(isAuthRequired()).toBe(false);
    });

    it('fails closed without a password in production', () => {
      delete process.env.ADMIN_PASSWORD;
      (process.env as Record<string, string>).NODE_ENV = 'production';
      expect(isAuthRequired()).toBe(true);
      expect(verifyPassword('anything')).toBe(false);
    });
  });

  // -----------------------------------------------------------------------
  describe('verifyPassword', () => {
    it('returns true for any password when ADMIN_PASSWORD is not configured', () => {
      delete process.env.ADMIN_PASSWORD;
      expect(verifyPassword('anything')).toBe(true);
      expect(verifyPassword('')).toBe(true);
    });

    it('returns true when password matches ADMIN_PASSWORD', () => {
      process.env.ADMIN_PASSWORD = 'correct-pass';
      expect(verifyPassword('correct-pass')).toBe(true);
    });

    it('returns false when password does not match', () => {
      process.env.ADMIN_PASSWORD = 'correct-pass';
      expect(verifyPassword('wrong-pass')).toBe(false);
    });

    it('is case-sensitive', () => {
      process.env.ADMIN_PASSWORD = 'Secret';
      expect(verifyPassword('secret')).toBe(false);
      expect(verifyPassword('SECRET')).toBe(false);
    });
  });

  // -----------------------------------------------------------------------
  describe('isAuthenticated', () => {
    it('returns true when no ADMIN_PASSWORD is configured (open access)', async () => {
      delete process.env.ADMIN_PASSWORD;
      expect(await isAuthenticated()).toBe(true);
    });

    it('returns true when auth cookie has a valid signed token', async () => {
      process.env.ADMIN_PASSWORD = 'secret';
      cookieMock.get.mockReturnValue({ value: await createAuthToken() });
      expect(await isAuthenticated()).toBe(true);
    });

    it('rejects the old forgeable cookie value', async () => {
      process.env.ADMIN_PASSWORD = 'secret';
      cookieMock.get.mockReturnValue({ value: 'authenticated' });
      expect(await isAuthenticated()).toBe(false);
    });

    it('returns false when auth cookie has wrong value', async () => {
      process.env.ADMIN_PASSWORD = 'secret';
      cookieMock.get.mockReturnValue({ value: 'wrong-value' });
      expect(await isAuthenticated()).toBe(false);
    });

    it('returns false when auth cookie is absent', async () => {
      process.env.ADMIN_PASSWORD = 'secret';
      cookieMock.get.mockReturnValue(undefined);
      expect(await isAuthenticated()).toBe(false);
    });
  });

  // -----------------------------------------------------------------------
  describe('setAuthCookie', () => {
    it('sets auth cookie with a signed value', async () => {
      process.env.ADMIN_PASSWORD = 'secret';
      await setAuthCookie();
      const token = cookieMock.set.mock.calls[0][1];
      expect(token).toMatch(/^v1\.\d+\.[A-Za-z0-9_-]+$/);
      expect(cookieMock.set).toHaveBeenCalledWith(
        'reading-tracker-auth',
        token,
        expect.objectContaining({
          httpOnly: true,
          sameSite: 'strict',
          path: '/',
        })
      );
    });

    it('sets secure flag in production', async () => {
      (process.env as Record<string, string>).NODE_ENV = 'production';
      process.env.ADMIN_PASSWORD = 'secret';
      await setAuthCookie();
      expect(cookieMock.set).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.objectContaining({ secure: true })
      );
    });

    it('does not set secure flag outside production', async () => {
      (process.env as Record<string, string>).NODE_ENV = 'test';
      await setAuthCookie();
      expect(cookieMock.set).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.objectContaining({ secure: false })
      );
    });
  });

  // -----------------------------------------------------------------------
  describe('clearAuthCookie', () => {
    it('deletes the auth cookie by name', async () => {
      await clearAuthCookie();
      expect(cookieMock.delete).toHaveBeenCalledWith('reading-tracker-auth');
    });
  });
});
