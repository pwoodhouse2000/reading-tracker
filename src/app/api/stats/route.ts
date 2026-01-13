import { NextRequest, NextResponse } from 'next/server';
import { getYearlyStats, getReadingVelocity, getGoalProgress } from '@/lib/services/stats';

// GET /api/stats?year=2026
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const yearParam = searchParams.get('year');
    const year = yearParam ? parseInt(yearParam) : new Date().getFullYear();

    const [yearlyStats, velocity, goalProgress] = await Promise.all([
      getYearlyStats(year),
      getReadingVelocity(),
      getGoalProgress(year),
    ]);

    return NextResponse.json({
      yearlyStats,
      velocity,
      goalProgress,
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    );
  }
}
