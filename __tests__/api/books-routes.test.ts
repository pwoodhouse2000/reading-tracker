/**
 * Tests for /api/books/[id], /api/books/reorder, /api/books/search, /api/books/enrich
 * @jest-environment node
 */

jest.mock('@/lib/prisma', () => ({
  prisma: {
    book: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      $transaction: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

jest.mock('@/lib/auth-guard', () => ({
  requireAuth: jest.fn().mockResolvedValue(null),
}));

// Mock book-api for search and enrich routes
jest.mock('@/lib/services/book-api', () => ({
  searchBooks: jest.fn(),
  searchBookByISBN: jest.fn(),
  enrichBook: jest.fn(),
}));

import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-guard';
import { searchBooks, searchBookByISBN, enrichBook } from '@/lib/services/book-api';
import { NextRequest, NextResponse } from 'next/server';

import {
  GET as bookIdGET,
  PATCH as bookIdPATCH,
  DELETE as bookIdDELETE,
} from '@/app/api/books/[id]/route';
import { POST as reorderPOST } from '@/app/api/books/reorder/route';
import { GET as searchGET } from '@/app/api/books/search/route';
import { POST as enrichPOST } from '@/app/api/books/enrich/route';

const mockBook = prisma.book as unknown as {
  findUnique: jest.Mock;
  findMany: jest.Mock;
  update: jest.Mock;
  delete: jest.Mock;
};
const mockPrisma = prisma as unknown as { $transaction: jest.Mock };
const mockRequireAuth = requireAuth as jest.Mock;
const mockSearchBooks = searchBooks as jest.Mock;
const mockSearchByISBN = searchBookByISBN as jest.Mock;
const mockEnrichBook = enrichBook as jest.Mock;

function makeReq(url: string, body?: unknown, method = 'GET'): NextRequest {
  return new NextRequest(url, {
    method,
    body: body != null ? JSON.stringify(body) : undefined,
    headers: body != null ? { 'content-type': 'application/json' } : {},
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockRequireAuth.mockResolvedValue(null);
});

// =============================================================================
describe('GET /api/books/[id]', () => {
  const ctx = { params: Promise.resolve({ id: 'book-1' }) };

  it('returns book with notes when found', async () => {
    mockBook.findUnique.mockResolvedValue({ id: 'book-1', title: 'Dune', notes: [] });
    const req = makeReq('http://localhost/api/books/book-1');
    const res = await bookIdGET(req, ctx);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.id).toBe('book-1');
  });

  it('returns 404 when book not found', async () => {
    mockBook.findUnique.mockResolvedValue(null);
    const req = makeReq('http://localhost/api/books/missing');
    const res = await bookIdGET(req, { params: Promise.resolve({ id: 'missing' }) });
    expect(res.status).toBe(404);
  });

  it('returns 500 on prisma error', async () => {
    mockBook.findUnique.mockRejectedValueOnce(new Error('db'));
    const req = makeReq('http://localhost/api/books/book-1');
    const res = await bookIdGET(req, ctx);
    expect(res.status).toBe(500);
  });
});

// =============================================================================
describe('PATCH /api/books/[id]', () => {
  const ctx = { params: Promise.resolve({ id: 'book-1' }) };

  it('updates a book and returns it', async () => {
    const updated = { id: 'book-1', status: 'READING', notes: [] };
    mockBook.update.mockResolvedValue(updated);
    const req = makeReq('http://localhost/api/books/book-1', { status: 'READING' }, 'PATCH');
    const res = await bookIdPATCH(req, ctx);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe('READING');
  });

  it('auto-sets dateStarted when status changes to READING', async () => {
    mockBook.update.mockResolvedValue({ id: 'b1', status: 'READING', notes: [] });
    const req = makeReq('http://localhost/api/books/book-1', { status: 'READING' }, 'PATCH');
    await bookIdPATCH(req, ctx);
    const updateData = mockBook.update.mock.calls[0][0].data;
    expect(updateData.dateStarted).toBeInstanceOf(Date);
  });

  it('auto-sets dateFinished when status changes to FINISHED', async () => {
    mockBook.update.mockResolvedValue({ id: 'b1', status: 'FINISHED', notes: [] });
    const req = makeReq('http://localhost/api/books/book-1', { status: 'FINISHED' }, 'PATCH');
    await bookIdPATCH(req, ctx);
    const updateData = mockBook.update.mock.calls[0][0].data;
    expect(updateData.dateFinished).toBeInstanceOf(Date);
  });

  it('converts dateStarted string to Date object', async () => {
    mockBook.update.mockResolvedValue({ id: 'b1', notes: [] });
    const req = makeReq('http://localhost/api/books/book-1', { dateStarted: '2024-01-15' }, 'PATCH');
    await bookIdPATCH(req, ctx);
    const updateData = mockBook.update.mock.calls[0][0].data;
    expect(updateData.dateStarted).toBeInstanceOf(Date);
  });

  it('converts empty string dateStarted to null', async () => {
    mockBook.update.mockResolvedValue({ id: 'b1', notes: [] });
    const req = makeReq('http://localhost/api/books/book-1', { dateStarted: '' }, 'PATCH');
    await bookIdPATCH(req, ctx);
    const updateData = mockBook.update.mock.calls[0][0].data;
    expect(updateData.dateStarted).toBeNull();
  });

  it('returns 401 when not authenticated', async () => {
    mockRequireAuth.mockResolvedValueOnce(
      NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    );
    const req = makeReq('http://localhost/api/books/book-1', { title: 'New' }, 'PATCH');
    const res = await bookIdPATCH(req, ctx);
    expect(res.status).toBe(401);
    expect(mockBook.update).not.toHaveBeenCalled();
  });

  it('returns 500 on prisma error', async () => {
    mockBook.update.mockRejectedValueOnce(new Error('db'));
    const req = makeReq('http://localhost/api/books/book-1', { title: 'x' }, 'PATCH');
    const res = await bookIdPATCH(req, ctx);
    expect(res.status).toBe(500);
  });
});

// =============================================================================
describe('DELETE /api/books/[id]', () => {
  const ctx = { params: Promise.resolve({ id: 'book-1' }) };

  it('deletes book and returns success', async () => {
    mockBook.delete.mockResolvedValue({});
    const req = makeReq('http://localhost/api/books/book-1', undefined, 'DELETE');
    const res = await bookIdDELETE(req, ctx);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
  });

  it('returns 401 when not authenticated', async () => {
    mockRequireAuth.mockResolvedValueOnce(
      NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    );
    const req = makeReq('http://localhost/api/books/book-1', undefined, 'DELETE');
    const res = await bookIdDELETE(req, ctx);
    expect(res.status).toBe(401);
  });

  it('returns 500 on prisma error', async () => {
    mockBook.delete.mockRejectedValueOnce(new Error('db'));
    const req = makeReq('http://localhost/api/books/book-1', undefined, 'DELETE');
    const res = await bookIdDELETE(req, ctx);
    expect(res.status).toBe(500);
  });
});

// =============================================================================
describe('POST /api/books/reorder', () => {
  it('updates priorities in a transaction and returns success', async () => {
    mockPrisma.$transaction.mockResolvedValue([]);
    const req = makeReq(
      'http://localhost/api/books/reorder',
      { updates: [{ id: 'b1', priority: 1 }, { id: 'b2', priority: 2 }] },
      'POST'
    );
    const res = await reorderPOST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(mockPrisma.$transaction).toHaveBeenCalled();
  });

  it('returns 400 when updates array is missing', async () => {
    const req = makeReq('http://localhost/api/books/reorder', {}, 'POST');
    const res = await reorderPOST(req);
    expect(res.status).toBe(400);
  });

  it('returns 400 when updates is not an array', async () => {
    const req = makeReq('http://localhost/api/books/reorder', { updates: 'bad' }, 'POST');
    const res = await reorderPOST(req);
    expect(res.status).toBe(400);
  });

  it('returns 401 when not authenticated', async () => {
    mockRequireAuth.mockResolvedValueOnce(
      NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    );
    const req = makeReq(
      'http://localhost/api/books/reorder',
      { updates: [] },
      'POST'
    );
    const res = await reorderPOST(req);
    expect(res.status).toBe(401);
  });

  it('returns 500 on transaction error', async () => {
    mockPrisma.$transaction.mockRejectedValueOnce(new Error('tx failed'));
    const req = makeReq(
      'http://localhost/api/books/reorder',
      { updates: [{ id: 'b1', priority: 1 }] },
      'POST'
    );
    const res = await reorderPOST(req);
    expect(res.status).toBe(500);
  });
});

// =============================================================================
describe('GET /api/books/search', () => {
  it('returns 400 when neither q nor isbn param is provided', async () => {
    const req = makeReq('http://localhost/api/books/search');
    const res = await searchGET(req);
    expect(res.status).toBe(400);
  });

  it('searches by text query and returns results', async () => {
    mockSearchBooks.mockResolvedValue([{ title: 'Dune', author: 'Frank Herbert' }]);
    const req = makeReq('http://localhost/api/books/search?q=Dune');
    const res = await searchGET(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.count).toBe(1);
    expect(data.results[0].title).toBe('Dune');
    expect(data.query).toBe('Dune');
  });

  it('searches by ISBN and returns a single result', async () => {
    mockSearchByISBN.mockResolvedValue({ title: 'Dune', isbn: '9780441013593' });
    const req = makeReq('http://localhost/api/books/search?isbn=9780441013593');
    const res = await searchGET(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.count).toBe(1);
  });

  it('returns empty results when ISBN not found', async () => {
    mockSearchByISBN.mockResolvedValue(null);
    const req = makeReq('http://localhost/api/books/search?isbn=0000000000');
    const res = await searchGET(req);
    const data = await res.json();
    expect(data.count).toBe(0);
    expect(data.results).toEqual([]);
  });

  it('returns 500 on error', async () => {
    mockSearchBooks.mockRejectedValueOnce(new Error('api down'));
    const req = makeReq('http://localhost/api/books/search?q=test');
    const res = await searchGET(req);
    expect(res.status).toBe(500);
  });
});

// =============================================================================
describe('POST /api/books/enrich', () => {
  it('enriches books missing cover/summary', async () => {
    const book = { id: 'b1', title: 'Dune', author: 'Frank Herbert', coverImageUrl: null, summary: null };
    mockBook.findMany.mockResolvedValue([book]);
    mockEnrichBook.mockResolvedValue({ summary: 'Epic tale', coverImageUrl: 'cover.jpg', apiSource: 'ol' });
    mockBook.update.mockResolvedValue({ ...book, summary: 'Epic tale', coverImageUrl: 'cover.jpg' });

    const req = makeReq('http://localhost/api/books/enrich', {}, 'POST');
    const res = await enrichPOST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.enriched).toBe(1);
    expect(data.success).toBe(true);
  });

  it('skips books that already have both cover and summary', async () => {
    const book = { id: 'b1', title: 'Dune', author: 'Frank Herbert', coverImageUrl: 'c.jpg', summary: 'S' };
    mockBook.findMany.mockResolvedValue([book]);

    const req = makeReq('http://localhost/api/books/enrich', {}, 'POST');
    const res = await enrichPOST(req);
    const data = await res.json();
    expect(data.skipped).toBeGreaterThanOrEqual(1);
    expect(data.enriched).toBe(0);
  });

  it('enriches specific book by id when bookId provided', async () => {
    const book = { id: 'b1', title: 'Dune', author: 'F', coverImageUrl: null, summary: null };
    mockBook.findUnique.mockResolvedValue(book);
    mockEnrichBook.mockResolvedValue({ summary: 'desc', coverImageUrl: 'img.jpg', apiSource: 'gb' });
    mockBook.update.mockResolvedValue({});

    const req = makeReq('http://localhost/api/books/enrich', { bookId: 'b1' }, 'POST');
    const res = await enrichPOST(req);
    expect(res.status).toBe(200);
    expect(mockBook.findUnique).toHaveBeenCalledWith({ where: { id: 'b1' } });
  });

  it('returns 500 on top-level error', async () => {
    mockBook.findMany.mockRejectedValueOnce(new Error('db down'));
    const req = makeReq('http://localhost/api/books/enrich', {}, 'POST');
    const res = await enrichPOST(req);
    expect(res.status).toBe(500);
  });
});
