import { BookInfo } from './open-library';

interface GoogleBooksVolumeInfo {
  title: string;
  authors?: string[];
  description?: string;
  imageLinks?: {
    thumbnail?: string;
    smallThumbnail?: string;
    small?: string;
    medium?: string;
    large?: string;
  };
  industryIdentifiers?: Array<{
    type: string;
    identifier: string;
  }>;
  publishedDate?: string;
}

interface GoogleBooksItem {
  volumeInfo: GoogleBooksVolumeInfo;
}

interface GoogleBooksResponse {
  items?: GoogleBooksItem[];
  totalItems: number;
}

/**
 * Search Google Books API
 * Works without an API key (with rate limits) or with one for higher limits
 */
export async function searchGoogleBooks(
  query: string,
  apiKey?: string
): Promise<BookInfo[]> {
  try {
    const url = new URL('https://www.googleapis.com/books/v1/volumes');
    url.searchParams.set('q', query);
    url.searchParams.set('maxResults', '10');
    url.searchParams.set('orderBy', 'relevance');
    // Google's Volumes API returns empty results for requests from many
    // datacenter IPs (e.g. Cloud Run) unless an access country is supplied.
    // Without this, Google Books effectively returns nothing in production -
    // the main reason new releases couldn't be found.
    url.searchParams.set('country', process.env.GOOGLE_BOOKS_COUNTRY || 'US');
    // Only add key if provided - API works without it (just lower rate limits)
    if (apiKey) {
      url.searchParams.set('key', apiKey);
    }

    const response = await fetch(url.toString(), {
      next: { revalidate: 3600 }, // Cache for 1 hour
    });

    if (!response.ok) {
      // Don't throw on rate limit - just return empty
      if (response.status === 429) {
        console.warn('Google Books API rate limited');
        return [];
      }
      throw new Error('Google Books API request failed');
    }

    const data: GoogleBooksResponse = await response.json();

    if (!data.items || data.items.length === 0) {
      return [];
    }

    return data.items.map((item) => {
      const volumeInfo = item.volumeInfo;
      
      // Get the best quality cover image available
      let coverUrl: string | undefined;
      const imageLinks = volumeInfo.imageLinks;
      if (imageLinks) {
        // Prefer larger images, fall back to thumbnail
        coverUrl = imageLinks.large || imageLinks.medium || imageLinks.small || imageLinks.thumbnail;
        // Convert to HTTPS if needed
        if (coverUrl) {
          coverUrl = coverUrl.replace('http:', 'https:');
          // Remove zoom parameter for better quality
          coverUrl = coverUrl.replace('&edge=curl', '');
        }
      }

      return {
        title: volumeInfo.title,
        author: volumeInfo.authors?.[0] || 'Unknown Author',
        summary: volumeInfo.description,
        coverImageUrl: coverUrl,
        isbn: volumeInfo.industryIdentifiers?.find(
          (id) => id.type === 'ISBN_13' || id.type === 'ISBN_10'
        )?.identifier,
        publishYear: volumeInfo.publishedDate
          ? parseInt(volumeInfo.publishedDate.split('-')[0])
          : undefined,
        apiSource: 'google_books',
      };
    });
  } catch (error) {
    console.error('Error fetching from Google Books:', error);
    return [];
  }
}

/**
 * Search Google Books by ISBN for more precise results
 */
export async function searchGoogleBooksByISBN(
  isbn: string,
  apiKey?: string
): Promise<BookInfo | null> {
  try {
    const results = await searchGoogleBooks(`isbn:${isbn}`, apiKey);
    return results.length > 0 ? results[0] : null;
  } catch (error) {
    console.error('Error searching Google Books by ISBN:', error);
    return null;
  }
}

/**
 * Enrich a book with data from Google Books
 * Good for getting descriptions (Google has better coverage than Open Library)
 */
export async function enrichFromGoogleBooks(
  title: string,
  author?: string
): Promise<{ summary?: string; coverImageUrl?: string } | null> {
  try {
    const query = author ? `${title} ${author}` : title;
    const results = await searchGoogleBooks(query, process.env.GOOGLE_BOOKS_API_KEY);

    if (results.length === 0) {
      return null;
    }

    const best = results[0];
    return {
      summary: best.summary,
      coverImageUrl: best.coverImageUrl,
    };
  } catch (error) {
    console.error('Error enriching from Google Books:', error);
    return null;
  }
}
