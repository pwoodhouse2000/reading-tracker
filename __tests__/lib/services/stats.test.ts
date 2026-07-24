/**
 * Tests for src/lib/services/stats.ts
 * Mocks Prisma so no real DB is touched.
 */

jest.mock('@/lib/prisma', () => ({
  prisma: {
    book: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    readingGoal: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
  },
}));

import { prisma } from '@/lib/prisma';
import {
  getMonthlyStats,
  getYearlyStats,
  getReadingVelocity,
  getGoalProgress,
  setReadingGoal,
  getReadingGoal,
} from '@/lib/services/stats';

const bookFindMany = prisma.book.findMany as jest.Mock;
const bookCount = prisma.book.count as jest.Mock;
const goalFindUnique = prisma.readingGoal.findUnique as jest.Mock;
const goalUpsert = prisma.readingGoal.upsert as jest.Mock;

// Helper: build a finished-book record
function makeBook(
  year: number,
  month: number,
  day: number,
  overrides: Record<string, unknown> = {}
) {
  return {
    dateFinished: new Date(year, month - 1, day),
    dateStarted: new Date(year, month - 1, Math.max(1, day - 10)),
    rating: 4,
    category: 'FICTION',
    subCategory: 'Literary',
    ...overrides,
  };
}

describe('stats service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // -----------------------------------------------------------------------
  describe('getMonthlyStats', () => {
    it('returns exactly 12 entries for the requested year', async () => {
      bookFindMany.mockResolvedValue([
        { dateFinished: new Date(2024, 0, 15), dateStarted: new Date(2024, 0, 1) },
        { dateFinished: null, dateStarted: new Date(2024, 1, 5) },
      ]);
      const result = await getMonthlyStats(2024);
      expect(result).toHaveLength(12);
    });

    it('counts correctly for months that have books', async () => {
      bookFindMany.mockResolvedValue([
        { dateFinished: new Date(2024, 0, 15), dateStarted: new Date(2024, 0, 1) },
        { dateFinished: null, dateStarted: new Date(2024, 1, 5) },
      ]);
      const result = await getMonthlyStats(2024);
      expect(result[0]).toMatchObject({ month: 1, year: 2024, booksFinished: 1, booksStarted: 1 });
      expect(result[1]).toMatchObject({ month: 2, year: 2024, booksStarted: 1, booksFinished: 0 });
    });

    it('returns all-zero months when no books', async () => {
      bookFindMany.mockResolvedValue([]);
      const result = await getMonthlyStats(2024);
      expect(result).toHaveLength(12);
      expect(result.every(m => m.booksFinished === 0 && m.booksStarted === 0)).toBe(true);
    });

    it('does not count cross-year books', async () => {
      bookFindMany.mockResolvedValue([
        { dateFinished: new Date(2023, 11, 31), dateStarted: new Date(2023, 10, 1) },
      ]);
      const result = await getMonthlyStats(2024);
      expect(result.every(m => m.booksFinished === 0 && m.booksStarted === 0)).toBe(true);
    });
  });

  // -----------------------------------------------------------------------
  describe('getYearlyStats', () => {
    const threeBooks = [
      makeBook(2024, 3, 10, { rating: 5, category: 'FICTION', subCategory: 'Literary' }),
      makeBook(2024, 6, 20, { rating: 3, category: 'NON_FICTION', subCategory: 'Science' }),
      makeBook(2024, 9, 5, { rating: null, category: 'FICTION', subCategory: null }),
    ];

    beforeEach(() => {
      // getYearlyStats calls findMany TWICE: once for finishedBooks (with status filter)
      // and once via getMonthlyStats (with OR date filter + select { dateStarted, dateFinished }).
      // We mock both calls: return real books for first, empty for the monthly sub-call.
      let callIndex = 0;
      bookFindMany.mockImplementation(() => {
        const result = callIndex === 0 ? threeBooks : [];
        callIndex++;
        return Promise.resolve(result);
      });
      bookCount.mockResolvedValue(5);
    });

    it('returns correct year', async () => {
      expect((await getYearlyStats(2024)).year).toBe(2024);
    });

    it('counts finished books', async () => {
      expect((await getYearlyStats(2024)).booksFinished).toBe(3);
    });

    it('averages only rated books', async () => {
      const stats = await getYearlyStats(2024);
      expect(stats.averageRating).toBe(4); // (5+3)/2 = 4
      expect(stats.totalRated).toBe(2);
    });

    it('splits categories correctly', async () => {
      const stats = await getYearlyStats(2024);
      expect(stats.byCategory.fiction).toBe(2);
      expect(stats.byCategory.nonFiction).toBe(1);
    });

    it('returns booksStarted from count', async () => {
      expect((await getYearlyStats(2024)).booksStarted).toBe(5);
    });

    it('returns null averageRating when no rated books', async () => {
      let callIndex = 0;
      bookFindMany.mockImplementation(() => {
        const result = callIndex === 0
          ? [makeBook(2024, 1, 1, { rating: null })]
          : [];
        callIndex++;
        return Promise.resolve(result);
      });
      expect((await getYearlyStats(2024)).averageRating).toBeNull();
    });

    it('sorts topSubCategories descending by count', async () => {
      const books = [
        makeBook(2024, 1, 1, { subCategory: 'A' }),
        makeBook(2024, 2, 1, { subCategory: 'A' }),
        makeBook(2024, 3, 1, { subCategory: 'B' }),
      ];
      let callIndex = 0;
      bookFindMany.mockImplementation(() => {
        const result = callIndex === 0 ? books : [];
        callIndex++;
        return Promise.resolve(result);
      });
      const stats = await getYearlyStats(2024);
      expect(stats.topSubCategories[0]).toMatchObject({ name: 'A', count: 2 });
    });

    it('computes averageDaysToFinish', async () => {
      const book = {
        rating: 4,
        category: 'FICTION',
        subCategory: null,
        dateStarted: new Date(2024, 0, 1),
        dateFinished: new Date(2024, 0, 11), // 10 days
      };
      let callIndex = 0;
      bookFindMany.mockImplementation(() => {
        const result = callIndex === 0 ? [book] : [];
        callIndex++;
        return Promise.resolve(result);
      });
      expect((await getYearlyStats(2024)).averageDaysToFinish).toBe(10);
    });

    it('returns null averageDaysToFinish when dateStarted is missing', async () => {
      const book = {
        rating: 4,
        category: 'FICTION',
        subCategory: null,
        dateStarted: null,
        dateFinished: new Date(2024, 0, 10),
      };
      let callIndex = 0;
      bookFindMany.mockImplementation(() => {
        const result = callIndex === 0 ? [book] : [];
        callIndex++;
        return Promise.resolve(result);
      });
      expect((await getYearlyStats(2024)).averageDaysToFinish).toBeNull();
    });

    it('includes byMonth array with 12 entries', async () => {
      expect((await getYearlyStats(2024)).byMonth).toHaveLength(12);
    });
  });

  // -----------------------------------------------------------------------
  describe('getReadingVelocity', () => {
    const currentMonth = new Date().getMonth() + 1;

    it('returns no_data trend when both years have 0 books', async () => {
      bookCount.mockResolvedValue(0);
      const v = await getReadingVelocity();
      expect(v.trend).toBe('no_data');
      expect(v.trendPercentage).toBeNull();
      expect(v.previousYear).toBeNull();
    });

    it('sets previousYear to null when previous year has 0 books', async () => {
      bookCount
        .mockResolvedValueOnce(12) // current year
        .mockResolvedValueOnce(0); // previous year
      const v = await getReadingVelocity();
      expect(v.previousYear).toBeNull();
      expect(v.currentYear.totalBooks).toBe(12);
    });

    it('computes "down" trend when current pace is much lower than previous', async () => {
      bookCount
        .mockResolvedValueOnce(1)  // current year: very few
        .mockResolvedValueOnce(48); // previous year: 4/month
      const v = await getReadingVelocity();
      expect(v.trend).toBe('down');
    });

    it('computes "up" trend when current pace greatly exceeds previous', async () => {
      // Only assert for months where current pace is clearly higher
      if (currentMonth <= 10) {
        bookCount
          .mockResolvedValueOnce(currentMonth * 4) // 4/month current year
          .mockResolvedValueOnce(6);               // 0.5/month previous year
        const v = await getReadingVelocity();
        expect(v.trend).toBe('up');
      }
    });

    it('includes monthsElapsed equal to current month', async () => {
      bookCount.mockResolvedValue(0);
      const v = await getReadingVelocity();
      expect(v.currentYear.monthsElapsed).toBe(currentMonth);
    });

    it('rounds booksPerMonth to 1 decimal', async () => {
      bookCount
        .mockResolvedValueOnce(5)
        .mockResolvedValueOnce(12);
      const v = await getReadingVelocity();
      const expected = Math.round((5 / currentMonth) * 10) / 10;
      expect(v.currentYear.booksPerMonth).toBe(expected);
      expect(v.previousYear?.booksPerMonth).toBe(1); // 12/12 = 1.0
    });
  });

  // -----------------------------------------------------------------------
  describe('getGoalProgress', () => {
    it('returns null when no goal exists for the year', async () => {
      goalFindUnique.mockResolvedValue(null);
      expect(await getGoalProgress(2024)).toBeNull();
    });

    it('calculates 50% progress', async () => {
      goalFindUnique.mockResolvedValue({ year: 2024, targetBooks: 24 });
      bookCount.mockResolvedValue(12);
      const result = await getGoalProgress(2024);
      expect(result?.percentage).toBe(50);
      expect(result?.current).toBe(12);
      expect(result?.target).toBe(24);
      expect(result?.year).toBe(2024);
    });

    it('caps percentage at 100 when goal exceeded', async () => {
      goalFindUnique.mockResolvedValue({ year: 2024, targetBooks: 10 });
      bookCount.mockResolvedValue(20);
      expect((await getGoalProgress(2024))?.percentage).toBe(100);
    });

    it('returns booksNeededPerMonth >= 0 when goal already met', async () => {
      goalFindUnique.mockResolvedValue({ year: 2024, targetBooks: 5 });
      bookCount.mockResolvedValue(10);
      expect((await getGoalProgress(2024))?.booksNeededPerMonth).toBeGreaterThanOrEqual(0);
    });

    it('uses current year by default', async () => {
      const year = new Date().getFullYear();
      goalFindUnique.mockResolvedValue({ year, targetBooks: 12 });
      bookCount.mockResolvedValue(6);
      expect((await getGoalProgress())?.year).toBe(year);
    });

    it('onTrack is false when no books finished', async () => {
      goalFindUnique.mockResolvedValue({ year: 2024, targetBooks: 24 });
      bookCount.mockResolvedValue(0);
      expect((await getGoalProgress(2024))?.onTrack).toBe(false);
    });
  });

  // -----------------------------------------------------------------------
  describe('setReadingGoal', () => {
    it('calls upsert with correct create/update payloads', async () => {
      goalUpsert.mockResolvedValue({ year: 2025, targetBooks: 30 });
      await setReadingGoal(2025, 30);
      expect(goalUpsert).toHaveBeenCalledWith({
        where: { year: 2025 },
        update: { targetBooks: 30 },
        create: { year: 2025, targetBooks: 30 },
      });
    });
  });

  describe('getReadingGoal', () => {
    it('calls findUnique with the correct year', async () => {
      goalFindUnique.mockResolvedValue({ year: 2024, targetBooks: 20 });
      const result = await getReadingGoal(2024);
      expect(result?.targetBooks).toBe(20);
      expect(goalFindUnique).toHaveBeenCalledWith({ where: { year: 2024 } });
    });

    it('returns null when no goal exists', async () => {
      goalFindUnique.mockResolvedValue(null);
      expect(await getReadingGoal(2030)).toBeNull();
    });
  });
});
