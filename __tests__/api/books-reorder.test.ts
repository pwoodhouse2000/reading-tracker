/**
 * Tests for POST /api/books/reorder
 * Mocks Prisma and the auth guard.
 * @jest-environment node
 */

jest.mock('@/lib/prisma', () => ({
  prisma: {
    book: { update: jest.fn() },
    $transaction: jest.fn(),
  },
}));

jest.mock('@/lib/auth-guard', () => ({
  requireAuth: jest.fn().mockResolvedValue(null),
}));

import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-guard';
import { POST } from '@/app/api/books/reorder/route';
import { NextResponse } from 'next/server';

const bookUpdate = prisma.book.update as jest.Mock;
const prismaTransaction = (prisma as any).$transaction as jest.Mock;
const mockRequireAuth = requireAuth as jest.Mock;

const request = (body: unknown) =>
  ({ url: 'http://localhost/api/books/reorder', json: async () => body }) as any;

beforeEach(() => {
  jest.clearAllMocks();
  mockRequireAuth.mockResolvedValue(null);
});

describe('POST /api/books/reorder', () => {
  it('updates priorities in a transaction', async () => {
    bookUpdate.mockImplementation((args: unknown) => args);
    prismaTransaction.mockResolvedValue([]);

    const updates = [
      { id: 'b1', priority: 1 },
      { id: 'b2', priority: 2 },
    ];
    const res = await POST(request({ updates }));

    expect(res.status).toBe(200);
    expect((await res.json()).success).toBe(true);
    expect(bookUpdate).toHaveBeenCalledTimes(2);
    expect(bookUpdate).toHaveBeenCalledWith({
      where: { id: 'b1' },
      data: { priority: 1 },
    });
    expect(prismaTransaction).toHaveBeenCalledTimes(1);
  });

  it('returns 400 when updates is missing', async () => {
    const res = await POST(request({}));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/updates array is required/i);
  });

  it('returns 400 when updates is not an array', async () => {
    const res = await POST(request({ updates: 'nope' }));
    expect(res.status).toBe(400);
  });

  it('returns the auth error response when unauthenticated', async () => {
    mockRequireAuth.mockResolvedValue(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }));
    const res = await POST(request({ updates: [] }));
    expect(res.status).toBe(401);
    expect(prismaTransaction).not.toHaveBeenCalled();
  });

  it('returns 500 when the transaction fails', async () => {
    bookUpdate.mockImplementation((args: unknown) => args);
    prismaTransaction.mockRejectedValue(new Error('tx failed'));
    const res = await POST(request({ updates: [{ id: 'b1', priority: 1 }] }));
    expect(res.status).toBe(500);
  });
});
