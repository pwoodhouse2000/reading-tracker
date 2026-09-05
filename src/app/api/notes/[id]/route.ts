import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-guard';
import { isAuthenticated } from '@/lib/auth';
import { privateHeaders } from '@/lib/privacy';
import { InputError } from '@/lib/book-validation';
import { validateNote } from '@/lib/note-validation';

// GET /api/notes/[id] - Get single note
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const note = await prisma.note.findUnique({
      where: { id },
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
    });

    if (!note || (!(note.isPublic && note.isQuote) && !await isAuthenticated())) {
      return NextResponse.json(
        { error: 'Note not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(note, { headers: privateHeaders });
  } catch (error) {
    console.error('Error fetching note:', error);
    return NextResponse.json(
      { error: 'Failed to fetch note' },
      { status: 500 }
    );
  }
}

// PATCH /api/notes/[id] - Update note (requires auth)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireAuth();
  if (authError) return authError;

  try {
    const { id } = await params;
    const body = await request.json();
    const data = validateNote(body);
    const existing = await prisma.note.findUnique({ where:{id} });
    if (!existing) return NextResponse.json({error:'Note not found'}, {status:404});
    if (data.isPublic && !(data.isQuote ?? existing.isQuote)) throw new InputError('Only quotes can be shared publicly');

    const note = await prisma.note.update({
      where: { id },
      data,
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

    return NextResponse.json(note);
  } catch (error) {
    if (error instanceof InputError || error instanceof SyntaxError) return NextResponse.json({ error: error.message }, { status: 400 });
    console.error('Error updating note:', error);
    return NextResponse.json(
      { error: 'Failed to update note' },
      { status: 500 }
    );
  }
}

// DELETE /api/notes/[id] - Delete note (requires auth)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireAuth();
  if (authError) return authError;

  try {
    const { id } = await params;

    await prisma.note.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting note:', error);
    return NextResponse.json(
      { error: 'Failed to delete note' },
      { status: 500 }
    );
  }
}
