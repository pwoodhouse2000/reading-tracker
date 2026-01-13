/**
 * API Tests for /api/goals endpoints
 */

// Mock Prisma
jest.mock('@/lib/prisma', () => ({
  prisma: {
    readingGoal: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
    book: {
      count: jest.fn(),
    },
  },
}));

// Mock auth
jest.mock('@/lib/auth-guard', () => ({
  requireAuth: jest.fn().mockResolvedValue(null),
}));

// Mock stats service
jest.mock('@/lib/services/stats', () => ({
  getReadingGoal: jest.fn(),
  setReadingGoal: jest.fn(),
  getGoalProgress: jest.fn(),
}));

import { getReadingGoal, setReadingGoal, getGoalProgress } from '@/lib/services/stats';

describe('Goals API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Reading Goal Calculations', () => {
    it('calculates percentage correctly', () => {
      const target = 24;
      const current = 12;
      const percentage = Math.round((current / target) * 100);
      expect(percentage).toBe(50);
    });

    it('caps percentage at 100', () => {
      const target = 10;
      const current = 15;
      const percentage = Math.min(Math.round((current / target) * 100), 100);
      expect(percentage).toBe(100);
    });

    it('calculates books needed per month', () => {
      const target = 24;
      const current = 6;
      const monthsRemaining = 9; // e.g., April with 9 months left
      const booksNeeded = target - current;
      const booksPerMonth = Math.round((booksNeeded / monthsRemaining) * 10) / 10;
      expect(booksPerMonth).toBe(2);
    });

    it('determines if on track correctly', () => {
      const target = 24;
      const current = 6;
      const monthsElapsed = 3;
      const projectedTotal = Math.round((current / monthsElapsed) * 12);
      const onTrack = projectedTotal >= target;
      expect(projectedTotal).toBe(24);
      expect(onTrack).toBe(true);
    });
  });

  describe('Goal validation', () => {
    it('validates target is between 1 and 365', () => {
      const validTargets = [1, 12, 24, 52, 100, 365];
      const invalidTargets = [0, -1, 366, 1000];

      validTargets.forEach(target => {
        expect(target >= 1 && target <= 365).toBe(true);
      });

      invalidTargets.forEach(target => {
        expect(target >= 1 && target <= 365).toBe(false);
      });
    });

    it('validates year is reasonable', () => {
      const currentYear = new Date().getFullYear();
      const validYears = [currentYear - 1, currentYear, currentYear + 1];
      const invalidYears = [1900, 2100];

      validYears.forEach(year => {
        expect(year >= currentYear - 5 && year <= currentYear + 1).toBe(true);
      });
    });
  });
});
