/**
 * Tests for /api/stats, /api/reports, and /api/embed route handlers.
 * @jest-environment node
 */

jest.mock('@/lib/prisma', () => ({
  prisma: {
    book: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    readingGoal: {
      findUnique: jest.fn(),
    },
  },
}));

// Mock the stats service entirely
jest.mock('@/lib/services/stats', () => ({
  getYearlyStats: jest.fn(),
  getReadingVelocity: jest.fn(),
  getGoalProgress: jest.fn(),
}));

// Mock the reports service entirely
jest.mock('@/lib/services/reports', () => ({
  getBestBooks: jest.fn(),
  getReadingStats: jest.fn(),
  getMonthlyReadingCounts: jest.fn(),
  getTopAuthorsWithFilters: jest.fn(),
}));

import { prisma } from '@/lib/prisma';
import { getYearlyStats, getReadingVelocity, getGoalProgress } from '@/lib/services/stats';
import { getBestBooks, getReadingStats, getMonthlyReadingCounts, getTopAuthorsWithFilters } from '@/lib/services/reports';
import { NextRequest } from 'next/server';
import { GET as statsGET } from '@/app/api/stats/route';
import { GET as reportsGET } from '@/app/api/reports/route';
import { GET as embedGET } from '@/app/api/embed/route';

const mockBook = prisma.book as unknown as { findMany: jest.Mock; count: jest.Mock };
const mockGetYearlyStats = getYearlyStats as jest.Mock;
const mockGetReadingVelocity = getReadingVelocity as jest.Mock;
const mockGetGoalProgress = getGoalProgress as jest.Mock;
const mockGetBestBooks = getBestBooks as jest.Mock;
const mockGetReadingStats = getReadingStats as jest.Mock;
const mockGetMonthlyCounts = getMonthlyReadingCounts as jest.Mock;
const mockGetTopAuthors = getTopAuthorsWithFilters as jest.Mock;

function makeReq(url: string): NextRequest {
  return new NextRequest(url);
}

beforeEach(() => {
  jest.clearAllMocks();
});

// =============================================================================
describe('GET /api/stats', () => {
  const fakeYearly = { year: 2024, booksFinished: 10 };
  const fakeVelocity = { trend: 'up', trendPercentage: 20 };
  const fakeGoal = { percentage: 50 };

  beforeEach(() => {
    mockGetYearlyStats.mockResolvedValue(fakeYearly);
    mockGetReadingVelocity.mockResolvedValue(fakeVelocity);
    mockGetGoalProgress.mockResolvedValue(fakeGoal);
  });

  it('returns combined stats for current year by default', async () => {
    const req = makeReq('http://localhost/api/stats');
    const res = await statsGET(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.yearlyStats).toEqual(fakeYearly);
    expect(data.velocity).toEqual(fakeVelocity);
    expect(data.goalProgress).toEqual(fakeGoal);
  });

  it('uses year from query param', async () => {
    const req = makeReq('http://localhost/api/stats?year=2023');
    await statsGET(req);
    expect(mockGetYearlyStats).toHaveBeenCalledWith(2023);
    expect(mockGetGoalProgress).toHaveBeenCalledWith(2023);
  });

  it('returns 500 on service error', async () => {
    mockGetYearlyStats.mockRejectedValueOnce(new Error('db'));
    const req = makeReq('http://localhost/api/stats');
    const res = await statsGET(req);
    expect(res.status).toBe(500);
  });
});

// =============================================================================
describe('GET /api/reports', () => {
  beforeEach(() => {
    mockGetBestBooks.mockResolvedValue([]);
    mockGetReadingStats.mockResolvedValue({ total: 0 });
    mockGetMonthlyCounts.mockResolvedValue([]);
    mockGetTopAuthors.mockResolvedValue([]);
  });

  it('returns report data with default current-year filter', async () => {
    const req = makeReq('http://localhost/api/reports');
    const res = await reportsGET(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty('bestBooks');
    expect(data).toHaveProperty('stats');
    expect(data).toHaveProperty('monthlyCounts');
    expect(data).toHaveProperty('topAuthors');
  });

  it('uses year filter when year param provided', async () => {
    const req = makeReq('http://localhost/api/reports?year=2023');
    await reportsGET(req);
    const call = mockGetBestBooks.mock.calls[0][0];
    expect(call.startDate).toBeInstanceOf(Date);
    expect(call.endDate).toBeInstanceOf(Date);
  });

  it('uses allTime mode when allTime=true', async () => {
    const req = makeReq('http://localhost/api/reports?allTime=true');
    await reportsGET(req);
    const call = mockGetBestBooks.mock.calls[0][0];
    expect(call.startDate).toBeUndefined();
    expect(call.endDate).toBeUndefined();
  });

  it('uses custom date range', async () => {
    const req = makeReq('http://localhost/api/reports?startDate=2024-01-01&endDate=2024-06-30');
    await reportsGET(req);
    const call = mockGetBestBooks.mock.calls[0][0];
    expect(call.startDate).toBeInstanceOf(Date);
    expect(call.endDate).toBeInstanceOf(Date);
  });

  it('passes category filter', async () => {
    const req = makeReq('http://localhost/api/reports?category=FICTION');
    await reportsGET(req);
    const call = mockGetBestBooks.mock.calls[0][0];
    expect(call.category).toBe('FICTION');
  });

  it('ignores category=all', async () => {
    const req = makeReq('http://localhost/api/reports?category=all');
    await reportsGET(req);
    const call = mockGetBestBooks.mock.calls[0][0];
    expect(call.category).toBeUndefined();
  });

  it('passes subCategory filter', async () => {
    const req = makeReq('http://localhost/api/reports?subCategory=Health');
    await reportsGET(req);
    const call = mockGetBestBooks.mock.calls[0][0];
    expect(call.subCategory).toBe('Health');
  });

  it('passes minRating filter', async () => {
    const req = makeReq('http://localhost/api/reports?minRating=4');
    await reportsGET(req);
    const call = mockGetBestBooks.mock.calls[0][0];
    expect(call.minRating).toBe(4);
  });

  it('returns 500 on service error', async () => {
    mockGetBestBooks.mockRejectedValueOnce(new Error('db'));
    const req = makeReq('http://localhost/api/reports');
    const res = await reportsGET(req);
    expect(res.status).toBe(500);
  });
});

// =============================================================================
describe('GET /api/embed', () => {
  const book = {
    id: 'b1', title: 'Dune', author: 'Frank Herbert',
    coverImageUrl: null, status: 'READING', rating: null,
    dateStarted: null, dateFinished: null,
  };

  it('returns currently reading books with CORS headers', async () => {
    mockBook.findMany.mockResolvedValue([book]);
    const req = makeReq('http://localhost/api/embed');
    const res = await embedGET(req);
    expect(res.status).toBe(200);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*');
    const data = await res.json();
    expect(data.status).toBe('READING');
    expect(Array.isArray(data.books)).toBe(true);
  });

  it('accepts status query param', async () => {
    mockBook.findMany.mockResolvedValue([{ ...book, status: 'FINISHED' }]);
    const req = makeReq('http://localhost/api/embed?status=FINISHED');
    const res = await embedGET(req);
    const data = await res.json();
    expect(data.status).toBe('FINISHED');
  });

  it('falls back to READING for invalid status', async () => {
    mockBook.findMany.mockResolvedValue([]);
    const req = makeReq('http://localhost/api/embed?status=INVALID');
    const res = await embedGET(req);
    const data = await res.json();
    expect(data.status).toBe('READING');
  });

  it('respects limit param (capped at 10)', async () => {
    mockBook.findMany.mockResolvedValue([]);
    const req = makeReq('http://localhost/api/embed?limit=5');
    await embedGET(req);
    expect(mockBook.findMany.mock.calls[0][0].take).toBe(5);
  });

  it('caps limit at 10 even when param is higher', async () => {
    mockBook.findMany.mockResolvedValue([]);
    const req = makeReq('http://localhost/api/embed?limit=100');
    await embedGET(req);
    expect(mockBook.findMany.mock.calls[0][0].take).toBe(10);
  });

  it('returns cache-control header', async () => {
    mockBook.findMany.mockResolvedValue([]);
    const req = makeReq('http://localhost/api/embed');
    const res = await embedGET(req);
    expect(res.headers.get('Cache-Control')).toContain('max-age=300');
  });

  it('returns 500 on prisma error', async () => {
    mockBook.findMany.mockRejectedValueOnce(new Error('db'));
    const req = makeReq('http://localhost/api/embed');
    const res = await embedGET(req);
    expect(res.status).toBe(500);
  });
});
