import { NextRequest, NextResponse } from 'next/server';
import {
  getBestBooksByYear,
  getReadingStatsByYear,
  getMonthlyReadingCounts,
  getTopAuthors,
} from '@/lib/services/reports';

// GET /api/reports?year=2024&category=FICTION
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const yearParam = searchParams.get('year');
    const categoryParam = searchParams.get('category');

    // Default to current year if not specified
    const year = yearParam ? parseInt(yearParam) : new Date().getFullYear();
    const category = categoryParam as 'FICTION' | 'NON_FICTION' | undefined;

    // Fetch all report data in parallel
    const [bestBooks, stats, monthlyCounts, topAuthors] = await Promise.all([
      getBestBooksByYear(year, category),
      getReadingStatsByYear(year),
      getMonthlyReadingCounts(year),
      getTopAuthors(year),
    ]);

    return NextResponse.json({
      year,
      category: category || 'all',
      bestBooks,
      stats,
      monthlyCounts,
      topAuthors,
    });
  } catch (error) {
    console.error('Error generating reports:', error);
    return NextResponse.json(
      { error: 'Failed to generate reports' },
      { status: 500 }
    );
  }
}
