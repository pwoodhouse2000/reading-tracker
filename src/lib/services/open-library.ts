export interface BookInfo {
  title: string;
  author: string;
  summary?: string;
  coverImageUrl?: string;
  isbn?: string;
  publishYear?: number;
}

interface OpenLibraryDoc {
  title: string;
  author_name?: string[];
  first_sentence?: string[];
  cover_i?: number;
  isbn?: string[];
  first_publish_year?: number;
  publisher?: string[];
}

interface OpenLibraryResponse {
  docs: OpenLibraryDoc[];
  numFound: number;
}

export async function searchOpenLibrary(query: string): Promise<BookInfo[]> {
  try {
    const response = await fetch(
      `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=5`,
      { next: { revalidate: 3600 } } // Cache for 1 hour
    );

    if (!response.ok) {
      throw new Error('Open Library API request failed');
    }

    const data: OpenLibraryResponse = await response.json();

    return data.docs.map((doc) => ({
      title: doc.title,
      author: doc.author_name?.[0] || 'Unknown Author',
      summary: doc.first_sentence?.[0],
      coverImageUrl: doc.cover_i
        ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`
        : undefined,
      isbn: doc.isbn?.[0],
      publishYear: doc.first_publish_year,
    }));
  } catch (error) {
    console.error('Error fetching from Open Library:', error);
    return [];
  }
}

export async function getBookByISBN(isbn: string): Promise<BookInfo | null> {
  try {
    const response = await fetch(
      `https://openlibrary.org/isbn/${isbn}.json`,
      { next: { revalidate: 86400 } } // Cache for 24 hours
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();

    return {
      title: data.title || 'Unknown Title',
      author: data.authors?.[0]?.name || 'Unknown Author',
      summary: data.description?.value || data.description,
      isbn: isbn,
      publishYear: data.publish_date ? parseInt(data.publish_date) : undefined,
    };
  } catch (error) {
    console.error('Error fetching book by ISBN from Open Library:', error);
    return null;
  }
}
