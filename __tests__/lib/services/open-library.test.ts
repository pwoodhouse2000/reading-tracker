/**
 * Tests for src/lib/services/open-library.ts
 */

import { searchOpenLibrary, getBookByISBN } from '@/lib/services/open-library';

const mockFetch = global.fetch as jest.Mock;

describe('open-library service', () => {
  beforeEach(() => {
    // resetAllMocks clears both call records AND queued mockResolvedValueOnce chains
    jest.resetAllMocks();
  });

  // -----------------------------------------------------------------------
  describe('searchOpenLibrary', () => {
    const searchDoc = {
      title: 'Dune',
      author_name: ['Frank Herbert'],
      cover_i: 12345,
      isbn: ['9780441013593'],
      first_publish_year: 1965,
      key: '/works/OL102749W',
      first_sentence: undefined,
    };

    const workDescription = {
      description: 'Science fiction epic set in a far future feudal...',
    };

    it('returns BookInfo list mapped from search docs', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ docs: [searchDoc], numFound: 1 }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => workDescription,
        });

      const results = await searchOpenLibrary('dune');
      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({
        title: 'Dune',
        author: 'Frank Herbert',
        isbn: '9780441013593',
        publishYear: 1965,
        apiSource: 'open_library',
      });
      expect(results[0].coverImageUrl).toContain('12345');
    });

    it('fetches description from works API for first result', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ docs: [searchDoc], numFound: 1 }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ description: 'Full description text.' }),
        });

      const results = await searchOpenLibrary('dune');
      expect(results[0].summary).toBe('Full description text.');
    });

    it('parses object-style description from works API', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ docs: [searchDoc], numFound: 1 }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ description: { value: 'Object description.' } }),
        });

      const results = await searchOpenLibrary('dune');
      expect(results[0].summary).toBe('Object description.');
    });

    it('returns empty array when no docs', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ docs: [], numFound: 0 }),
      });
      expect(await searchOpenLibrary('nothing')).toEqual([]);
    });

    it('returns empty array on API failure', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false });
      expect(await searchOpenLibrary('err')).toEqual([]);
    });

    it('returns empty array on fetch throw', async () => {
      mockFetch.mockRejectedValueOnce(new Error('network'));
      expect(await searchOpenLibrary('err')).toEqual([]);
    });

    it('handles missing cover_i gracefully', async () => {
      const doc = { ...searchDoc, cover_i: undefined };
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ docs: [doc], numFound: 1 }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({}),
        });
      const results = await searchOpenLibrary('no-cover');
      expect(results[0].coverImageUrl).toBeUndefined();
    });

    it('uses Unknown Author when author_name is absent', async () => {
      const doc = { ...searchDoc, author_name: undefined };
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ docs: [doc], numFound: 1 }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({}),
        });
      const results = await searchOpenLibrary('no-author');
      expect(results[0].author).toBe('Unknown Author');
    });

    it('does not expose workKey in returned results', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ docs: [searchDoc], numFound: 1 }),
        })
        .mockResolvedValueOnce({ ok: true, json: async () => ({}) });
      const results = await searchOpenLibrary('dune');
      expect((results[0] as any).workKey).toBeUndefined();
    });

    it('handles work description fetch failure gracefully', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ docs: [searchDoc], numFound: 1 }),
        })
        .mockResolvedValueOnce({ ok: false }); // work description fails
      const results = await searchOpenLibrary('dune');
      // Should still return results, just without the description
      expect(results).toHaveLength(1);
      expect(results[0].title).toBe('Dune');
    });
  });

  // -----------------------------------------------------------------------
  describe('getBookByISBN', () => {
    const isbnData = {
      title: 'Neuromancer',
      authors: [{ name: 'William Gibson' }],
      description: { value: 'Cyberpunk classic.' },
      covers: [99999],
      publish_date: '1984',
      works: [{ key: '/works/OL789W' }],
    };

    it('returns BookInfo from ISBN lookup', async () => {
      // Provide isbnData without description so fetchWorkDescription is called
      const isbnDataNoDesc = { ...isbnData, description: undefined };
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => isbnDataNoDesc,
        })
        .mockResolvedValueOnce({
          // work description (called from fetchWorkDescription)
          ok: true,
          json: async () => ({ description: 'Cyberpunk classic.' }),
        });

      const result = await getBookByISBN('9780441569595');
      expect(result).toMatchObject({
        title: 'Neuromancer',
        author: 'William Gibson',
        isbn: '9780441569595',
        apiSource: 'open_library',
      });
    });

    it('returns null when ISBN not found', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false });
      expect(await getBookByISBN('0000000000')).toBeNull();
    });

    it('returns null on fetch throw', async () => {
      mockFetch.mockRejectedValueOnce(new Error('network'));
      expect(await getBookByISBN('1234567890')).toBeNull();
    });

    it('uses cover from covers array', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ ...isbnData }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({}),
        });
      const result = await getBookByISBN('1234567890');
      expect(result?.coverImageUrl).toContain('99999');
    });

    it('returns Unknown Title and Author when fields missing', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            works: [],
          }),
        });
      const result = await getBookByISBN('1234567890');
      expect(result?.title).toBe('Unknown Title');
      expect(result?.author).toBe('Unknown Author');
    });

    it('parses string description directly', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          title: 'Test',
          authors: [{ name: 'Auth' }],
          description: 'String desc',
          works: [],
        }),
      });
      const result = await getBookByISBN('1234567890');
      expect(result?.summary).toBe('String desc');
    });
  });
});
