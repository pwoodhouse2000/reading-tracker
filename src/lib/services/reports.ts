import { prisma } from '@/lib/prisma';

export interface ReadingStats {
  total: number;
  byCategory: {
    fiction: number;
    nonFiction: number;
  };
  byMedia: {
    paper: number;
    audiobook: number;
    ebook: number;
  };
  byStatus: {
    toRead: number;
    nextUp: number;
    reading: number;
    paused: number;
    finished: number;
  };
  averageRating: number;
}

export interface MonthlyCount {
  month: string;
  count: number;
}

/**
 * Get best-rated books for a given year and optional category
 */
export async function getBestBooksByYear(
  year: number,
  category?: 'FICTION' | 'NON_FICTION',
  limit = 10
) {
  return await prisma.book.findMany({
    where: {
      status: 'FINISHED',
      dateFinished: {
        gte: new Date(`${year}-01-01`),
        lte: new Date(`${year}-12-31T23:59:59`),
      },
      ...(category && { category }),
      rating: { gte: 4 }, // Only 4 and 5 star books
    },
    orderBy: [
      { rating: 'desc' },
      { dateFinished: 'desc' },
    ],
    take: limit,
  });
}

/**
 * Get comprehensive reading statistics for a year
 */
export async function getReadingStatsByYear(year: number): Promise<ReadingStats> {
  const books = await prisma.book.findMany({
    where: {
      status: 'FINISHED',
      dateFinished: {
        gte: new Date(`${year}-01-01`),
        lte: new Date(`${year}-12-31T23:59:59`),
      },
    },
  });

  // Calculate average rating (only for rated books)
  const ratedBooks = books.filter(b => b.rating !== null);
  const averageRating = ratedBooks.length > 0
    ? ratedBooks.reduce((sum, b) => sum + (b.rating || 0), 0) / ratedBooks.length
    : 0;

  // Get all books for status counts
  const allBooks = await prisma.book.findMany({
    select: {
      status: true,
    },
  });

  return {
    total: books.length,
    byCategory: {
      fiction: books.filter(b => b.category === 'FICTION').length,
      nonFiction: books.filter(b => b.category === 'NON_FICTION').length,
    },
    byMedia: {
      paper: books.filter(b => b.mediaType === 'PAPER').length,
      audiobook: books.filter(b => b.mediaType === 'AUDIOBOOK').length,
      ebook: books.filter(b => b.mediaType === 'EBOOK').length,
    },
    byStatus: {
      toRead: allBooks.filter(b => b.status === 'TO_READ').length,
      nextUp: allBooks.filter(b => b.status === 'NEXT_UP').length,
      reading: allBooks.filter(b => b.status === 'READING').length,
      paused: allBooks.filter(b => b.status === 'PAUSED').length,
      finished: allBooks.filter(b => b.status === 'FINISHED').length,
    },
    averageRating: Math.round(averageRating * 10) / 10,
  };
}

/**
 * Get monthly reading counts for a year
 */
export async function getMonthlyReadingCounts(year: number): Promise<MonthlyCount[]> {
  const books = await prisma.book.findMany({
    where: {
      status: 'FINISHED',
      dateFinished: {
        gte: new Date(`${year}-01-01`),
        lte: new Date(`${year}-12-31T23:59:59`),
      },
    },
    select: { dateFinished: true },
  });

  const monthNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];

  const monthCounts = Array(12).fill(0);

  books.forEach(book => {
    if (book.dateFinished) {
      const month = new Date(book.dateFinished).getMonth();
      monthCounts[month]++;
    }
  });

  return monthNames.map((month, index) => ({
    month,
    count: monthCounts[index],
  }));
}

/**
 * Get reading streak information
 */
export async function getReadingStreak() {
  const books = await prisma.book.findMany({
    where: {
      status: 'FINISHED',
      dateFinished: { not: null },
    },
    orderBy: { dateFinished: 'desc' },
    select: { dateFinished: true },
  });

  if (books.length === 0) {
    return { currentStreak: 0, longestStreak: 0 };
  }

  // Simple streak calculation based on consecutive days with finished books
  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Check if there's a book finished today or yesterday for current streak
  const mostRecent = books[0].dateFinished;
  if (mostRecent) {
    const daysSinceLastBook = Math.floor(
      (today.getTime() - new Date(mostRecent).getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysSinceLastBook <= 1) {
      currentStreak = 1;
    }
  }

  return { currentStreak, longestStreak };
}

/**
 * Get top authors by number of books read
 */
export async function getTopAuthors(year?: number, limit = 5) {
  const whereClause = year
    ? {
        status: 'FINISHED' as const,
        dateFinished: {
          gte: new Date(`${year}-01-01`),
          lte: new Date(`${year}-12-31T23:59:59`),
        },
      }
    : { status: 'FINISHED' as const };

  const books = await prisma.book.findMany({
    where: whereClause,
    select: { author: true },
  });

  // Count books per author
  const authorCounts = books.reduce((acc, book) => {
    acc[book.author] = (acc[book.author] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Sort and return top authors
  return Object.entries(authorCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, limit)
    .map(([author, count]) => ({ author, count }));
}
