/**
 * Tests for GET /api/reports
 * Mocks the reports service and verifies filter construction.
 * @jest-environment node
 */

jest.mock('@/lib/services/reports', () => ({
  getBestBooks: jest.fn(),
  getReadingStats: jest.fn(),
  getMonthlyReadingCounts: jest.fn(),
  getTopAuthorsWithFilters: jest.fn(),
}));

import {
  getBestBooks,
  getReadingStats,
  getMonthlyReadingCounts,
  getTopAuthorsWithFilters,
} from '@/lib/services/reports';
import { GET } from '@/app/api/reports/route';

const mockGetBestBooks = getBestBooks as jest.Mock;
const mockGetReadingStats = getReadingStats as jest.Mock;
const mockGetMonthlyReadingCounts = getMonthlyReadingCounts as jest.Mock;
const mockGetTopAuthorsWithFilters = getTopAuthorsWithFilters as jest.Mock;

const request = (url: string) => ({ url }) as any;

beforeEach(() => {
  jest.clearAllMocks();
  mockGetBestBooks.mockResolvedValue([{ id: 'b1' }]);
  mockGetReadingStats.mockResolvedValue({ total: 1 });
  mockGetMonthlyReadingCounts.mockResolvedValue([{ month: 'Jan', count: 1 }]);
  mockGetTopAuthorsWithFilters.mockResolvedValue([{ author: 'A', count: 2 }]);
});

describe('GET /api/reports', () => {
  it('returns all report sections and echoes filters', async () => {
    const res = await GET(request('http://localhost/api/reports?year=2024&category=FICTION&subCategory=Health&minRating=4'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.bestBooks).toEqual([{ id: 'b1' }]);
    expect(body.stats).toEqual({ total: 1 });
    expect(body.monthlyCounts).toEqual([{ month: 'Jan', count: 1 }]);
    expect(body.topAuthors).toEqual([{ author: 'A', count: 2 }]);
    expect(body.filters).toMatchObject({
      year: '2024',
      category: 'FICTION',
      subCategory: 'Health',
      allTime: false,
    });

    const filters = mockGetBestBooks.mock.calls[0][0];
    expect(filters.category).toBe('FICTION');
    expect(filters.subCategory).toBe('Health');
    expect(filters.minRating).toBe(4);
    // Date comparison using UTC year to avoid TZ issues with date-only strings
    expect(filters.startDate.getUTCFullYear()).toBe(2024);
    // endDate is '2024-12-31T23:59:59' (local) - use getFullYear() for local
    expect(filters.endDate.getFullYear()).toBe(2024);
  });

  it('applies no date filters for allTime=true', async () => {
    await GET(request('http://localhost/api/reports?allTime=true'));
    const filters = mockGetBestBooks.mock.calls[0][0];
    expect(filters.startDate).toBeUndefined();
    expect(filters.endDate).toBeUndefined();
  });

  it('uses a custom date range when startDate and endDate are provided', async () => {
    await GET(request('http://localhost/api/reports?startDate=2023-06-01&endDate=2023-09-30'));
    const filters = mockGetBestBooks.mock.calls[0][0];
    expect(filters.startDate).toBeInstanceOf(Date);
    expect(filters.endDate).toBeInstanceOf(Date);
    expect(filters.startDate.getUTCFullYear()).toBe(2023);
  });

  it('defaults to the current year with no params', async () => {
    await GET(request('http://localhost/api/reports'));
    const filters = mockGetBestBooks.mock.calls[0][0];
    // startDate is new Date('YYYY-01-01') which is UTC midnight
    // In negative-offset TZs, getFullYear() returns prev year; use getUTCFullYear()
    expect(filters.startDate.getUTCFullYear()).toBe(new Date().getUTCFullYear());
  });

  it('treats category=all as no category filter', async () => {
    await GET(request('http://localhost/api/reports?category=all'));
    const filters = mockGetBestBooks.mock.calls[0][0];
    expect(filters.category).toBeUndefined();
  });

  it('returns 500 when a service call fails', async () => {
    mockGetReadingStats.mockRejectedValue(new Error('db down'));
    const res = await GET(request('http://localhost/api/reports'));
    expect(res.status).toBe(500);
    expect((await res.json()).error).toMatch(/failed to generate reports/i);
  });
});
