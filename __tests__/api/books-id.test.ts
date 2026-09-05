/**
 * Tests for /api/books/[id] (get, update, delete)
 * Mocks Prisma and the auth guard.
 * @jest-environment node
 */

jest.mock('@/lib/prisma', () => ({
  prisma: {
    book: {
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

jest.mock('@/lib/auth-guard', () => ({
  requireAuth: jest.fn().mockResolvedValue(null),
}));

import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-guard';
import { GET, PATCH, DELETE } from '@/app/api/books/[id]/route';
import { NextResponse } from 'next/server';

const bookFindUnique = prisma.book.findUnique as jest.Mock;
const bookUpdate = prisma.book.update as jest.Mock;
const bookDelete = prisma.book.delete as jest.Mock;
const mockRequireAuth = requireAuth as jest.Mock;

const request = (body?: unknown) =>
  ({ url: 'http://localhost/api/books/b1', json: async () => body }) as any;
const params = (id = 'b1') => ({ params: Promise.resolve({ id }) });

beforeEach(() => {
  jest.clearAllMocks();
  bookFindUnique.mockResolvedValue({id:'b1', dateStarted:null, dateFinished:null, totalPages:null});
  mockRequireAuth.mockResolvedValue(null);
});

describe('GET /api/books/[id]', () => {
  it('returns the book with notes', async () => {
    bookFindUnique.mockResolvedValue({ id: 'b1', title: 'T', notes: [] });
    const res = await GET(request(), params());
    expect(res.status).toBe(200);
    expect((await res.json()).id).toBe('b1');
    expect(bookFindUnique).toHaveBeenCalledWith({
      where: { id: 'b1' },
      include: { notes: true },
    });
  });

  it('returns 404 when the book does not exist', async () => {
    bookFindUnique.mockResolvedValue(null);
    const res = await GET(request(), params('missing'));
    expect(res.status).toBe(404);
  });

  it('returns 500 when Prisma throws', async () => {
    bookFindUnique.mockRejectedValueOnce(new Error('db down'));
    const res = await GET(request(), params());
    expect(res.status).toBe(500);
  });
});

describe('PATCH /api/books/[id]', () => {
  it('updates a book', async () => {
    bookUpdate.mockResolvedValue({ id: 'b1', title: 'New Title' });
    const res = await PATCH(request({ title: 'New Title' }), params());
    expect(res.status).toBe(200);
    expect(bookUpdate).toHaveBeenCalledWith({
      where: { id: 'b1' },
      data: { title: 'New Title' },
      include: { notes: true },
    });
  });

  it('auto-sets dateStarted when status changes to READING', async () => {
    bookUpdate.mockResolvedValue({});
    await PATCH(request({ status: 'READING' }), params());
    const data = bookUpdate.mock.calls[0][0].data;
    expect(data.dateStarted).toBeInstanceOf(Date);
  });

  it('auto-sets dateFinished when status changes to FINISHED', async () => {
    bookUpdate.mockResolvedValue({});
    await PATCH(request({ status: 'FINISHED' }), params());
    const data = bookUpdate.mock.calls[0][0].data;
    expect(data.dateFinished).toBeInstanceOf(Date);
  });

  it('does not overwrite an explicitly provided dateStarted', async () => {
    bookUpdate.mockResolvedValue({});
    await PATCH(request({ status: 'READING', dateStarted: '2024-01-15' }), params());
    const data = bookUpdate.mock.calls[0][0].data;
    expect(data.dateStarted).toEqual(new Date('2024-01-15'));
  });

  it('converts date strings to Date objects', async () => {
    bookUpdate.mockResolvedValue({});
    await PATCH(request({ dateFinished: '2024-06-01' }), params());
    const data = bookUpdate.mock.calls[0][0].data;
    expect(data.dateFinished).toEqual(new Date('2024-06-01'));
  });

  it('converts empty-string dates to null', async () => {
    bookUpdate.mockResolvedValue({});
    await PATCH(request({ dateStarted: '', dateFinished: '' }), params());
    const data = bookUpdate.mock.calls[0][0].data;
    expect(data.dateStarted).toBeNull();
    expect(data.dateFinished).toBeNull();
  });

  it('returns the auth error response when unauthenticated', async () => {
    mockRequireAuth.mockResolvedValue(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }));
    const res = await PATCH(request({ title: 'x' }), params());
    expect(res.status).toBe(401);
    expect(bookUpdate).not.toHaveBeenCalled();
  });

  it('returns 500 when Prisma throws', async () => {
    bookUpdate.mockRejectedValue(new Error('db down'));
    const res = await PATCH(request({ title: 'x' }), params());
    expect(res.status).toBe(500);
  });
});

describe('DELETE /api/books/[id]', () => {
  it('deletes the book and returns success', async () => {
    bookDelete.mockResolvedValue({});
    const res = await DELETE(request(), params());
    expect(res.status).toBe(200);
    expect((await res.json()).success).toBe(true);
    expect(bookDelete).toHaveBeenCalledWith({ where: { id: 'b1' } });
  });

  it('returns the auth error response when unauthenticated', async () => {
    mockRequireAuth.mockResolvedValue(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }));
    const res = await DELETE(request(), params());
    expect(res.status).toBe(401);
    expect(bookDelete).not.toHaveBeenCalled();
  });

  it('returns 500 when Prisma throws', async () => {
    bookDelete.mockRejectedValue(new Error('db down'));
    const res = await DELETE(request(), params());
    expect(res.status).toBe(500);
  });
});
