/**
 * Tests for src/middleware.ts — path matching and redirect behavior.
 * Requests are stubbed (plain objects) since middleware only touches
 * nextUrl, cookies and url.
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

const { NextResponse } = jest.requireMock('next/server') as {
  NextResponse: { next: jest.Mock; redirect: jest.Mock };
};

function makeRequest(pathname: string, cookieValue?: string): any {
  const url = `http://localhost${pathname}`;
  const cookies: Record<string, string> = {};
  if (cookieValue !== undefined) cookies['reading-tracker-auth'] = cookieValue;
  return {
    url,
    nextUrl: { pathname },
    cookies: {
      get: (name: string) =>
        cookies[name] !== undefined ? { value: cookies[name] } : undefined,
    },
  };
}

describe('middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    NextResponse.next.mockReturnValue({ type: 'next', status: 200 });
    NextResponse.redirect.mockImplementation((url: unknown) => ({ type: 'redirect', url, status: 302 }));
  });

  describe('unprotected paths — always allowed', () => {
    [
      '/',
      '/books',
      '/login',
      '/reports',
      '/embed',
      '/notes',
    ].forEach(path => {
      it(`allows ${path} without auth`, () => {
        middleware(makeRequest(path));
        expect(NextResponse.next).toHaveBeenCalled();
        expect(NextResponse.redirect).not.toHaveBeenCalled();
      });
    });
  });

  describe('protected paths — require auth', () => {
    it('redirects /books/new when not authenticated', () => {
      middleware(makeRequest('/books/new'));
      expect(NextResponse.redirect).toHaveBeenCalled();
    });

    it('redirects /settings when not authenticated', () => {
      middleware(makeRequest('/settings'));
      expect(NextResponse.redirect).toHaveBeenCalled();
    });

    it('redirects /settings/notion when not authenticated', () => {
      middleware(makeRequest('/settings/notion'));
      expect(NextResponse.redirect).toHaveBeenCalled();
    });

    it('redirects /books/[id]/edit when not authenticated', () => {
      middleware(makeRequest('/books/abc-123/edit'));
      expect(NextResponse.redirect).toHaveBeenCalled();
    });

    it('allows /books/new when authenticated', () => {
      middleware(makeRequest('/books/new', 'authenticated'));
      expect(NextResponse.next).toHaveBeenCalled();
      expect(NextResponse.redirect).not.toHaveBeenCalled();
    });

    it('allows /settings when authenticated', () => {
      middleware(makeRequest('/settings', 'authenticated'));
      expect(NextResponse.next).toHaveBeenCalled();
    });

    it('allows /books/id/edit when authenticated', () => {
      middleware(makeRequest('/books/book-id/edit', 'authenticated'));
      expect(NextResponse.next).toHaveBeenCalled();
    });

    it('rejects wrong cookie value on protected path', () => {
      middleware(makeRequest('/books/new', 'wrong'));
      expect(NextResponse.redirect).toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    it('does not protect /books/abc (no /edit suffix)', () => {
      middleware(makeRequest('/books/abc'));
      expect(NextResponse.next).toHaveBeenCalled();
    });

    it('does not protect /books/abc/view', () => {
      middleware(makeRequest('/books/abc/view'));
      expect(NextResponse.next).toHaveBeenCalled();
    });

    it('protects /settings/widget (sub-path)', () => {
      middleware(makeRequest('/settings/widget'));
      expect(NextResponse.redirect).toHaveBeenCalled();
    });
  });

  describe('redirect URL', () => {
    it('redirects to /login with returnUrl', () => {
      middleware(makeRequest('/books/new'));
      const redirectArg = NextResponse.redirect.mock.calls[0][0];
      const redirectStr = typeof redirectArg === 'string'
        ? redirectArg
        : (redirectArg as { href?: string })?.href || String(redirectArg);
      expect(redirectStr).toContain('login');
    });
  });
});
