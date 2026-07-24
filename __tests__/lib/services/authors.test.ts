/**
 * Tests for src/lib/services/authors.ts
 * Mocks global fetch (Open Library + Wikipedia).
 */

import {
  searchAuthor,
  getWikipediaSummary,
  getAuthorWorks,
  getAuthorData,
} from '@/lib/services/authors';

const mockFetch = global.fetch as jest.Mock;

const jsonResponse = (data: unknown, ok = true, status = 200) => ({
  ok,
  status,
  json: async () => data,
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe('searchAuthor', () => {
  it('returns author info with photo and bio (string form)', async () => {
    mockFetch
      .mockResolvedValueOnce(
        jsonResponse({
          numFound: 1,
          docs: [{ key: 'OL1A', name: 'Jane Author', top_subjects: ['Fiction', 'History', 'a', 'b', 'c', 'd'] }],
        })
      )
      .mockResolvedValueOnce(
        jsonResponse({
          name: 'Jane Author',
          bio: 'A writer.',
          birth_date: '1970',
          photos: [-1, 555],
          alternate_names: ['J. Author'],
        })
      );

    const info = await searchAuthor('Jane Author');
    expect(info).toMatchObject({
      name: 'Jane Author',
      bio: 'A writer.',
      birthDate: '1970',
      openLibraryKey: 'OL1A',
      alternateNames: ['J. Author'],
    });
    // picks first positive photo id
    expect(info?.photoUrl).toBe('https://covers.openlibrary.org/a/id/555-L.jpg');
    // topSubjects limited to 5
    expect(info?.topSubjects).toHaveLength(5);
  });

  it('handles bio in { value } form', async () => {
    mockFetch
      .mockResolvedValueOnce(jsonResponse({ numFound: 1, docs: [{ key: 'OL1A', name: 'X' }] }))
      .mockResolvedValueOnce(jsonResponse({ name: 'X', bio: { value: 'Bio text' } }));

    const info = await searchAuthor('X');
    expect(info?.bio).toBe('Bio text');
  });

  it('returns null when the search finds no authors', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ numFound: 0, docs: [] }));
    expect(await searchAuthor('Nobody')).toBeNull();
  });

  it('returns null when the search request fails', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({}, false, 500));
    expect(await searchAuthor('X')).toBeNull();
  });

  it('returns null when the author detail request fails', async () => {
    mockFetch
      .mockResolvedValueOnce(jsonResponse({ numFound: 1, docs: [{ key: 'OL1A', name: 'X' }] }))
      .mockResolvedValueOnce(jsonResponse({}, false, 404));
    expect(await searchAuthor('X')).toBeNull();
  });

  it('returns null when fetch throws', async () => {
    mockFetch.mockRejectedValue(new Error('offline'));
    expect(await searchAuthor('X')).toBeNull();
  });
});

describe('getWikipediaSummary', () => {
  it('returns url, extract and photo from Wikipedia', async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({
        extract: 'Wiki extract',
        content_urls: { desktop: { page: 'https://en.wikipedia.org/wiki/Jane_Author' } },
        thumbnail: { source: 'https://upload.wikimedia.org/thumb.jpg' },
      })
    );

    const result = await getWikipediaSummary('Jane Author');
    expect(result).toEqual({
      url: 'https://en.wikipedia.org/wiki/Jane_Author',
      extract: 'Wiki extract',
      photoUrl: 'https://upload.wikimedia.org/thumb.jpg',
    });
    // spaces converted to underscores in request URL
    expect(mockFetch.mock.calls[0][0]).toContain('Jane_Author');
  });

  it('retries with a simplified name when the first request fails', async () => {
    mockFetch
      .mockResolvedValueOnce(jsonResponse({}, false, 404))
      .mockResolvedValueOnce(
        jsonResponse({
          extract: 'Retry extract',
          content_urls: { desktop: { page: 'https://en.wikipedia.org/wiki/Jane' } },
        })
      );

    const result = await getWikipediaSummary("Jane O'Author");
    expect(result?.extract).toBe('Retry extract');
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('returns null when both requests fail', async () => {
    mockFetch.mockResolvedValue(jsonResponse({}, false, 404));
    expect(await getWikipediaSummary('Nobody')).toBeNull();
  });

  it('returns null when fetch throws', async () => {
    mockFetch.mockRejectedValue(new Error('offline'));
    expect(await getWikipediaSummary('X')).toBeNull();
  });

  it('falls back to a constructed wiki URL when content_urls missing', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ extract: 'E' }));
    const result = await getWikipediaSummary('Jane Author');
    expect(result?.url).toBe('https://en.wikipedia.org/wiki/Jane_Author');
  });
});

describe('getAuthorWorks', () => {
  it('maps work entries to AuthorWork', async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({
        size: 2,
        entries: [
          { title: 'Work One', key: '/works/OL1W', first_publish_date: '2001', covers: [42] },
          { title: 'Work Two', key: '/works/OL2W' },
        ],
      })
    );

    const works = await getAuthorWorks('OL1A');
    expect(works).toEqual([
      {
        title: 'Work One',
        firstPublishYear: 2001,
        coverUrl: 'https://covers.openlibrary.org/b/id/42-M.jpg',
        openLibraryKey: '/works/OL1W',
      },
      {
        title: 'Work Two',
        firstPublishYear: undefined,
        coverUrl: undefined,
        openLibraryKey: '/works/OL2W',
      },
    ]);
  });

  it('returns [] on API failure', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({}, false, 500));
    expect(await getAuthorWorks('OL1A')).toEqual([]);
  });

  it('returns [] when fetch throws', async () => {
    mockFetch.mockRejectedValue(new Error('offline'));
    expect(await getAuthorWorks('OL1A')).toEqual([]);
  });
});

describe('getAuthorData', () => {
  it('combines Open Library, Wikipedia and works', async () => {
    // searchAuthor: search + detail; wikipedia: summary; works: list
    mockFetch
      .mockResolvedValueOnce(jsonResponse({ numFound: 1, docs: [{ key: 'OL1A', name: 'Jane' }] }))
      .mockResolvedValueOnce(jsonResponse({ extract: 'Wiki', content_urls: { desktop: { page: 'u' } }, thumbnail: { source: 'wiki-photo' } }))
      .mockResolvedValueOnce(jsonResponse({ name: 'Jane' }))
      .mockResolvedValueOnce(jsonResponse({ size: 1, entries: [{ title: 'W', key: '/works/OL1W' }] }));

    const data = await getAuthorData('Jane');
    expect(data.author?.name).toBe('Jane');
    expect(data.wikipedia).toEqual({ url: 'u', extract: 'Wiki' });
    expect(data.works).toHaveLength(1);
    // Wikipedia photo used as fallback since OL had none
    expect(data.author?.photoUrl).toBe('wiki-photo');
  });

  it('skips fetching works when author not found', async () => {
    mockFetch
      .mockResolvedValueOnce(jsonResponse({ numFound: 0, docs: [] })) // search finds nothing
      .mockResolvedValueOnce(jsonResponse({ extract: 'Wiki' }));

    const data = await getAuthorData('Nobody');
    expect(data.author).toBeNull();
    expect(data.works).toEqual([]);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });
});
