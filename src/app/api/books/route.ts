import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-guard';
import { isAuthenticated } from '@/lib/auth';
import { bookForViewer, privateHeaders } from '@/lib/privacy';
import { InputError, statuses, validateBook, validateProgress } from '@/lib/book-validation';
import { Prisma } from '@prisma/client';

// GET /api/books - List all books with optional filters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    if (status && !statuses.includes(status as typeof statuses[number])) return NextResponse.json({ error: 'Invalid status' }, { status: 400 });

    const books = await prisma.book.findMany({
      where: status ? { status: status as any } : undefined,
      include: { notes: true },
      orderBy: [
        { priority: 'asc' },
        { createdAt: 'desc' },
      ],
    });

    const admin = await isAuthenticated();
    return NextResponse.json(books.map(b => bookForViewer(b, admin)), { headers: privateHeaders });
  } catch (error) {
    console.error('Error fetching books:', error);
    return NextResponse.json(
      { error: 'Failed to fetch books' },
      { status: 500 }
    );
  }
}

// POST /api/books - Create new book (requires auth)
export async function POST(request: NextRequest) {
  const authError = await requireAuth();
  if (authError) return authError;
  
  try {
    const body = validateBook(await request.json(), true) as Prisma.BookUncheckedCreateInput;
    if (body.status === 'READING' && !body.dateStarted) body.dateStarted = new Date();
    if (body.status === 'FINISHED' && !body.dateFinished) body.dateFinished = new Date();
    validateProgress(body);

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
        currentPage: body.currentPage,
        totalPages: body.totalPages,
        audioMinutes: body.audioMinutes,
        totalAudioMinutes: body.totalAudioMinutes,
        progressPercent: body.progressPercent,
      },
    });

    return NextResponse.json(book, { status: 201 });
  } catch (error) {
    if (error instanceof InputError || error instanceof SyntaxError) return NextResponse.json({ error: error.message }, { status: 400 });
    console.error('Error creating book:', error);
    return NextResponse.json(
      { error: 'Failed to create book' },
      { status: 500 }
    );
  }
}
