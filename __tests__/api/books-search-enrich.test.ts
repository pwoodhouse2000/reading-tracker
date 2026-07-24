/**
 * Tests for GET /api/books/search and POST /api/books/enrich
 */

jest.mock('next/server', () => ({
  NextRequest: class NextRequest {},
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      json: async () => body,
    }),
  },
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    book: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
  },
}));

jest.mock('@/lib/services/book-api', () => ({
  searchBooks: jest.fn(),
  searchBookByISBN: jest.fn(),
  enrichBook: jest.fn(),
}));

import { prisma } from '@/lib/prisma';
import { searchBooks, searchBookByISBN, enrichBook } from '@/lib/services/book-api';
import { GET as searchGET } from '@/app/api/books/search/route';
import { POST as enrichPOST } from '@/app/api/books/enrich/route';

const bookFindUnique = prisma.book.findUnique as jest.Mock;
const bookFindMany = prisma.book.findMany as jest.Mock;
const bookUpdate = prisma.book.update as jest.Mock;
const mockSearchBooks = searchBooks as jest.Mock;
const mockSearchBookByISBN = searchBookByISBN as jest.Mock;
const mockEnrichBook = enrichBook as jest.Mock;

const getReq = (url: string): any => ({ url });
const postReq = (body: unknown): any => ({ url: 'http://localhost/api/books/enrich', json: async () => body });

describe('GET /api/books/search', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSearchBooks.mockResolvedValue([]);
    mockSearchBookByISBN.mockResolvedValue(null);
  });

  it('returns 400 when neither q nor isbn provided', async () => {
    const res = await searchGET(getReq('http://localhost/api/books/search'));
    expect(res.status).toBe(400);
  });

  it('searches by text query', async () => {
    mockSearchBooks.mockResolvedValue([{ title: 'Dune', author: 'Herbert' }]);
    const res = await searchGET(getReq('http://localhost/api/books/search?q=dune'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.results).toHaveLength(1);
    expect(body.count).toBe(1);
    expect(mockSearchBooks).toHaveBeenCalledWith('dune');
  });

  it('searches by ISBN', async () => {
    mockSearchBookByISBN.mockResolvedValue({ title: 'ISBN Book', author: 'Auth' });
    const res = await searchGET(getReq('http://localhost/api/books/search?isbn=9780441013593'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.results).toHaveLength(1);
    expect(mockSearchBookByISBN).toHaveBeenCalledWith('9780441013593');
  });

  it('returns empty results when ISBN not found', async () => {
    const res = await searchGET(getReq('http://localhost/api/books/search?isbn=0000'));
    const body = await res.json();
    expect(body.results).toEqual([]);
    expect(body.count).toBe(0);
  });

  it('returns 500 on service error', async () => {
    mockSearchBooks.mockRejectedValue(new Error('API error'));
    const res = await searchGET(getReq('http://localhost/api/books/search?q=fail'));
    expect(res.status).toBe(500);
  });
});

describe('POST /api/books/enrich', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockEnrichBook.mockResolvedValue(null);
  });

  it('enriches books missing cover/summary', async () => {
    bookFindMany.mockResolvedValue([
      { id: 'b1', title: 'Book A', author: 'Auth', coverImageUrl: null, summary: null },
    ]);
    mockEnrichBook.mockResolvedValue({
      summary: 'Great book', coverImageUrl: 'https://cover.jpg', apiSource: 'combined',
    });
    bookUpdate.mockResolvedValue({});

    const res = await enrichPOST(postReq({}));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.enriched).toBe(1);
    expect(body.skipped).toBe(0);
  });

  it('skips books that already have both cover and summary', async () => {
    bookFindMany.mockResolvedValue([
      { id: 'b1', title: 'Full', author: 'Auth', coverImageUrl: 'https://c.jpg', summary: 'Summary' },
    ]);
    const res = await enrichPOST(postReq({}));
    const body = await res.json();
    expect(body.skipped).toBe(1);
    expect(body.enriched).toBe(0);
    expect(mockEnrichBook).not.toHaveBeenCalled();
  });

  it('enriches a specific book when bookId is provided', async () => {
    bookFindUnique.mockResolvedValue({
      id: 'b1', title: 'Solo', author: 'Auth', coverImageUrl: null, summary: null,
    });
    mockEnrichBook.mockResolvedValue({ summary: 'Summary', coverImageUrl: null, apiSource: 'ol' });
    bookUpdate.mockResolvedValue({});

    await enrichPOST(postReq({ bookId: 'b1' }));
    expect(bookFindUnique).toHaveBeenCalledWith({ where: { id: 'b1' } });
  });

  it('records "not_found" when enrichment returns null', async () => {
    bookFindMany.mockResolvedValue([
      { id: 'b1', title: 'Nope', author: 'Auth', coverImageUrl: null, summary: null },
    ]);
    mockEnrichBook.mockResolvedValue(null);
    const res = await enrichPOST(postReq({}));
    const body = await res.json();
    expect(body.skipped).toBe(1);
    expect(body.enriched).toBe(0);
  });

  it('returns 500 on DB error', async () => {
    bookFindMany.mockRejectedValue(new Error('db'));
    const res = await enrichPOST(postReq({}));
    expect(res.status).toBe(500);
  });
});
