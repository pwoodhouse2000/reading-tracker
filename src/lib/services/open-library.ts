export interface BookInfo {
  title: string;
  author: string;
  summary?: string;
  coverImageUrl?: string;
  isbn?: string;
  publishYear?: number;
  pageCount?: number;
  apiSource?: string;
}

interface OpenLibraryDoc {
  title: string;
  author_name?: string[];
  first_sentence?: string[];
  cover_i?: number;
  isbn?: string[];
  first_publish_year?: number;
  number_of_pages_median?: number;
  key?: string; // e.g., "/works/OL123W"
}

interface OpenLibraryResponse {
  docs: OpenLibraryDoc[];
  numFound: number;
}

interface OpenLibraryWork {
  description?: string | { value: string };
  covers?: number[];
}

/**
 * Fetch the description from Open Library Works endpoint
 * The search API doesn't include descriptions, so we need a second call
 */
async function fetchWorkDescription(workKey: string): Promise<string | undefined> {
  try {
    const response = await fetch(
      `https://openlibrary.org${workKey}.json`,
      { next: { revalidate: 86400 } } // Cache for 24 hours
    );

    if (!response.ok) {
      return undefined;
    }

    const data: OpenLibraryWork = await response.json();
    
    // Description can be a string or an object with a 'value' property
    if (typeof data.description === 'string') {
      return data.description;
    } else if (data.description?.value) {
      return data.description.value;
    }
    
    return undefined;
  } catch (error) {
    console.error('Error fetching work description:', error);
    return undefined;
  }
}

export async function searchOpenLibrary(query: string): Promise<BookInfo[]> {
  try {
    const response = await fetch(
      `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=10`,
      { next: { revalidate: 3600 } } // Cache for 1 hour
    );

    if (!response.ok) {
      throw new Error('Open Library API request failed');
    }

    const data: OpenLibraryResponse = await response.json();

    if (!data.docs || data.docs.length === 0) {
      return [];
    }

    // Map basic info first
    const basicResults = data.docs.map((doc) => ({
      title: doc.title,
      author: doc.author_name?.[0] || 'Unknown Author',
      summary: doc.first_sentence?.[0], // Usually undefined, but include if present
      coverImageUrl: doc.cover_i
        ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`
        : undefined,
      isbn: doc.isbn?.[0],
      publishYear: doc.first_publish_year,
      pageCount: doc.number_of_pages_median,
      workKey: doc.key,
      apiSource: 'open_library',
    }));

    // For the first result, try to fetch the full description
    // (Only doing first to avoid rate limiting)
    if (basicResults.length > 0 && basicResults[0].workKey) {
      const description = await fetchWorkDescription(basicResults[0].workKey);
      if (description) {
        basicResults[0].summary = description;
      }
    }

    // Remove workKey from results (internal use only)
    return basicResults.map(({ workKey, ...rest }) => rest);
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

    // Try to get the work description if there's a work reference
    let description = data.description?.value || data.description;
    if (!description && data.works?.[0]?.key) {
      description = await fetchWorkDescription(data.works[0].key);
    }

    // Get cover from the edition or work
    let coverUrl: string | undefined;
    if (data.covers?.[0]) {
      coverUrl = `https://covers.openlibrary.org/b/id/${data.covers[0]}-L.jpg`;
    }

    return {
      title: data.title || 'Unknown Title',
      author: data.authors?.[0]?.name || 'Unknown Author',
      summary: description,
      coverImageUrl: coverUrl,
      isbn: isbn,
      publishYear: data.publish_date ? parseInt(data.publish_date) : undefined,
      pageCount: typeof data.number_of_pages === 'number' ? data.number_of_pages : undefined,
      apiSource: 'open_library',
    };
  } catch (error) {
    console.error('Error fetching book by ISBN from Open Library:', error);
    return null;
  }
}
