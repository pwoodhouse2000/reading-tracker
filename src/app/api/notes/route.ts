import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-guard';
import { isAuthenticated } from '@/lib/auth';
import { privateHeaders } from '@/lib/privacy';
import { InputError } from '@/lib/book-validation';
import { validateNote } from '@/lib/note-validation';

// GET /api/notes - List all notes with optional filters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const bookId = searchParams.get('bookId');
    const search = searchParams.get('search');

    const where: any = {};
    if (!await isAuthenticated()) { where.isPublic = true; where.isQuote = true; }

    if (bookId) {
      where.bookId = bookId;
    }

    if (search) {
      where.content = {
        contains: search,
      };
    }

    const notes = await prisma.note.findMany({
      where,
      include: {
        book: {
          select: {
            id: true,
            title: true,
            author: true,
            coverImageUrl: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(notes, { headers: privateHeaders });
  } catch (error) {
    console.error('Error fetching notes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notes' },
      { status: 500 }
    );
  }
}

// POST /api/notes - Create new note (requires auth)
export async function POST(request: NextRequest) {
  const authError = await requireAuth();
  if (authError) return authError;

  try {
    const body = await request.json();
    const { bookId, content } = body;
    const data = validateNote(body, true);
    if (data.isPublic && !data.isQuote) throw new InputError('Only quotes can be shared publicly');

    if (!bookId || !content) {
      return NextResponse.json(
        { error: 'Book ID and content are required' },
        { status: 400 }
      );
    }

    const note = await prisma.note.create({
      data: {
        bookId,
        ...data,
        content: data.content!,
      },
      include: {
        book: {
          select: {
            id: true,
            title: true,
            author: true,
          },
        },
      },
    });

    return NextResponse.json(note, { status: 201 });
  } catch (error) {
    if (error instanceof InputError || error instanceof SyntaxError) return NextResponse.json({ error: error.message }, { status: 400 });
    console.error('Error creating note:', error);
    return NextResponse.json(
      { error: 'Failed to create note' },
      { status: 500 }
    );
  }
}
