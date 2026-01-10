import { NextRequest, NextResponse } from 'next/server';
import { searchBooks, searchBookByISBN } from '@/lib/services/book-api';
import { BookInfo } from '@/lib/services/open-library';

// GET /api/books/search?q=query
// GET /api/books/search?isbn=123456789
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const isbn = searchParams.get('isbn');

    // Validate that at least one search parameter is provided
    if (!query && !isbn) {
      return NextResponse.json(
        { error: 'Query parameter "q" or "isbn" is required' },
        { status: 400 }
      );
    }

    let results: BookInfo[] = [];

    // Search by ISBN if provided (more precise)
    if (isbn) {
      const result = await searchBookByISBN(isbn);
      results = result ? [result] : [];
    } else if (query) {
      // Search by text query
      results = await searchBooks(query);
    }

    return NextResponse.json({
      results,
      count: results.length,
      query: query || isbn,
    });
  } catch (error) {
    console.error('Error in book search API:', error);
    return NextResponse.json(
      { error: 'Failed to search for books' },
      { status: 500 }
    );
  }
}
