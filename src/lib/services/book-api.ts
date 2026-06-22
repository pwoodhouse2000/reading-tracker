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

  // Search both APIs in parallel for speed. Each is resilient and returns []
  // on failure, so a single slow or empty source never blocks the other.
  const [openLibraryResults, googleResults] = await Promise.all([
    searchOpenLibrary(trimmedQuery),
    searchGoogleBooks(trimmedQuery, process.env.GOOGLE_BOOKS_API_KEY),
  ]);

  // Union both sources so a title only one provider knows about (e.g. a new
  // release, which Open Library indexes slowly) is never dropped. Duplicates
  // are merged, then the combined list is ranked by relevance to the query.
  return mergeBookResults(openLibraryResults, googleResults, trimmedQuery);
}

/**
 * Merge Open Library and Google Books results into a single de-duplicated,
 * relevance-ranked list.
 *
 * Strategy:
 * - Union, not intersection: keep every book either source returned.
 * - De-dupe by ISBN, falling back to normalized title + author.
 * - When the same book comes from both sources, prefer the Open Library cover
 *   (higher quality, no watermark) and the Google summary (better coverage).
 */
function mergeBookResults(
  openLibrary: BookInfo[],
  google: BookInfo[],
  query: string
): BookInfo[] {
  const merged = new Map<string, BookInfo>();

  for (const book of [...openLibrary, ...google]) {
    if (!book.title) continue;
    const key = bookKey(book);
    const existing = merged.get(key);
    merged.set(key, existing ? combineBooks(existing, book) : { ...book });
  }

  return rankByRelevance(Array.from(merged.values()), query);
}

/**
 * Combine two records for the same book, picking the best field from each
 * source regardless of which was seen first.
 */
function combineBooks(a: BookInfo, b: BookInfo): BookInfo {
  const ol = a.apiSource === 'open_library' ? a : b;
  const google = a.apiSource === 'google_books' ? a : b;

  return {
    title: a.title || b.title,
    author: bestAuthor(a.author, b.author),
    // Open Library covers are higher quality; fall back to Google's.
    coverImageUrl: ol.coverImageUrl || google.coverImageUrl || a.coverImageUrl || b.coverImageUrl,
    // Google descriptions have far better coverage.
    summary: google.summary || ol.summary || a.summary || b.summary,
    isbn: a.isbn || b.isbn,
    publishYear: a.publishYear || b.publishYear,
    apiSource: 'combined',
  };
}

function bestAuthor(a?: string, b?: string): string {
  const known = (v?: string) => !!v && v !== 'Unknown Author';
  if (known(a)) return a as string;
  if (known(b)) return b as string;
  return a || b || 'Unknown Author';
}

/**
 * Stable de-dupe key: prefer ISBN, fall back to normalized title + author so
 * the same book from two sources collapses into one entry.
 */
function bookKey(book: BookInfo): string {
  const isbn = book.isbn?.replace(/[-\s]/g, '');
  if (isbn && isbn.length >= 10) {
    return `isbn:${isbn}`;
  }
  return `title:${normalizeTitle(book.title)}|author:${normalizeTitle(book.author || '')}`;
}

/**
 * Rank results by how well they match the user's query so the most relevant
 * book (often an exact-title new release) surfaces first.
 */
function rankByRelevance(books: BookInfo[], query: string): BookInfo[] {
  const normalizedQuery = normalizeTitle(query);
  const queryTokens = normalizedQuery.split(' ').filter(Boolean);

  const scoreFor = (book: BookInfo): number => {
    const normalizedTitle = normalizeTitle(book.title);
    const haystack = `${normalizedTitle} ${normalizeTitle(book.author || '')}`;
    const haystackTokens = new Set(haystack.split(' ').filter(Boolean));

    let value = 0;
    // Exact title match is the strongest signal.
    if (normalizedTitle === normalizedQuery) value += 100;
    // Title starts with the query (e.g. searching a partial title).
    else if (normalizedQuery && normalizedTitle.startsWith(normalizedQuery)) value += 40;
    // Token overlap with title + author.
    for (const token of queryTokens) {
      if (haystackTokens.has(token)) value += 5;
    }
    // Light tie-breakers favouring complete records.
    if (book.coverImageUrl) value += 1;
    if (book.summary) value += 1;
    return value;
  };

  return books
    .map((book, index) => ({ book, index, score: scoreFor(book) }))
    // Stable sort: higher score first, original order as the tie-breaker.
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map((entry) => entry.book);
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
