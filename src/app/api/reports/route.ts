import { NextRequest, NextResponse } from 'next/server';
import {
  getBestBooks,
  getReadingStats,
  getMonthlyReadingCounts,
  getTopAuthorsWithFilters,
  type ReportFilters,
} from '@/lib/services/reports';

// GET /api/reports?year=2024&category=FICTION&subCategory=Health&allTime=true&startDate=2024-01-01&endDate=2024-12-31
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const yearParam = searchParams.get('year');
    const categoryParam = searchParams.get('category');
    const subCategoryParam = searchParams.get('subCategory');
    const allTimeParam = searchParams.get('allTime');
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');
    const minRatingParam = searchParams.get('minRating');

    const filters: ReportFilters = {};

    // Handle minimum rating filter
    if (minRatingParam) {
      filters.minRating = parseInt(minRatingParam);
    }

    // Handle category filter
    if (categoryParam && categoryParam !== 'all') {
      filters.category = categoryParam as 'FICTION' | 'NON_FICTION';
    }

    // Handle sub-category filter
    if (subCategoryParam) {
      filters.subCategory = subCategoryParam;
    }

    // Handle date range
    if (allTimeParam === 'true') {
      // No date filters for all time
    } else if (startDateParam && endDateParam) {
      // Custom date range
      filters.startDate = new Date(startDateParam);
      filters.endDate = new Date(endDateParam);
    } else if (yearParam) {
      // Year-based filter
      const year = parseInt(yearParam);
      filters.startDate = new Date(`${year}-01-01`);
      filters.endDate = new Date(`${year}-12-31T23:59:59`);
    } else {
      // Default to current year
      const year = new Date().getFullYear();
      filters.startDate = new Date(`${year}-01-01`);
      filters.endDate = new Date(`${year}-12-31T23:59:59`);
    }

    // Fetch all report data in parallel
    const [bestBooks, stats, monthlyCounts, topAuthors] = await Promise.all([
      getBestBooks(filters),
      getReadingStats(filters),
      getMonthlyReadingCounts(filters),
      getTopAuthorsWithFilters(filters),
    ]);

    return NextResponse.json({
      filters: {
        year: yearParam,
        category: categoryParam || 'all',
        subCategory: subCategoryParam || null,
        allTime: allTimeParam === 'true',
        startDate: startDateParam,
        endDate: endDateParam,
      },
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
