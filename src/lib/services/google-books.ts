import { BookInfo } from './open-library';

interface GoogleBooksVolumeInfo {
  title: string;
  authors?: string[];
  description?: string;
  imageLinks?: {
    thumbnail?: string;
    smallThumbnail?: string;
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

export async function searchGoogleBooks(
  query: string,
  apiKey?: string
): Promise<BookInfo[]> {
  try {
    const url = new URL('https://www.googleapis.com/books/v1/volumes');
    url.searchParams.set('q', query);
    url.searchParams.set('maxResults', '5');
    if (apiKey) {
      url.searchParams.set('key', apiKey);
    }

    const response = await fetch(url.toString(), {
      next: { revalidate: 3600 }, // Cache for 1 hour
    });

    if (!response.ok) {
      throw new Error('Google Books API request failed');
    }

    const data: GoogleBooksResponse = await response.json();

    if (!data.items || data.items.length === 0) {
      return [];
    }

    return data.items.map((item) => {
      const volumeInfo = item.volumeInfo;
      return {
        title: volumeInfo.title,
        author: volumeInfo.authors?.[0] || 'Unknown Author',
        summary: volumeInfo.description,
        coverImageUrl: volumeInfo.imageLinks?.thumbnail?.replace('http:', 'https:'),
        isbn: volumeInfo.industryIdentifiers?.find(
          (id) => id.type === 'ISBN_13' || id.type === 'ISBN_10'
        )?.identifier,
        publishYear: volumeInfo.publishedDate
          ? parseInt(volumeInfo.publishedDate.split('-')[0])
          : undefined,
      };
    });
  } catch (error) {
    console.error('Error fetching from Google Books:', error);
    return [];
  }
}
