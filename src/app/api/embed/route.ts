import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/embed?status=reading&limit=3
// Returns currently reading books for embed widget
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'READING';
    const limit = Math.min(parseInt(searchParams.get('limit') || '3'), 10);

    const validStatuses = ['READING', 'NEXT_UP', 'FINISHED'];
    const statusToQuery = validStatuses.includes(status.toUpperCase()) 
      ? status.toUpperCase() 
      : 'READING';

    const books = await prisma.book.findMany({
      where: {
        status: statusToQuery as any,
      },
      select: {
        id: true,
        title: true,
        author: true,
        coverImageUrl: true,
        status: true,
        rating: true,
        dateStarted: true,
        dateFinished: true,
      },
      orderBy: statusToQuery === 'FINISHED' 
        ? { dateFinished: 'desc' }
        : { updatedAt: 'desc' },
      take: limit,
    });

    // Add CORS headers for embedding
    const response = NextResponse.json({
      books,
      count: books.length,
      status: statusToQuery,
    });

    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET');
    response.headers.set('Cache-Control', 'public, max-age=300'); // Cache for 5 minutes

    return response;
  } catch (error) {
    console.error('Error fetching embed data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch books' },
      { status: 500 }
    );
  }
}
