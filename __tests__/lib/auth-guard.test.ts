/**
 * Tests for src/lib/auth-guard.ts
 */

jest.mock('next/headers', () => {
  const cookieMock = { get: jest.fn() };
  return {
    cookies: jest.fn().mockResolvedValue(cookieMock),
    _cookieMock: cookieMock,
  };
});

// Mock NextResponse so we don't need the full Next.js runtime
jest.mock('next/server', () => {
  const NextResponse = {
    json: jest.fn((body: unknown, init?: ResponseInit) => ({
      status: init?.status || 200,
      _body: body,
      json: async () => body,
    })),
    next: jest.fn(() => ({ status: 200 })),
    redirect: jest.fn((url: string) => ({ status: 302, _url: url })),
  };
  return { NextResponse, NextRequest: class NextRequest {} };
});

import { requireAuth, withAuth } from '@/lib/auth-guard';

const { _cookieMock: cookieMock } = jest.requireMock('next/headers') as {
  _cookieMock: { get: jest.Mock };
};

describe('auth-guard', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  // -----------------------------------------------------------------------
  describe('requireAuth', () => {
    it('returns null (allow) when no ADMIN_PASSWORD is configured', async () => {
      delete process.env.ADMIN_PASSWORD;
      expect(await requireAuth()).toBeNull();
    });

    it('returns null when user is authenticated', async () => {
      process.env.ADMIN_PASSWORD = 'secret';
      cookieMock.get.mockReturnValue({ value: 'authenticated' });
      expect(await requireAuth()).toBeNull();
    });

    it('returns 401 response when not authenticated (no cookie)', async () => {
      process.env.ADMIN_PASSWORD = 'secret';
      cookieMock.get.mockReturnValue(undefined);
      const result = await requireAuth();
      expect(result).not.toBeNull();
      expect(result?.status).toBe(401);
    });

    it('returns 401 when cookie has wrong value', async () => {
      process.env.ADMIN_PASSWORD = 'secret';
      cookieMock.get.mockReturnValue({ value: 'bad' });
      const result = await requireAuth();
      expect(result?.status).toBe(401);
    });

    it('401 body contains an error property', async () => {
      process.env.ADMIN_PASSWORD = 'secret';
      cookieMock.get.mockReturnValue(undefined);
      const result = await requireAuth();
      const body = await result?.json();
      expect(body).toHaveProperty('error');
    });
  });

  // -----------------------------------------------------------------------
  describe('withAuth', () => {
    it('calls handler when authenticated', async () => {
      delete process.env.ADMIN_PASSWORD;
      const handler = jest.fn().mockResolvedValue({ status: 200 });
      const wrapped = withAuth(handler);
      const fakeReq = {} as any;
      await wrapped(fakeReq);
      expect(handler).toHaveBeenCalledWith(fakeReq, undefined);
    });

    it('does not call handler when not authenticated', async () => {
      process.env.ADMIN_PASSWORD = 'secret';
      cookieMock.get.mockReturnValue(undefined);
      const handler = jest.fn();
      const wrapped = withAuth(handler);
      const result = await wrapped({} as any);
      expect(handler).not.toHaveBeenCalled();
      expect(result.status).toBe(401);
    });

    it('forwards context parameter to handler', async () => {
      delete process.env.ADMIN_PASSWORD;
      const handler = jest.fn().mockResolvedValue({ status: 200 });
      const wrapped = withAuth(handler);
      const fakeReq = {} as any;
      const ctx = { params: { id: 'abc123' } };
      await wrapped(fakeReq, ctx);
      expect(handler).toHaveBeenCalledWith(fakeReq, ctx);
    });
  });
});
