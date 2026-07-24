/**
 * Tests for GET /api/embed
 * Mocks Prisma and next/server.
 */

jest.mock('next/server', () => ({
  NextRequest: class NextRequest {},
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) => {
      const headersStore: Record<string, string> = {};
      return {
        status: init?.status ?? 200,
        headers: {
          set: (k: string, v: string) => { headersStore[k] = v; },
          get: (k: string) => headersStore[k] ?? null,
        },
        json: async () => body,
      };
    },
  },
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    book: {
      findMany: jest.fn(),
    },
  },
}));

import { prisma } from '@/lib/prisma';
import { GET } from '@/app/api/embed/route';

const bookFindMany = prisma.book.findMany as jest.Mock;

function req(url: string): any {
  return { url };
}

describe('GET /api/embed', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    bookFindMany.mockResolvedValue([
      { id: '1', title: 'Dune', author: 'Herbert', status: 'READING', rating: null },
    ]);
  });

  it('defaults to READING status with limit 3', async () => {
    const res = await GET(req('http://localhost/api/embed'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('READING');
    expect(body.count).toBe(1);
    expect(bookFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { status: 'READING' }, take: 3 })
    );
  });

  it('accepts FINISHED status', async () => {
    await GET(req('http://localhost/api/embed?status=FINISHED'));
    expect(bookFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { status: 'FINISHED' } })
    );
  });

  it('normalizes lowercase status to uppercase', async () => {
    await GET(req('http://localhost/api/embed?status=finished'));
    expect(bookFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { status: 'FINISHED' } })
    );
  });

  it('falls back to READING for invalid status', async () => {
    const res = await GET(req('http://localhost/api/embed?status=INVALID'));
    expect((await res.json()).status).toBe('READING');
  });

  it('caps limit at 10', async () => {
    await GET(req('http://localhost/api/embed?limit=99'));
    expect(bookFindMany.mock.calls[0][0].take).toBe(10);
  });

  it('uses default limit of 3', async () => {
    await GET(req('http://localhost/api/embed'));
    expect(bookFindMany.mock.calls[0][0].take).toBe(3);
  });

  it('orders FINISHED by dateFinished desc', async () => {
    await GET(req('http://localhost/api/embed?status=FINISHED'));
    expect(bookFindMany.mock.calls[0][0].orderBy).toEqual({ dateFinished: 'desc' });
  });

  it('orders non-FINISHED by updatedAt desc', async () => {
    await GET(req('http://localhost/api/embed?status=NEXT_UP'));
    expect(bookFindMany.mock.calls[0][0].orderBy).toEqual({ updatedAt: 'desc' });
  });

  it('returns 500 when DB throws', async () => {
    bookFindMany.mockRejectedValue(new Error('db'));
    const res = await GET(req('http://localhost/api/embed'));
    expect(res.status).toBe(500);
  });

  it('returns books array with correct count', async () => {
    bookFindMany.mockResolvedValue([
      { id: '1', title: 'A', author: 'B', status: 'READING' },
      { id: '2', title: 'C', author: 'D', status: 'READING' },
    ]);
    const body = await (await GET(req('http://localhost/api/embed'))).json();
    expect(body.books).toHaveLength(2);
    expect(body.count).toBe(2);
  });

  it('sets CORS headers on response', async () => {
    const res = await GET(req('http://localhost/api/embed'));
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*');
    expect(res.headers.get('Cache-Control')).toContain('max-age=300');
  });
});
