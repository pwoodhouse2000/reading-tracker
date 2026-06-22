/**
 * Tests for the multi-source book search merge pipeline (book-api.ts).
 *
 * The two providers are mocked so we can assert how their results are unioned,
 * de-duped, filtered and ranked without hitting the network.
 */
import { searchBooks } from '@/lib/services/book-api';
import { searchOpenLibrary } from '@/lib/services/open-library';
import { searchGoogleBooks } from '@/lib/services/google-books';

jest.mock('@/lib/services/open-library', () => ({
  searchOpenLibrary: jest.fn(),
  getBookByISBN: jest.fn(),
}));
jest.mock('@/lib/services/google-books', () => ({
  searchGoogleBooks: jest.fn(),
  searchGoogleBooksByISBN: jest.fn(),
}));

const mockOpenLibrary = searchOpenLibrary as jest.Mock;
const mockGoogleBooks = searchGoogleBooks as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('searchBooks merge pipeline', () => {
  it('keeps a new release that only Google Books returned', async () => {
    // Open Library has not indexed the new release yet.
    mockOpenLibrary.mockResolvedValue([
      { title: 'Some Older Book', author: 'Someone', apiSource: 'open_library' },
    ]);
    mockGoogleBooks.mockResolvedValue([
      { title: 'Onyx Storm', author: 'Rebecca Yarros', apiSource: 'google_books' },
    ]);

    const results = await searchBooks('Onyx Storm');
    const titles = results.map((r) => r.title);

    expect(titles).toContain('Onyx Storm');
  });

  it('ranks the exact-title match first', async () => {
    mockOpenLibrary.mockResolvedValue([
      { title: 'The Great Alone', author: 'Kristin Hannah', apiSource: 'open_library' },
      { title: 'The Women', author: 'Kristin Hannah', apiSource: 'open_library' },
    ]);
    mockGoogleBooks.mockResolvedValue([]);

    const results = await searchBooks('The Women');
    expect(results[0].title).toBe('The Women');
  });

  it('drops box sets, collections and study guides', async () => {
    mockOpenLibrary.mockResolvedValue([
      { title: 'The Women', author: 'Kristin Hannah', apiSource: 'open_library' },
      {
        title: 'Kristin Hannah Collection 12 Books Set (The Women, The Nightingale)',
        author: 'Kristin Hannah',
        apiSource: 'open_library',
      },
      { title: 'Study Guide: The Women', author: 'SuperSummary', apiSource: 'open_library' },
    ]);
    mockGoogleBooks.mockResolvedValue([]);

    const results = await searchBooks('The Women');
    const titles = results.map((r) => r.title);

    expect(titles).toEqual(['The Women']);
  });

  it('collapses editions of the same book into one entry', async () => {
    mockOpenLibrary.mockResolvedValue([
      {
        title: 'Fourth Wing (The Empyrean, 1)',
        author: 'Rebecca Yarros',
        coverImageUrl: 'https://covers.openlibrary.org/x.jpg',
        apiSource: 'open_library',
      },
    ]);
    mockGoogleBooks.mockResolvedValue([
      {
        title: 'Fourth Wing: Special Edition',
        author: 'Rebecca Yarros',
        summary: 'Violet Sorrengail enters the deadly world of dragon riders.',
        apiSource: 'google_books',
      },
    ]);

    const results = await searchBooks('Fourth Wing');

    expect(results).toHaveLength(1);
    // Prefers the Open Library cover and the Google summary.
    expect(results[0].coverImageUrl).toContain('openlibrary.org');
    expect(results[0].summary).toContain('Violet');
    expect(results[0].apiSource).toBe('combined');
  });

  it('returns an empty array when both providers return nothing', async () => {
    mockOpenLibrary.mockResolvedValue([]);
    mockGoogleBooks.mockResolvedValue([]);

    const results = await searchBooks('asdkjfhaskjdfh');
    expect(results).toEqual([]);
  });
});
