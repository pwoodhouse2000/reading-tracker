/**
 * Tests for src/middleware.ts — path matching and redirect behavior.
 * @jest-environment node
 */

jest.mock('next/server', () => ({
  NextRequest: class NextRequest {},
  NextResponse: {
    next: jest.fn(() => ({ type: 'next', status: 200 })),
    redirect: jest.fn((url: unknown) => ({ type: 'redirect', url, status: 302 })),
  },
}));

import { middleware } from '@/middleware';
import { createAuthToken } from '@/lib/auth-token';

const { NextResponse } = jest.requireMock('next/server') as {
  NextResponse: { next: jest.Mock; redirect: jest.Mock };
};

function makeRequest(pathname: string, cookieValue?: string): any {
  const url = `http://localhost${pathname}`;
  const cookieValues: Record<string, string> = {};
  if (cookieValue !== undefined) cookieValues['reading-tracker-auth'] = cookieValue;
  return {
    url,
    nextUrl: { pathname },
    cookies: {
      get: (name: string) =>
        cookieValues[name] !== undefined ? { value: cookieValues[name] } : undefined,
    },
  };
}

describe('middleware', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv, NODE_ENV: 'test', ADMIN_PASSWORD: 'secret' };
    NextResponse.next.mockReturnValue({ type: 'next', status: 200 });
    NextResponse.redirect.mockImplementation((url: unknown) => ({ type: 'redirect', url, status: 302 }));
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('unprotected paths — always allowed', () => {
    ['/', '/books', '/login', '/reports', '/embed', '/notes'].forEach(path => {
      it(`allows ${path} without auth`, async () => {
        await middleware(makeRequest(path));
        expect(NextResponse.next).toHaveBeenCalled();
        expect(NextResponse.redirect).not.toHaveBeenCalled();
      });
    });
  });

  describe('protected paths — require auth', () => {
    ['/books/new', '/settings', '/settings/notion', '/books/abc-123/edit'].forEach(path => {
      it(`redirects ${path} when not authenticated`, async () => {
        await middleware(makeRequest(path));
        expect(NextResponse.redirect).toHaveBeenCalled();
      });
    });

    ['/books/new', '/settings', '/books/book-id/edit'].forEach(path => {
      it(`allows ${path} with a signed session`, async () => {
        const token = await createAuthToken();
        await middleware(makeRequest(path, token || undefined));
        expect(NextResponse.next).toHaveBeenCalled();
        expect(NextResponse.redirect).not.toHaveBeenCalled();
      });
    });

    it('rejects the old forgeable cookie value', async () => {
      await middleware(makeRequest('/books/new', 'authenticated'));
      expect(NextResponse.redirect).toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    ['/books/abc', '/books/abc/view'].forEach(path => {
      it(`does not protect ${path}`, async () => {
        await middleware(makeRequest(path));
        expect(NextResponse.next).toHaveBeenCalled();
      });
    });

    it('protects /settings/widget', async () => {
      await middleware(makeRequest('/settings/widget'));
      expect(NextResponse.redirect).toHaveBeenCalled();
    });
  });

  it('redirects to /login with returnUrl', async () => {
    await middleware(makeRequest('/books/new'));
    const redirectArg = NextResponse.redirect.mock.calls[0][0];
    const redirectStr = typeof redirectArg === 'string'
      ? redirectArg
      : (redirectArg as { href?: string })?.href || String(redirectArg);
    expect(redirectStr).toContain('login');
    expect(redirectStr).toContain('returnUrl=%2Fbooks%2Fnew');
  });
});
