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

export interface ReportFilters {
  startDate?: Date;
  endDate?: Date;
  category?: 'FICTION' | 'NON_FICTION';
  subCategory?: string;
  minRating?: number;
}

/**
 * Get best-rated books for a given date range and optional filters
 */
export async function getBestBooks(
  filters: ReportFilters,
  limit = 10
) {
  const whereClause: any = {
    status: 'FINISHED',
  };

  // Apply minimum rating filter (default to showing all if not specified)
  if (filters.minRating && filters.minRating > 0) {
    whereClause.rating = { gte: filters.minRating };
  }

  if (filters.startDate || filters.endDate) {
    whereClause.dateFinished = {};
    if (filters.startDate) {
      whereClause.dateFinished.gte = filters.startDate;
    }
    if (filters.endDate) {
      whereClause.dateFinished.lte = filters.endDate;
    }
  } else {
    // If no date range specified, include all finished books with dates
    whereClause.dateFinished = { not: null };
  }

  if (filters.category) {
    whereClause.category = filters.category;
  }
  if (filters.subCategory) {
    whereClause.subCategory = filters.subCategory;
  }

  return await prisma.book.findMany({
    where: whereClause,
    orderBy: [
      { rating: 'desc' },
      { dateFinished: 'desc' },
    ],
    take: limit,
  });
}

// Backward compatibility function
export async function getBestBooksByYear(
  year: number,
  category?: 'FICTION' | 'NON_FICTION',
  limit = 10
) {
  return getBestBooks({
    startDate: new Date(`${year}-01-01`),
    endDate: new Date(`${year}-12-31T23:59:59`),
    category,
  }, limit);
}

/**
 * Get comprehensive reading statistics for a date range
 */
export async function getReadingStats(filters: ReportFilters): Promise<ReadingStats> {
  const whereClause: any = {
    status: 'FINISHED',
  };

  if (filters.startDate || filters.endDate) {
    whereClause.dateFinished = {};
    if (filters.startDate) {
      whereClause.dateFinished.gte = filters.startDate;
    }
    if (filters.endDate) {
      whereClause.dateFinished.lte = filters.endDate;
    }
  } else {
    whereClause.dateFinished = { not: null };
  }

  if (filters.category) {
    whereClause.category = filters.category;
  }
  if (filters.subCategory) {
    whereClause.subCategory = filters.subCategory;
  }

  const books = await prisma.book.findMany({
    where: whereClause,
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
      paper: books.filter(b => b.mediaTypes?.includes('PAPER')).length,
      audiobook: books.filter(b => b.mediaTypes?.includes('AUDIOBOOK')).length,
      ebook: books.filter(b => b.mediaTypes?.includes('EBOOK')).length,
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

// Backward compatibility function
export async function getReadingStatsByYear(year: number): Promise<ReadingStats> {
  return getReadingStats({
    startDate: new Date(`${year}-01-01`),
    endDate: new Date(`${year}-12-31T23:59:59`),
  });
}

/**
 * Get monthly reading counts for a date range
 */
export async function getMonthlyReadingCounts(filters: ReportFilters): Promise<MonthlyCount[]> {
  const whereClause: any = {
    status: 'FINISHED',
  };

  if (filters.startDate || filters.endDate) {
    whereClause.dateFinished = {};
    if (filters.startDate) {
      whereClause.dateFinished.gte = filters.startDate;
    }
    if (filters.endDate) {
      whereClause.dateFinished.lte = filters.endDate;
    }
  } else {
    whereClause.dateFinished = { not: null };
  }

  if (filters.category) {
    whereClause.category = filters.category;
  }
  if (filters.subCategory) {
    whereClause.subCategory = filters.subCategory;
  }

  const books = await prisma.book.findMany({
    where: whereClause,
    select: { dateFinished: true },
    orderBy: { dateFinished: 'asc' },
  });

  // If we have a specific year range (12 months or less), show monthly breakdown
  // Otherwise, show year-by-year counts
  const firstBook = books.find(b => b.dateFinished !== null);
  const lastBook = [...books].reverse().find(b => b.dateFinished !== null);
  
  const startYear = filters.startDate ? filters.startDate.getFullYear() : 
    (firstBook?.dateFinished ? new Date(firstBook.dateFinished).getFullYear() : new Date().getFullYear());
  const endYear = filters.endDate ? filters.endDate.getFullYear() :
    (lastBook?.dateFinished ? new Date(lastBook.dateFinished).getFullYear() : new Date().getFullYear());

  // If single year or specific year range, show months
  if (filters.startDate && filters.endDate && 
      (endYear - startYear <= 1)) {
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
  } else {
    // For "All Time" or multi-year ranges, show year-by-year
    const yearCounts: Record<number, number> = {};
    
    books.forEach(book => {
      if (book.dateFinished) {
        const year = new Date(book.dateFinished).getFullYear();
        yearCounts[year] = (yearCounts[year] || 0) + 1;
      }
    });

    const years = Object.keys(yearCounts).map(Number).sort((a, b) => a - b);
    return years.map(year => ({
      month: year.toString(),
      count: yearCounts[year],
    }));
  }
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
 * Get top authors by number of books read with filters
 */
export async function getTopAuthorsWithFilters(filters: ReportFilters, limit = 5) {
  const whereClause: any = {
    status: 'FINISHED',
  };

  if (filters.startDate || filters.endDate) {
    whereClause.dateFinished = {};
    if (filters.startDate) {
      whereClause.dateFinished.gte = filters.startDate;
    }
    if (filters.endDate) {
      whereClause.dateFinished.lte = filters.endDate;
    }
  } else {
    whereClause.dateFinished = { not: null };
  }

  if (filters.category) {
    whereClause.category = filters.category;
  }
  if (filters.subCategory) {
    whereClause.subCategory = filters.subCategory;
  }

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

// Backward compatibility function
export async function getTopAuthors(year?: number, limit = 5) {
  if (year) {
    return getTopAuthorsWithFilters({
      startDate: new Date(`${year}-01-01`),
      endDate: new Date(`${year}-12-31T23:59:59`),
    }, limit);
  } else {
    return getTopAuthorsWithFilters({}, limit);
  }
}
