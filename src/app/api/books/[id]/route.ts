import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-guard';
import { isAuthenticated } from '@/lib/auth';
import { bookForViewer, privateHeaders } from '@/lib/privacy';
import { InputError, validateBook, validateProgress } from '@/lib/book-validation';

// GET /api/books/[id] - Get single book
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const book = await prisma.book.findUnique({
      where: { id },
      include: { notes: true },
    });

    if (!book) {
      return NextResponse.json(
        { error: 'Book not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(bookForViewer(book, await isAuthenticated()), { headers: privateHeaders });
  } catch (error) {
    console.error('Error fetching book:', error);
    return NextResponse.json(
      { error: 'Failed to fetch book' },
      { status: 500 }
    );
  }
}

// PATCH /api/books/[id] - Update book (requires auth)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireAuth();
  if (authError) return authError;
  
  try {
    const { id } = await params;
    const body = validateBook(await request.json());
    const existing = await prisma.book.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: 'Book not found' }, { status: 404 });
    if (existing.status === 'FINISHED' && body.status === 'READING') return NextResponse.json({error:'Use Start a reread on the book page to preserve your completed reading'}, {status:409});

    // Auto-set dates based on status changes
    if (body.status === 'READING' && body.dateStarted === undefined && !existing.dateStarted) {
      body.dateStarted = new Date();
    }
    if (body.status === 'FINISHED' && body.dateFinished === undefined && !existing.dateFinished) {
      body.dateFinished = new Date();
    }

    // Convert date strings to Date objects if provided
    if (body.dateStarted && typeof body.dateStarted === 'string') {
      body.dateStarted = new Date(body.dateStarted);
    }
    if (body.dateFinished && typeof body.dateFinished === 'string') {
      body.dateFinished = new Date(body.dateFinished);
    }

    // Convert empty strings to null for dates
    if (body.dateStarted === '') {
      body.dateStarted = null;
    }
    if (body.dateFinished === '') {
      body.dateFinished = null;
    }

    // Page progress auto-behaviors based on status changes
    if (body.status === 'FINISHED') {
      // Mark the book as fully read when we know the total page count
      let totalPages = body.totalPages;
      if (totalPages === undefined) {
        totalPages = existing?.totalPages;
      }
      if (totalPages) {
        body.currentPage = totalPages;
      }
      body.progressPercent = 100;
      body.audioMinutes = body.totalAudioMinutes ?? existing.totalAudioMinutes;
    }
    if (body.status === 'TO_READ') {
      // Reset progress when the book goes back on the shelf
      body.currentPage = null;
      body.audioMinutes = null;
      body.progressPercent = null;
    }
    validateProgress({ ...existing, ...body });

    const book = await prisma.book.update({
      where: { id },
      data: body,
      include: { notes: true },
    });

    return NextResponse.json(book);
  } catch (error) {
    if (error instanceof InputError || error instanceof SyntaxError) return NextResponse.json({ error: error.message }, { status: 400 });
    console.error('Error updating book:', error);
    return NextResponse.json(
      { error: 'Failed to update book' },
      { status: 500 }
    );
  }
}

// DELETE /api/books/[id] - Delete book (requires auth)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireAuth();
  if (authError) return authError;
  
  try {
    const { id } = await params;

    await prisma.book.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting book:', error);
    return NextResponse.json(
      { error: 'Failed to delete book' },
      { status: 500 }
    );
  }
}
