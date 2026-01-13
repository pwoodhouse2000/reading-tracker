import { NextRequest, NextResponse } from 'next/server';
import { getReadingGoal, setReadingGoal, getGoalProgress } from '@/lib/services/stats';
import { requireAuth } from '@/lib/auth-guard';

// GET /api/goals?year=2026
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const yearParam = searchParams.get('year');
    const year = yearParam ? parseInt(yearParam) : new Date().getFullYear();

    const [goal, progress] = await Promise.all([
      getReadingGoal(year),
      getGoalProgress(year),
    ]);

    return NextResponse.json({
      goal: goal ? {
        year: goal.year,
        targetBooks: goal.targetBooks,
      } : null,
      progress,
    });
  } catch (error) {
    console.error('Error fetching goal:', error);
    return NextResponse.json(
      { error: 'Failed to fetch goal' },
      { status: 500 }
    );
  }
}

// POST /api/goals - Set or update a reading goal (requires auth)
export async function POST(request: NextRequest) {
  const authError = await requireAuth();
  if (authError) return authError;

  try {
    const body = await request.json();
    const { year, targetBooks } = body;
    
    console.log('Setting reading goal:', { year, targetBooks });

    if (!year || !targetBooks) {
      return NextResponse.json(
        { error: 'Year and targetBooks are required' },
        { status: 400 }
      );
    }

    if (targetBooks < 1 || targetBooks > 365) {
      return NextResponse.json(
        { error: 'Target books must be between 1 and 365' },
        { status: 400 }
      );
    }

    const goal = await setReadingGoal(year, targetBooks);
    console.log('Goal saved:', goal);
    
    const progress = await getGoalProgress(year);
    console.log('Progress calculated:', progress);

    return NextResponse.json({
      goal: {
        year: goal.year,
        targetBooks: goal.targetBooks,
      },
      progress,
    });
  } catch (error) {
    console.error('Error setting goal:', error);
    return NextResponse.json(
      { error: 'Failed to set goal' },
      { status: 500 }
    );
  }
}
