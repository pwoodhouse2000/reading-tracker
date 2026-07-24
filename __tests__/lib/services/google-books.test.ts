/**
 * Tests for src/lib/services/google-books.ts
 * Mocks global fetch.
 */

import { searchGoogleBooks, searchGoogleBooksByISBN } from '@/lib/services/google-books';

const mockFetch = global.fetch as jest.Mock;

const volume = (overrides: Record<string, unknown> = {}) => ({
  volumeInfo: {
    title: 'Test Book',
    authors: ['Test Author'],
    description: 'A description',
    imageLinks: { thumbnail: 'http://books.google.com/thumb.jpg&edge=curl' },
    industryIdentifiers: [{ type: 'ISBN_13', identifier: '9781234567890' }],
    publishedDate: '2020-05-01',
    ...overrides,
  },
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe('searchGoogleBooks', () => {
  it('maps volumes to BookInfo and normalizes cover URLs', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ totalItems: 1, items: [volume()] }),
    });

    const results = await searchGoogleBooks('test');
    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      title: 'Test Book',
      author: 'Test Author',
      summary: 'A description',
      isbn: '9781234567890',
      publishYear: 2020,
      apiSource: 'google_books',
    });
    // http upgraded to https and edge=curl stripped
    expect(results[0].coverImageUrl).toBe('https://books.google.com/thumb.jpg');
  });

  it('returns [] when there are no items', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ totalItems: 0 }),
    });
    expect(await searchGoogleBooks('nothing')).toEqual([]);
  });

  it('returns [] silently on HTTP 429 (rate limit)', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 429 });
    expect(await searchGoogleBooks('test')).toEqual([]);
  });

  it('returns [] on other HTTP errors', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 500 });
    expect(await searchGoogleBooks('test')).toEqual([]);
  });

  it('returns [] when fetch throws', async () => {
    mockFetch.mockRejectedValue(new Error('network down'));
    expect(await searchGoogleBooks('test')).toEqual([]);
  });

  it('includes the API key in the URL when provided', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ totalItems: 0 }) });
    await searchGoogleBooks('test', 'MY_KEY');
    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain('key=MY_KEY');
  });

  it('omits the API key when not provided', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ totalItems: 0 }) });
    await searchGoogleBooks('test');
    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).not.toContain('key=');
  });

  it('falls back to Unknown Author and undefined fields when missing', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        totalItems: 1,
        items: [volume({ authors: undefined, description: undefined, imageLinks: undefined, industryIdentifiers: undefined, publishedDate: undefined })],
      }),
    });
    const results = await searchGoogleBooks('test');
    expect(results[0].author).toBe('Unknown Author');
    expect(results[0].coverImageUrl).toBeUndefined();
    expect(results[0].isbn).toBeUndefined();
    expect(results[0].publishYear).toBeUndefined();
  });

  it('prefers larger image sizes over thumbnail', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        totalItems: 1,
        items: [
          volume({
            imageLinks: {
              thumbnail: 'https://x/thumb.jpg',
              medium: 'https://x/medium.jpg',
              large: 'https://x/large.jpg',
            },
          }),
        ],
      }),
    });
    const results = await searchGoogleBooks('test');
    expect(results[0].coverImageUrl).toBe('https://x/large.jpg');
  });
});

describe('searchGoogleBooksByISBN', () => {
  it('returns the first result for an ISBN search', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ totalItems: 1, items: [volume()] }),
    });
    const result = await searchGoogleBooksByISBN('9781234567890');
    expect(result?.title).toBe('Test Book');
    const url = mockFetch.mock.calls[0][0] as string;
    expect(decodeURIComponent(url)).toContain('q=isbn:9781234567890');
  });

  it('returns null when nothing found', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ totalItems: 0 }) });
    expect(await searchGoogleBooksByISBN('000')).toBeNull();
  });
});
