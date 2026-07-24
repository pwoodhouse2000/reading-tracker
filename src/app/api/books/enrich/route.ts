import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { enrichBook } from '@/lib/services/book-api';

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
              { coverImageUrl: '' },
              { summary: null },
              { summary: '' },
            ],
          },
          take: 50, // Process 50 at a time to avoid timeout
        });

    let enriched = 0;
    let skipped = 0;
    const results: { title: string; status: string }[] = [];

    for (const book of books) {
      if (!book) continue;

      // Skip if already has both cover and summary
      if (book.coverImageUrl && book.summary) {
        skipped++;
        results.push({ title: book.title, status: 'already_complete' });
        continue;
      }

      try {
        // Use the improved enrichment function that queries both APIs
        const enrichmentData = await enrichBook(book.title, book.author);

        if (enrichmentData && (enrichmentData.summary || enrichmentData.coverImageUrl)) {
          // Only update fields that are currently missing
          const updateData: Record<string, string | number> = {};

          if (!book.coverImageUrl && enrichmentData.coverImageUrl) {
            updateData.coverImageUrl = enrichmentData.coverImageUrl;
          }
          if (!book.summary && enrichmentData.summary) {
            updateData.summary = enrichmentData.summary;
          }
          // Prefill total page count when the API knows it and we don't
          if (!book.totalPages && enrichmentData.totalPages) {
            updateData.totalPages = enrichmentData.totalPages;
          }
          if (enrichmentData.apiSource) {
            updateData.apiSource = enrichmentData.apiSource;
          }

          if (Object.keys(updateData).length > 0) {
            await prisma.book.update({
              where: { id: book.id },
              data: updateData,
            });

            enriched++;
            results.push({ 
              title: book.title, 
              status: 'enriched',
            });
          } else {
            skipped++;
            results.push({ title: book.title, status: 'no_new_data' });
          }
        } else {
          skipped++;
          results.push({ title: book.title, status: 'not_found' });
        }
      } catch (error) {
        console.error(`Error enriching book ${book.title}:`, error);
        skipped++;
        results.push({ title: book.title, status: 'error' });
      }

      // Delay between books to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    return NextResponse.json({
      success: true,
      enriched,
      skipped,
      total: books.filter(Boolean).length,
      message: `Enriched ${enriched} books, skipped ${skipped}`,
      results: results.slice(0, 20), // Return first 20 results for debugging
    });
  } catch (error) {
    console.error('Error enriching books:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Enrichment failed' },
      { status: 500 }
    );
  }
}
