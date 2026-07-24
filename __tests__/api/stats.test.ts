/**
 * Tests for GET /api/stats
 * Mocks the stats service.
 * @jest-environment node
 */

jest.mock('@/lib/services/stats', () => ({
  getYearlyStats: jest.fn(),
  getReadingVelocity: jest.fn(),
  getGoalProgress: jest.fn(),
}));

import { getYearlyStats, getReadingVelocity, getGoalProgress } from '@/lib/services/stats';
import { GET } from '@/app/api/stats/route';

const mockGetYearlyStats = getYearlyStats as jest.Mock;
const mockGetReadingVelocity = getReadingVelocity as jest.Mock;
const mockGetGoalProgress = getGoalProgress as jest.Mock;

const request = (url: string) => ({ url }) as any;

beforeEach(() => {
  jest.clearAllMocks();
  mockGetYearlyStats.mockResolvedValue({ year: 2024, booksFinished: 10 });
  mockGetReadingVelocity.mockResolvedValue({ trend: 'up' });
  mockGetGoalProgress.mockResolvedValue({ percentage: 50 });
});

describe('GET /api/stats', () => {
  it('returns yearly stats, velocity and goal progress for the given year', async () => {
    const res = await GET(request('http://localhost/api/stats?year=2024'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({
      yearlyStats: { year: 2024, booksFinished: 10 },
      velocity: { trend: 'up' },
      goalProgress: { percentage: 50 },
    });
    expect(mockGetYearlyStats).toHaveBeenCalledWith(2024);
    expect(mockGetGoalProgress).toHaveBeenCalledWith(2024);
  });

  it('defaults to the current year when no year param is given', async () => {
    await GET(request('http://localhost/api/stats'));
    expect(mockGetYearlyStats).toHaveBeenCalledWith(new Date().getFullYear());
  });

  it('returns 500 when a service call fails', async () => {
    mockGetYearlyStats.mockRejectedValue(new Error('db down'));
    const res = await GET(request('http://localhost/api/stats'));
    expect(res.status).toBe(500);
    expect((await res.json()).error).toMatch(/failed to fetch stats/i);
  });
});
