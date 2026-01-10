import { searchOpenLibrary, getBookByISBN, BookInfo } from './open-library';
import { searchGoogleBooks } from './google-books';

/**
 * Search for books using multiple APIs
 * Tries Open Library first (free, no API key needed)
 * Falls back to Google Books if no results found
 */
export async function searchBooks(query: string): Promise<BookInfo[]> {
  if (!query || query.trim().length === 0) {
    return [];
  }

  // Try Open Library first (free, no API key required)
  let results = await searchOpenLibrary(query.trim());

  // If we got results from Open Library, return them
  if (results.length > 0) {
    return results;
  }

  // Fallback to Google Books if Open Library returned nothing
  // Only if an API key is configured
  if (process.env.GOOGLE_BOOKS_API_KEY) {
    results = await searchGoogleBooks(query.trim(), process.env.GOOGLE_BOOKS_API_KEY);
  }

  return results;
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

  // Try Open Library first
  const result = await getBookByISBN(cleanIsbn);

  if (result) {
    return result;
  }

  // Could add Google Books ISBN lookup here as fallback
  // For now, just return null if Open Library doesn't have it
  return null;
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
