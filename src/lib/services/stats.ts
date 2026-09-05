import { prisma } from '@/lib/prisma';
import { historyBooks, historyCount } from './reading-history';

export interface MonthlyStats {
  month: number; // 1-12
  year: number;
  booksFinished: number;
  booksStarted: number;
}

export interface YearlyStats {
  year: number;
  booksFinished: number;
  booksStarted: number;
  averageRating: number | null;
  totalRated: number;
  byCategory: {
    fiction: number;
    nonFiction: number;
  };
  byMonth: MonthlyStats[];
  topSubCategories: { name: string; count: number }[];
  averageDaysToFinish: number | null;
}

export interface ReadingVelocity {
  currentYear: {
    booksPerMonth: number;
    totalBooks: number;
    monthsElapsed: number;
  };
  previousYear: {
    booksPerMonth: number;
    totalBooks: number;
  } | null;
  trend: 'up' | 'down' | 'same' | 'no_data';
  trendPercentage: number | null;
}

export interface GoalProgress {
  year: number;
  target: number;
  current: number;
  percentage: number;
  onTrack: boolean;
  projectedTotal: number;
  booksNeededPerMonth: number;
}

// Get monthly breakdown for a year
export async function getMonthlyStats(year: number): Promise<MonthlyStats[]> {
  const startOfYear = new Date(year, 0, 1);
  const endOfYear = new Date(year + 1, 0, 1);

  const books = await historyBooks({
    where: {
      OR: [
        {
          dateFinished: {
            gte: startOfYear,
            lt: endOfYear,
          },
        },
        {
          dateStarted: {
            gte: startOfYear,
            lt: endOfYear,
          },
        },
      ],
    },
    select: {
      dateStarted: true,
      dateFinished: true,
    },
  });

  const monthlyStats: MonthlyStats[] = [];

  for (let month = 1; month <= 12; month++) {
    const finished = books.filter((book) => {
      if (!book.dateFinished) return false;
      const d = new Date(book.dateFinished);
      return d.getMonth() + 1 === month && d.getFullYear() === year;
    }).length;

    const started = books.filter((book) => {
      if (!book.dateStarted) return false;
      const d = new Date(book.dateStarted);
      return d.getMonth() + 1 === month && d.getFullYear() === year;
    }).length;

    monthlyStats.push({
      month,
      year,
      booksFinished: finished,
      booksStarted: started,
    });
  }

  return monthlyStats;
}

// Get comprehensive yearly stats
export async function getYearlyStats(year: number): Promise<YearlyStats> {
  const startOfYear = new Date(year, 0, 1);
  const endOfYear = new Date(year + 1, 0, 1);

  const finishedBooks = await historyBooks({
    where: {
      dateFinished: {
        gte: startOfYear,
        lt: endOfYear,
      },
      status: 'FINISHED',
    },
    select: {
      rating: true,
      category: true,
      subCategory: true,
      dateStarted: true,
      dateFinished: true,
    },
  });

  const startedBooks = await historyCount({
      dateStarted: {
        gte: startOfYear,
        lt: endOfYear,
      },
  });

  // Calculate average rating
  const ratedBooks = finishedBooks.filter((b) => b.rating !== null);
  const averageRating =
    ratedBooks.length > 0
      ? ratedBooks.reduce((sum, b) => sum + (b.rating || 0), 0) / ratedBooks.length
      : null;

  // Category breakdown
  const fiction = finishedBooks.filter((b) => b.category === 'FICTION').length;
  const nonFiction = finishedBooks.filter((b) => b.category === 'NON_FICTION').length;

  // Sub-category breakdown
  const subCategoryCounts: Record<string, number> = {};
  finishedBooks.forEach((book) => {
    if (book.subCategory) {
      subCategoryCounts[book.subCategory] = (subCategoryCounts[book.subCategory] || 0) + 1;
    }
  });
  const topSubCategories = Object.entries(subCategoryCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Average days to finish
  const booksWithBothDates = finishedBooks.filter((b) => b.dateStarted && b.dateFinished);
  const averageDaysToFinish =
    booksWithBothDates.length > 0
      ? booksWithBothDates.reduce((sum, b) => {
          const start = new Date(b.dateStarted!).getTime();
          const end = new Date(b.dateFinished!).getTime();
          return sum + (end - start) / (1000 * 60 * 60 * 24);
        }, 0) / booksWithBothDates.length
      : null;

  // Monthly breakdown
  const byMonth = await getMonthlyStats(year);

  return {
    year,
    booksFinished: finishedBooks.length,
    booksStarted: startedBooks,
    averageRating: averageRating ? Math.round(averageRating * 10) / 10 : null,
    totalRated: ratedBooks.length,
    byCategory: { fiction, nonFiction },
    byMonth,
    topSubCategories,
    averageDaysToFinish: averageDaysToFinish ? Math.round(averageDaysToFinish) : null,
  };
}

// Get reading velocity
export async function getReadingVelocity(): Promise<ReadingVelocity> {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const previousYear = currentYear - 1;

  // Current year stats
  const currentYearBooks = await historyCount({
      dateFinished: {
        gte: new Date(currentYear, 0, 1),
        lt: new Date(currentYear + 1, 0, 1),
      },
      status: 'FINISHED',
  });

  // Previous year stats
  const previousYearBooks = await historyCount({
      dateFinished: {
        gte: new Date(previousYear, 0, 1),
        lt: new Date(previousYear + 1, 0, 1),
      },
      status: 'FINISHED',
  });

  const currentBooksPerMonth = currentMonth > 0 ? currentYearBooks / currentMonth : 0;
  const previousBooksPerMonth = previousYearBooks / 12;

  let trend: 'up' | 'down' | 'same' | 'no_data' = 'no_data';
  let trendPercentage: number | null = null;

  if (previousYearBooks > 0 && currentYearBooks > 0) {
    const diff = currentBooksPerMonth - previousBooksPerMonth;
    trendPercentage = Math.round((diff / previousBooksPerMonth) * 100);
    
    if (Math.abs(trendPercentage) < 5) {
      trend = 'same';
    } else if (trendPercentage > 0) {
      trend = 'up';
    } else {
      trend = 'down';
    }
  }

  return {
    currentYear: {
      booksPerMonth: Math.round(currentBooksPerMonth * 10) / 10,
      totalBooks: currentYearBooks,
      monthsElapsed: currentMonth,
    },
    previousYear: previousYearBooks > 0 ? {
      booksPerMonth: Math.round(previousBooksPerMonth * 10) / 10,
      totalBooks: previousYearBooks,
    } : null,
    trend,
    trendPercentage,
  };
}

// Get goal progress
export async function getGoalProgress(year?: number): Promise<GoalProgress | null> {
  const targetYear = year || new Date().getFullYear();
  
  const goal = await prisma.readingGoal.findUnique({
    where: { year: targetYear },
  });

  if (!goal) {
    return null;
  }

  const booksFinished = await historyCount({
      dateFinished: {
        gte: new Date(targetYear, 0, 1),
        lt: new Date(targetYear + 1, 0, 1),
      },
      status: 'FINISHED',
  });

  const now = new Date();
  const currentMonth = now.getFullYear() === targetYear ? now.getMonth() + 1 : 12;
  const monthsRemaining = 12 - currentMonth;
  
  const percentage = Math.round((booksFinished / goal.targetBooks) * 100);
  const projectedTotal = currentMonth > 0 
    ? Math.round((booksFinished / currentMonth) * 12)
    : 0;
  
  const booksNeeded = goal.targetBooks - booksFinished;
  const booksNeededPerMonth = monthsRemaining > 0 
    ? Math.round((booksNeeded / monthsRemaining) * 10) / 10
    : 0;

  return {
    year: targetYear,
    target: goal.targetBooks,
    current: booksFinished,
    percentage: Math.min(percentage, 100),
    onTrack: projectedTotal >= goal.targetBooks,
    projectedTotal,
    booksNeededPerMonth: Math.max(0, booksNeededPerMonth),
  };
}

// Set or update goal
export async function setReadingGoal(year: number, targetBooks: number) {
  return prisma.readingGoal.upsert({
    where: { year },
    update: { targetBooks },
    create: { year, targetBooks },
  });
}

// Get goal for a year
export async function getReadingGoal(year: number) {
  return prisma.readingGoal.findUnique({
    where: { year },
  });
}
