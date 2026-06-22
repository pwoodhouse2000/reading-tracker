import { searchOpenLibrary, getBookByISBN, BookInfo } from './open-library';
import { searchGoogleBooks, searchGoogleBooksByISBN } from './google-books';

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
 * - Drop box sets, collections and study guides that aren't real editions.
 * - Collapse editions: de-dupe by canonical title + author so the many ISBNs
 *   of one book (hardcover, paperback, reissue, etc.) become a single entry.
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
    if (!book.title || isNoiseResult(book)) continue;
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
 * De-dupe key based on the canonical title + author. Editions of one book share
 * a title and author but carry different ISBNs, so keying on ISBN would scatter
 * them across many rows; keying on canonical title + author collapses them.
 */
function bookKey(book: BookInfo): string {
  return `${canonicalTitle(book.title)}|${normalizeTitle(book.author || '')}`;
}

/**
 * Box sets, omnibus collections, and study guides/summaries pollute results
 * with rows that aren't the book the user is looking for. Drop them.
 */
const NOISE_TITLE = /\b(box(ed)?\s*sets?|boxsets?|\d+\s*books?\s*(set|collection)|books?\s*(set|collection)|collections?\s*set|omnibus|complete\s+(series|collection)|study\s+guide|summary\s+of)\b/i;
const NOISE_AUTHOR = /\b(supersummary|sparknotes|bookrags|cliffsnotes)\b/i;

function isNoiseResult(book: BookInfo): boolean {
  return NOISE_TITLE.test(book.title) || NOISE_AUTHOR.test(book.author || '');
}

/**
 * Canonical form of a title for de-duping editions: drop parenthetical/bracketed
 * series notes (e.g. "(The Empyrean, 1)") and any subtitle after a colon, then
 * normalize. "Fourth Wing (The Empyrean, 1)" and "Fourth Wing: Special Edition"
 * both collapse to "fourth wing".
 */
function canonicalTitle(title: string): string {
  return normalizeTitle(
    title
      .replace(/\([^)]*\)/g, ' ')
      .replace(/\[[^\]]*\]/g, ' ')
      .split(':')[0]
  );
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
 * Enrich a book with cover, summary and ISBN from external APIs.
 *
 * Reuses the same multi-source search + merge + ranking pipeline as the
 * search box, so the top hit reflects the same relevance logic instead of
 * duplicating a parallel "enrich from each source" path.
 */
export async function enrichBook(
  title: string,
  author?: string
): Promise<{ summary?: string; coverImageUrl?: string; isbn?: string; apiSource?: string } | null> {
  const query = [title, author].filter(Boolean).join(' ').trim();
  const results = await searchBooks(query);
  const best = results[0];

  if (!best || (!best.summary && !best.coverImageUrl)) {
    return null;
  }

  return {
    summary: best.summary,
    coverImageUrl: best.coverImageUrl,
    isbn: best.isbn,
    apiSource: best.apiSource,
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
