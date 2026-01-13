import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-guard';

interface ReorderUpdate {
  id: string;
  priority: number;
}

// POST /api/books/reorder - Update book priorities (requires auth)
export async function POST(request: NextRequest) {
  const authError = await requireAuth();
  if (authError) return authError;

  try {
    const { updates } = await request.json() as { updates: ReorderUpdate[] };

    if (!updates || !Array.isArray(updates)) {
      return NextResponse.json(
        { error: 'Updates array is required' },
        { status: 400 }
      );
    }

    // Update all priorities in a transaction
    await prisma.$transaction(
      updates.map((update) =>
        prisma.book.update({
          where: { id: update.id },
          data: { priority: update.priority },
        })
      )
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error reordering books:', error);
    return NextResponse.json(
      { error: 'Failed to reorder books' },
      { status: 500 }
    );
  }
}
