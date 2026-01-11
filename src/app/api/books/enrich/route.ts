import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { searchBooks } from '@/lib/services/book-api';

// POST /api/books/enrich
// Enrich all books (or specific book) with cover images and summaries
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { bookId } = body;

    // Get books to enrich
    const books = bookId
      ? [await prisma.book.findUnique({ where: { id: bookId } })]
      : await prisma.book.findMany({
          where: {
            OR: [
              { coverImageUrl: null },
              { summary: null },
            ],
          },
          take: 50, // Process 50 at a time to avoid timeout
        });

    let enriched = 0;
    let skipped = 0;

    for (const book of books) {
      if (!book) continue;

      // Skip if already has both cover and summary
      if (book.coverImageUrl && book.summary) {
        skipped++;
        continue;
      }

      try {
        // Search for book info
        const results = await searchBooks(`${book.title} ${book.author}`);

        if (results.length > 0) {
          const bookInfo = results[0];

          // Update book with new info
          await prisma.book.update({
            where: { id: book.id },
            data: {
              coverImageUrl: book.coverImageUrl || bookInfo.coverImageUrl,
              summary: book.summary || bookInfo.summary,
              isbn: book.isbn || bookInfo.isbn,
              apiSource: bookInfo.apiSource || 'open_library',
            },
          });

          enriched++;
        } else {
          skipped++;
        }
      } catch (error) {
        console.error(`Error enriching book ${book.title}:`, error);
        skipped++;
      }

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return NextResponse.json({
      success: true,
      enriched,
      skipped,
      message: `Enriched ${enriched} books, skipped ${skipped}`,
    });
  } catch (error) {
    console.error('Error enriching books:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Enrichment failed' },
      { status: 500 }
    );
  }
}
