/**
 * Tests for GET /api/authors/[name]
 * Mocks Prisma and the authors/podcasts services.
 * @jest-environment node
 */

jest.mock('@/lib/prisma', () => ({
  prisma: {
    book: { findMany: jest.fn() },
  },
}));

jest.mock('@/lib/services/authors', () => ({
  getAuthorData: jest.fn(),
}));

jest.mock('@/lib/services/podcasts', () => ({
  searchPodcastEpisodes: jest.fn(),
  isPodcastSearchEnabled: jest.fn(),
}));

import { prisma } from '@/lib/prisma';
import { getAuthorData } from '@/lib/services/authors';
import { searchPodcastEpisodes, isPodcastSearchEnabled } from '@/lib/services/podcasts';
import { GET } from '@/app/api/authors/[name]/route';

const bookFindMany = prisma.book.findMany as jest.Mock;
const mockGetAuthorData = getAuthorData as jest.Mock;
const mockSearchPodcastEpisodes = searchPodcastEpisodes as jest.Mock;
const mockIsPodcastSearchEnabled = isPodcastSearchEnabled as jest.Mock;

const request = () => ({ url: 'http://localhost/api/authors/Jane' }) as any;
const params = (name: string) => ({ params: Promise.resolve({ name }) });

const richAuthor = {
  author: {
    name: 'Jane Author',
    bio: 'A bio',
    photoUrl: 'photo.jpg',
    birthDate: '1970',
    deathDate: undefined,
    alternateNames: ['J. A.'],
    topSubjects: ['Fiction'],
  },
  wikipedia: { url: 'https://en.wikipedia.org/wiki/Jane', extract: 'Wiki extract' },
  works: Array.from({ length: 15 }, (_, i) => ({ title: `Work ${i}` })),
};

const twoBooks = [
  {
    id: 'b1', title: 'Book One', status: 'FINISHED', rating: 5,
    dateFinished: new Date('2024-01-01'), coverImageUrl: 'c.jpg', thoughts: 'Great',
    notes: [{ id: 'n1', content: 'note', page: 1 }],
  },
  {
    id: 'b2', title: 'Book Two', status: 'READING', rating: null,
    dateFinished: null, coverImageUrl: null, thoughts: null, notes: [],
  },
];

beforeEach(() => {
  jest.clearAllMocks();
  mockGetAuthorData.mockResolvedValue(richAuthor);
  bookFindMany.mockResolvedValue(twoBooks);
  mockIsPodcastSearchEnabled.mockReturnValue(true);
  mockSearchPodcastEpisodes.mockResolvedValue({ episodes: [{ id: 'ep1' }], total: 3 });
});

describe('GET /api/authors/[name]', () => {
  it('returns combined external data, user books, stats and podcasts', async () => {
    const res = await GET(request(), params('Jane%20Author'));
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.name).toBe('Jane Author'); // URL-decoded
    expect(body.bio).toBe('A bio');
    expect(body.photoUrl).toBe('photo.jpg');
    expect(body.wikipedia).toEqual({ url: 'https://en.wikipedia.org/wiki/Jane', extract: 'Wiki extract' });
    // works limited to 12
    expect(body.otherWorks).toHaveLength(12);
    // user stats: 2 books, 1 finished, avg rating 5
    expect(body.userStats).toEqual({ totalBooks: 2, booksFinished: 1, averageRating: 5 });
    expect(body.userBooks).toHaveLength(2);
    // notes flattened with book info
    expect(body.userNotes).toEqual([
      { id: 'n1', content: 'note', page: 1, bookTitle: 'Book One', bookId: 'b1' },
    ]);
    // podcast block
    expect(body.podcasts).toEqual({ episodes: [{ id: 'ep1' }], totalFound: 3, enabled: true });
    // external links present
    expect(body.externalLinks.goodreads).toContain('goodreads.com');
  });

  it('falls back to the Wikipedia extract when there is no OL bio', async () => {
    mockGetAuthorData.mockResolvedValue({ author: null, wikipedia: { url: 'u', extract: 'Wiki only' }, works: [] });
    const res = await GET(request(), params('Jane'));
    const body = await res.json();
    expect(body.bio).toBe('Wiki only');
  });

  it('returns null averageRating when no finished books are rated', async () => {
    bookFindMany.mockResolvedValue([
      { id: 'b1', title: 'T', status: 'FINISHED', rating: null, dateFinished: null, coverImageUrl: null, thoughts: null, notes: [] },
    ]);
    const res = await GET(request(), params('Jane'));
    expect((await res.json()).userStats.averageRating).toBeNull();
  });

  it('skips podcast search when the feature is disabled', async () => {
    mockIsPodcastSearchEnabled.mockReturnValue(false);
    const res = await GET(request(), params('Jane'));
    const body = await res.json();
    expect(mockSearchPodcastEpisodes).not.toHaveBeenCalled();
    expect(body.podcasts).toEqual({ episodes: [], totalFound: 0, enabled: false });
  });

  it('returns empty podcast block when search returns null', async () => {
    mockSearchPodcastEpisodes.mockResolvedValue(null);
    const res = await GET(request(), params('Jane'));
    const body = await res.json();
    expect(body.podcasts.episodes).toEqual([]);
    expect(body.podcasts.enabled).toBe(true);
  });

  it('returns 500 when the service throws', async () => {
    mockGetAuthorData.mockRejectedValue(new Error('boom'));
    const res = await GET(request(), params('Jane'));
    expect(res.status).toBe(500);
    expect((await res.json()).error).toMatch(/failed to fetch author data/i);
  });
});
