/**
 * Author data service - fetches author info from Open Library and Wikipedia
 */

export interface AuthorInfo {
  name: string;
  bio?: string;
  photoUrl?: string;
  birthDate?: string;
  deathDate?: string;
  wikipedia?: {
    url: string;
    extract: string;
  };
  openLibraryKey?: string;
  alternateNames?: string[];
  topSubjects?: string[];
}

export interface AuthorWork {
  title: string;
  firstPublishYear?: number;
  coverUrl?: string;
  openLibraryKey?: string;
}

interface OpenLibraryAuthorSearch {
  docs: Array<{
    key: string;
    name: string;
    birth_date?: string;
    death_date?: string;
    top_work?: string;
    work_count?: number;
    alternate_names?: string[];
    top_subjects?: string[];
  }>;
  numFound: number;
}

interface OpenLibraryAuthor {
  name: string;
  bio?: string | { value: string };
  birth_date?: string;
  death_date?: string;
  photos?: number[];
  alternate_names?: string[];
  links?: Array<{ url: string; title: string }>;
  wikipedia?: string;
}

interface OpenLibraryAuthorWorks {
  entries: Array<{
    title: string;
    key: string;
    first_publish_date?: string;
    covers?: number[];
  }>;
  size: number;
}

interface WikipediaSummary {
  title: string;
  extract: string;
  content_urls?: {
    desktop?: { page: string };
  };
  thumbnail?: {
    source: string;
  };
}

/**
 * Search for an author by name in Open Library
 */
export async function searchAuthor(name: string): Promise<AuthorInfo | null> {
  try {
    // First, search for the author
    const searchResponse = await fetch(
      `https://openlibrary.org/search/authors.json?q=${encodeURIComponent(name)}&limit=1`,
      { next: { revalidate: 86400 } }
    );

    if (!searchResponse.ok) {
      console.error('Open Library author search failed');
      return null;
    }

    const searchData: OpenLibraryAuthorSearch = await searchResponse.json();
    
    if (!searchData.docs || searchData.docs.length === 0) {
      return null;
    }

    const authorKey = searchData.docs[0].key;
    
    // Fetch full author details
    const authorResponse = await fetch(
      `https://openlibrary.org/authors/${authorKey}.json`,
      { next: { revalidate: 86400 } }
    );

    if (!authorResponse.ok) {
      return null;
    }

    const authorData: OpenLibraryAuthor = await authorResponse.json();

    // Parse bio
    let bio: string | undefined;
    if (typeof authorData.bio === 'string') {
      bio = authorData.bio;
    } else if (authorData.bio?.value) {
      bio = authorData.bio.value;
    }

    // Get photo URL
    let photoUrl: string | undefined;
    if (authorData.photos && authorData.photos.length > 0) {
      const photoId = authorData.photos.find(id => id > 0);
      if (photoId) {
        photoUrl = `https://covers.openlibrary.org/a/id/${photoId}-L.jpg`;
      }
    }

    return {
      name: authorData.name,
      bio,
      photoUrl,
      birthDate: authorData.birth_date,
      deathDate: authorData.death_date,
      openLibraryKey: authorKey,
      alternateNames: authorData.alternate_names,
      topSubjects: searchData.docs[0].top_subjects?.slice(0, 5),
    };
  } catch (error) {
    console.error('Error searching for author:', error);
    return null;
  }
}

/**
 * Fetch Wikipedia summary for an author
 */
export async function getWikipediaSummary(name: string): Promise<{ url: string; extract: string; photoUrl?: string } | null> {
  try {
    // Wikipedia API uses underscores for spaces
    const formattedName = name.replace(/ /g, '_');
    
    const response = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(formattedName)}`,
      { next: { revalidate: 86400 } }
    );

    if (!response.ok) {
      // Try without special characters
      const simpleName = name.replace(/[^a-zA-Z\s]/g, '').replace(/ /g, '_');
      const retryResponse = await fetch(
        `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(simpleName)}`,
        { next: { revalidate: 86400 } }
      );
      
      if (!retryResponse.ok) {
        return null;
      }
      
      const data: WikipediaSummary = await retryResponse.json();
      return {
        url: data.content_urls?.desktop?.page || `https://en.wikipedia.org/wiki/${simpleName}`,
        extract: data.extract,
        photoUrl: data.thumbnail?.source,
      };
    }

    const data: WikipediaSummary = await response.json();
    
    return {
      url: data.content_urls?.desktop?.page || `https://en.wikipedia.org/wiki/${formattedName}`,
      extract: data.extract,
      photoUrl: data.thumbnail?.source,
    };
  } catch (error) {
    console.error('Error fetching Wikipedia summary:', error);
    return null;
  }
}

/**
 * Fetch other works by an author from Open Library
 */
export async function getAuthorWorks(authorKey: string, limit = 20): Promise<AuthorWork[]> {
  try {
    const response = await fetch(
      `https://openlibrary.org/authors/${authorKey}/works.json?limit=${limit}`,
      { next: { revalidate: 86400 } }
    );

    if (!response.ok) {
      return [];
    }

    const data: OpenLibraryAuthorWorks = await response.json();

    return data.entries.map(work => ({
      title: work.title,
      firstPublishYear: work.first_publish_date ? parseInt(work.first_publish_date) : undefined,
      coverUrl: work.covers?.[0] ? `https://covers.openlibrary.org/b/id/${work.covers[0]}-M.jpg` : undefined,
      openLibraryKey: work.key,
    }));
  } catch (error) {
    console.error('Error fetching author works:', error);
    return [];
  }
}

/**
 * Get comprehensive author data from multiple sources
 */
export async function getAuthorData(name: string): Promise<{
  author: AuthorInfo | null;
  wikipedia: { url: string; extract: string; photoUrl?: string } | null;
  works: AuthorWork[];
}> {
  // Fetch from both sources in parallel
  const [authorInfo, wikipediaData] = await Promise.all([
    searchAuthor(name),
    getWikipediaSummary(name),
  ]);

  // Fetch works if we have an author key
  let works: AuthorWork[] = [];
  if (authorInfo?.openLibraryKey) {
    works = await getAuthorWorks(authorInfo.openLibraryKey);
  }

  // Use Wikipedia photo as fallback if Open Library doesn't have one
  if (authorInfo && !authorInfo.photoUrl && wikipediaData?.photoUrl) {
    authorInfo.photoUrl = wikipediaData.photoUrl;
  }

  return {
    author: authorInfo,
    wikipedia: wikipediaData ? { url: wikipediaData.url, extract: wikipediaData.extract } : null,
    works,
  };
}
