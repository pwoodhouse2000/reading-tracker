import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/books - List all books with optional filters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    const books = await prisma.book.findMany({
      where: status ? { status: status as any } : undefined,
      include: { notes: true },
      orderBy: [
        { priority: 'asc' },
        { createdAt: 'desc' },
      ],
    });

    return NextResponse.json(books);
  } catch (error) {
    console.error('Error fetching books:', error);
    return NextResponse.json(
      { error: 'Failed to fetch books' },
      { status: 500 }
    );
  }
}

// POST /api/books - Create new book
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Convert date strings to Date objects if provided
    let dateStarted = body.dateStarted;
    let dateFinished = body.dateFinished;

    if (dateStarted && typeof dateStarted === 'string') {
      dateStarted = new Date(dateStarted);
    }
    if (dateFinished && typeof dateFinished === 'string') {
      dateFinished = new Date(dateFinished);
    }

    // Convert empty strings to null
    if (dateStarted === '') dateStarted = null;
    if (dateFinished === '') dateFinished = null;

    const book = await prisma.book.create({
      data: {
        title: body.title,
        author: body.author,
        mediaTypes: body.mediaTypes || 'PAPER',
        status: body.status || 'TO_READ',
        category: body.category || 'NON_FICTION',
        subCategory: body.subCategory,
        summary: body.summary,
        coverImageUrl: body.coverImageUrl,
        isbn: body.isbn,
        apiSource: body.apiSource,
        thoughts: body.thoughts,
        rating: body.rating,
        dateStarted,
        dateFinished,
        priority: body.priority,
      },
    });

    return NextResponse.json(book, { status: 201 });
  } catch (error) {
    console.error('Error creating book:', error);
    return NextResponse.json(
      { error: 'Failed to create book' },
      { status: 500 }
    );
  }
}
