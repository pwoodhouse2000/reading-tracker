import { searchOpenLibrary, getBookByISBN, BookInfo, enrichFromOpenLibrary } from './open-library';
import { searchGoogleBooks, enrichFromGoogleBooks, searchGoogleBooksByISBN } from './google-books';

/**
 * Search for books using multiple APIs in parallel
 * Combines results intelligently - preferring:
 * - Google Books for descriptions (better coverage)
 * - Open Library for cover images (higher quality, no watermarks)
 */
export async function searchBooks(query: string): Promise<BookInfo[]> {
  if (!query || query.trim().length === 0) {
    return [];
  }

  const trimmedQuery = query.trim();

  // Search both APIs in parallel for speed
  const [openLibraryResults, googleResults] = await Promise.all([
    searchOpenLibrary(trimmedQuery),
    searchGoogleBooks(trimmedQuery, process.env.GOOGLE_BOOKS_API_KEY),
  ]);

  // If we have results from both, merge the best of each
  if (openLibraryResults.length > 0 && googleResults.length > 0) {
    return mergeBookResults(openLibraryResults, googleResults);
  }

  // Return whichever has results
  if (openLibraryResults.length > 0) {
    return openLibraryResults;
  }

  return googleResults;
}

/**
 * Merge results from Open Library and Google Books
 * Strategy: Use Open Library as base, enrich with Google data
 */
function mergeBookResults(openLibrary: BookInfo[], google: BookInfo[]): BookInfo[] {
  return openLibrary.map((olBook, index) => {
    // Try to find matching Google book by title similarity
    const googleMatch = google.find((gBook) =>
      normalizeTitle(gBook.title) === normalizeTitle(olBook.title) ||
      gBook.title.toLowerCase().includes(olBook.title.toLowerCase()) ||
      olBook.title.toLowerCase().includes(gBook.title.toLowerCase())
    ) || google[index]; // Fall back to same index position

    if (!googleMatch) {
      return olBook;
    }

    // Prefer Open Library covers (higher quality, larger images)
    // Prefer Google descriptions (better coverage, full summaries)
    return {
      ...olBook,
      summary: olBook.summary || googleMatch.summary,
      coverImageUrl: olBook.coverImageUrl || googleMatch.coverImageUrl,
      isbn: olBook.isbn || googleMatch.isbn,
      apiSource: 'combined',
    };
  });
}

/**
 * Normalize title for comparison
 */
function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Search for a book by ISBN
 * More precise than text search
 */
export async function searchBookByISBN(isbn: string): Promise<BookInfo | null> {
  if (!isbn || isbn.trim().length === 0) {
    return null;
  }

  // Clean ISBN (remove dashes and spaces)
  const cleanIsbn = isbn.replace(/[-\s]/g, '');

  // Try both APIs in parallel
  const [openLibraryResult, googleResult] = await Promise.all([
    getBookByISBN(cleanIsbn),
    searchGoogleBooksByISBN(cleanIsbn, process.env.GOOGLE_BOOKS_API_KEY),
  ]);

  // Merge results if both found
  if (openLibraryResult && googleResult) {
    return {
      ...openLibraryResult,
      summary: openLibraryResult.summary || googleResult.summary,
      coverImageUrl: openLibraryResult.coverImageUrl || googleResult.coverImageUrl,
      apiSource: 'combined',
    };
  }

  return openLibraryResult || googleResult || null;
}

/**
 * Combine author and title into a single search query
 * Useful for more precise searches
 */
export async function searchBookByAuthorAndTitle(
  author: string,
  title: string
): Promise<BookInfo[]> {
  const query = `${title} ${author}`.trim();
  return searchBooks(query);
}

/**
 * Enrich a book with cover and summary from external APIs
 * Tries multiple sources for best results
 */
export async function enrichBook(
  title: string,
  author?: string
): Promise<{ summary?: string; coverImageUrl?: string; isbn?: string; apiSource?: string } | null> {
  // Try both sources in parallel
  const [openLibraryData, googleData] = await Promise.all([
    enrichFromOpenLibrary(title, author),
    enrichFromGoogleBooks(title, author),
  ]);

  // If neither found anything, return null
  if (!openLibraryData && !googleData) {
    return null;
  }

  // Merge results - prefer Open Library covers, Google descriptions
  return {
    summary: googleData?.summary || openLibraryData?.summary,
    coverImageUrl: openLibraryData?.coverImageUrl || googleData?.coverImageUrl,
    apiSource: 'combined',
  };
}

/**
 * Parse a book title that might include author in parentheses or after a dash
 * e.g., "Atomic Habits (James Clear)" or "Atomic Habits - James Clear"
 */
export function parseBookTitle(input: string): { title: string; author?: string } {
  // Try to extract author from parentheses: "Title (Author)"
  const parenMatch = input.match(/^(.+?)\s*\(([^)]+)\)\s*$/);
  if (parenMatch) {
    return {
      title: parenMatch[1].trim(),
      author: parenMatch[2].trim(),
    };
  }

  // Try to extract author after dash: "Title - Author"
  const dashMatch = input.match(/^(.+?)\s*[-–—]\s*([^-–—]+)$/);
  if (dashMatch) {
    return {
      title: dashMatch[1].trim(),
      author: dashMatch[2].trim(),
    };
  }

  // Try to extract author after "by": "Title by Author"
  const byMatch = input.match(/^(.+?)\s+by\s+(.+)$/i);
  if (byMatch) {
    return {
      title: byMatch[1].trim(),
      author: byMatch[2].trim(),
    };
  }

  // No author found, just return as title
  return { title: input.trim() };
}
