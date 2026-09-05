import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isAuthenticated } from '@/lib/auth';
import { privateHeaders } from '@/lib/privacy';
import { getAuthorData } from '@/lib/services/authors';
import { searchPodcastEpisodes, isPodcastSearchEnabled } from '@/lib/services/podcasts';

interface RouteParams {
  params: Promise<{ name: string }>;
}

// GET /api/authors/[name] - Get author details and user's books by this author
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { name } = await params;
    const authorName = decodeURIComponent(name);
    const admin = await isAuthenticated();

    // Fetch external author data, user's books, and podcasts in parallel
    const [externalData, userBooks, podcastData] = await Promise.all([
      getAuthorData(authorName),
      prisma.book.findMany({
        where: {
          author: {
            contains: authorName,
          },
        },
        include: {
          notes: {
            where: admin ? undefined : { isPublic:true, isQuote:true },
            select: {
              id: true,
              content: true,
              page: true,
            },
            take: 5,
          },
        },
        orderBy: { dateFinished: 'desc' },
      }),
      // Only search podcasts if API is configured
      isPodcastSearchEnabled() ? searchPodcastEpisodes(authorName, 8) : Promise.resolve(null),
    ]);

    // Calculate user stats for this author
    const finishedBooks = userBooks.filter(b => b.status === 'FINISHED');
    const ratedBooks = finishedBooks.filter(b => b.rating !== null);
    const averageRating = ratedBooks.length > 0
      ? ratedBooks.reduce((sum, b) => sum + (b.rating || 0), 0) / ratedBooks.length
      : null;

    // Get all notes from user's books by this author
    const allNotes = userBooks.flatMap(book => 
      book.notes.map(note => ({
        ...note,
        bookTitle: book.title,
        bookId: book.id,
      }))
    );

    // Generate external links
    const externalLinks = {
      goodreads: `https://www.goodreads.com/search?q=${encodeURIComponent(authorName)}&search_type=authors`,
      amazon: `https://www.amazon.com/s?k=${encodeURIComponent(authorName)}&i=stripbooks`,
      google: `https://www.google.com/search?q=${encodeURIComponent(authorName + ' author')}`,
      googleBooks: `https://www.google.com/search?tbm=bks&q=${encodeURIComponent('inauthor:' + authorName)}`,
      interviews: `https://www.google.com/search?q=${encodeURIComponent(authorName + ' interview')}`,
      podcasts: `https://www.google.com/search?q=${encodeURIComponent(authorName + ' podcast interview')}`,
    };

    return NextResponse.json({
      name: authorName,
      // External data from APIs
      bio: externalData.author?.bio || externalData.wikipedia?.extract,
      photoUrl: externalData.author?.photoUrl,
      birthDate: externalData.author?.birthDate,
      deathDate: externalData.author?.deathDate,
      alternateNames: externalData.author?.alternateNames,
      topSubjects: externalData.author?.topSubjects,
      wikipedia: externalData.wikipedia,
      otherWorks: externalData.works.slice(0, 12), // Limit to 12 works
      // User's data
      userBooks: userBooks.map(book => ({
        id: book.id,
        title: book.title,
        status: book.status,
        rating: book.rating,
        dateFinished: book.dateFinished,
        coverImageUrl: book.coverImageUrl,
        thoughts: admin ? book.thoughts : null,
      })),
      userStats: {
        totalBooks: userBooks.length,
        booksFinished: finishedBooks.length,
        averageRating: averageRating ? Math.round(averageRating * 10) / 10 : null,
      },
      userNotes: allNotes.slice(0, 10), // Limit to 10 most recent notes
      externalLinks,
      // Podcast data (if available)
      podcasts: podcastData ? {
        episodes: podcastData.episodes,
        totalFound: podcastData.total,
        enabled: true,
      } : {
        episodes: [],
        totalFound: 0,
        enabled: isPodcastSearchEnabled(),
      },
    }, {headers:privateHeaders});
  } catch (error) {
    console.error('Error fetching author data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch author data' },
      { status: 500 }
    );
  }
}
