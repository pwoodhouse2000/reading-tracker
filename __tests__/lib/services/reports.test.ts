/**
 * Tests for src/lib/services/reports.ts
 * Mocks Prisma so no real DB is touched.
 *
 * NOTE: jest.mock is hoisted before variable declarations, so we must define
 * the mock shape INSIDE the factory (not reference an outer const).
 */

jest.mock('@/lib/prisma', () => ({
  prisma: {
    readingSession: { findMany: jest.fn().mockResolvedValue([]), count: jest.fn().mockResolvedValue(0) },
    book: {
      findMany: jest.fn(),
    },
  },
}));

import { prisma } from '@/lib/prisma';
import {
  getBestBooks,
  getBestBooksByYear,
  getReadingStats,
  getReadingStatsByYear,
  getMonthlyReadingCounts,
  getReadingStreak,
  getTopAuthorsWithFilters,
  getTopAuthors,
} from '@/lib/services/reports';

const bookFindMany = prisma.book.findMany as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('getBestBooks', () => {
  it('queries finished books ordered by rating with default limit', async () => {
    bookFindMany.mockResolvedValue([{ id: '1', title: 'Great', rating: 5 }]);

    const result = await getBestBooks({});
    expect(result).toHaveLength(1);
    expect(bookFindMany).toHaveBeenCalledWith({
      where: { status: 'FINISHED', dateFinished: { not: null } },
      orderBy: [{ rating: 'desc' }, { dateFinished: 'desc' }],
      take: 10,
    });
  });

  it('applies date range, category, subCategory and minRating filters', async () => {
    bookFindMany.mockResolvedValue([]);
    const startDate = new Date('2024-01-01');
    const endDate = new Date('2024-12-31');

    await getBestBooks(
      { startDate, endDate, category: 'FICTION', subCategory: 'Sci-Fi', minRating: 4 },
      5
    );

    expect(bookFindMany).toHaveBeenCalledWith({
      where: {
        status: 'FINISHED',
        dateFinished: { gte: startDate, lte: endDate },
        category: 'FICTION',
        subCategory: 'Sci-Fi',
        rating: { gte: 4 },
      },
      orderBy: [{ rating: 'desc' }, { dateFinished: 'desc' }],
      take: 5,
    });
  });

  it('ignores minRating of 0', async () => {
    bookFindMany.mockResolvedValue([]);
    await getBestBooks({ minRating: 0 });
    const where = bookFindMany.mock.calls[0][0].where;
    expect(where.rating).toBeUndefined();
  });

  it('getBestBooksByYear delegates with a year date range', async () => {
    bookFindMany.mockResolvedValue([]);
    await getBestBooksByYear(2023, 'NON_FICTION', 3);
    const call = bookFindMany.mock.calls[0][0];
    expect(call.where.category).toBe('NON_FICTION');
    // Compare epoch timestamps to avoid timezone ambiguity
    expect(call.where.dateFinished.gte.getTime()).toBe(new Date('2023-01-01').getTime());
    expect(call.where.dateFinished.lte.getTime()).toBe(new Date('2023-12-31T23:59:59').getTime());
    expect(call.take).toBe(3);
  });
});

describe('getReadingStats', () => {
  const filteredBooks = [
    { rating: 4, category: 'FICTION', mediaTypes: 'PAPER,AUDIOBOOK', status: 'FINISHED' },
    { rating: 5, category: 'FICTION', mediaTypes: 'EBOOK', status: 'FINISHED' },
    { rating: null, category: 'NON_FICTION', mediaTypes: 'PAPER', status: 'FINISHED' },
  ];
  const allBooks = [
    { status: 'TO_READ' },
    { status: 'TO_READ' },
    { status: 'NEXT_UP' },
    { status: 'READING' },
    { status: 'PAUSED' },
    { status: 'FINISHED' },
  ];

  it('aggregates categories, media, statuses and average rating', async () => {
    bookFindMany
      .mockResolvedValueOnce(filteredBooks) // filtered query
      .mockResolvedValueOnce(allBooks); // status counts query

    const stats = await getReadingStats({});

    expect(stats.total).toBe(3);
    expect(stats.byCategory).toEqual({ fiction: 2, nonFiction: 1 });
    expect(stats.byMedia).toEqual({ paper: 2, audiobook: 1, ebook: 1 });
    expect(stats.byStatus).toEqual({
      toRead: 2,
      nextUp: 1,
      reading: 1,
      paused: 1,
      finished: 1,
    });
    // avg of 4 and 5 (null rating excluded)
    expect(stats.averageRating).toBe(4.5);
  });

  it('returns 0 average rating when no books are rated', async () => {
    bookFindMany
      .mockResolvedValueOnce([{ rating: null, category: 'FICTION', mediaTypes: 'PAPER' }])
      .mockResolvedValueOnce([]);

    const stats = await getReadingStats({});
    expect(stats.averageRating).toBe(0);
    expect(stats.total).toBe(1);
  });

  it('handles empty library', async () => {
    bookFindMany.mockResolvedValue([]);
    const stats = await getReadingStats({});
    expect(stats.total).toBe(0);
    expect(stats.averageRating).toBe(0);
    expect(stats.byStatus.finished).toBe(0);
  });

  it('getReadingStatsByYear delegates with a year date range', async () => {
    bookFindMany.mockResolvedValue([]);
    await getReadingStatsByYear(2024);
    const where = bookFindMany.mock.calls[0][0].where;
    // Compare epoch timestamps to avoid TZ ambiguity
    expect(where.dateFinished.gte.getTime()).toBe(new Date('2024-01-01').getTime());
    expect(where.dateFinished.lte.getTime()).toBe(new Date('2024-12-31T23:59:59').getTime());
  });
});

describe('getMonthlyReadingCounts', () => {
  it('returns 12 month buckets for a single-year range', async () => {
    bookFindMany.mockResolvedValue([
      { dateFinished: new Date(2024, 0, 10) },
      { dateFinished: new Date(2024, 0, 20) },
      { dateFinished: new Date(2024, 5, 1) },
      { dateFinished: null },
    ]);

    const result = await getMonthlyReadingCounts({
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-12-31'),
    });

    expect(result).toHaveLength(12);
    expect(result[0]).toEqual({ month: 'Jan', count: 2 });
    expect(result[5]).toEqual({ month: 'Jun', count: 1 });
    expect(result[11]).toEqual({ month: 'Dec', count: 0 });
  });

  it('returns year-by-year counts for all-time (no dates)', async () => {
    bookFindMany.mockResolvedValue([
      { dateFinished: new Date(2022, 3, 1) },
      { dateFinished: new Date(2023, 1, 1) },
      { dateFinished: new Date(2023, 7, 1) },
    ]);

    const result = await getMonthlyReadingCounts({});
    expect(result).toEqual([
      { month: '2022', count: 1 },
      { month: '2023', count: 2 },
    ]);
  });

  it('returns empty array when there are no finished books', async () => {
    bookFindMany.mockResolvedValue([]);
    const result = await getMonthlyReadingCounts({});
    expect(result).toEqual([]);
  });
});

describe('getReadingStreak', () => {
  it('returns zero streaks when no books finished', async () => {
    bookFindMany.mockResolvedValue([]);
    const streak = await getReadingStreak();
    expect(streak).toEqual({ currentStreak: 0, longestStreak: 0 });
  });

  it('reports currentStreak 1 when a book was finished today or yesterday', async () => {
    bookFindMany.mockResolvedValue([{ dateFinished: new Date() }]);
    const streak = await getReadingStreak();
    expect(streak.currentStreak).toBe(1);
  });

  it('reports currentStreak 0 when the last book was finished long ago', async () => {
    bookFindMany.mockResolvedValue([
      { dateFinished: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
    ]);
    const streak = await getReadingStreak();
    expect(streak.currentStreak).toBe(0);
  });

  it('handles a null dateFinished on the most recent book', async () => {
    bookFindMany.mockResolvedValue([{ dateFinished: null }]);
    const streak = await getReadingStreak();
    expect(streak.currentStreak).toBe(0);
  });
});

describe('getTopAuthorsWithFilters', () => {
  it('counts books per author, sorts desc and limits', async () => {
    bookFindMany.mockResolvedValue([
      { author: 'Author A' },
      { author: 'Author B' },
      { author: 'Author A' },
      { author: 'Author C' },
      { author: 'Author A' },
      { author: 'Author B' },
    ]);

    const result = await getTopAuthorsWithFilters({}, 2);
    expect(result).toEqual([
      { author: 'Author A', count: 3 },
      { author: 'Author B', count: 2 },
    ]);
  });

  it('returns empty when no books', async () => {
    bookFindMany.mockResolvedValue([]);
    expect(await getTopAuthorsWithFilters({})).toEqual([]);
  });

  it('getTopAuthors with no year passes no date filters', async () => {
    bookFindMany.mockResolvedValue([{ author: 'X' }]);
    await getTopAuthors(undefined, 5);
    const where = bookFindMany.mock.calls[0][0].where;
    expect(where.dateFinished).toEqual({ not: null });
  });

  it('getTopAuthors with a year applies the year range', async () => {
    bookFindMany.mockResolvedValue([]);
    await getTopAuthors(2024);
    const where = bookFindMany.mock.calls[0][0].where;
    // Compare epoch timestamps to avoid TZ ambiguity
    expect(where.dateFinished.gte.getTime()).toBe(new Date('2024-01-01').getTime());
  });
});
