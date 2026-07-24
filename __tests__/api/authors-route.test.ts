/**
 * Tests for GET /api/authors/[name]
 * @jest-environment node
 */

jest.mock('@/lib/prisma', () => ({
  prisma: {
    book: {
      findMany: jest.fn(),
    },
  },
}));

jest.mock('@/lib/services/authors', () => ({
  getAuthorData: jest.fn(),
}));

jest.mock('@/lib/services/podcasts', () => ({
  searchPodcastEpisodes: jest.fn(),
  isPodcastSearchEnabled: jest.fn().mockReturnValue(false),
}));

import { prisma } from '@/lib/prisma';
import { getAuthorData } from '@/lib/services/authors';
import { searchPodcastEpisodes, isPodcastSearchEnabled } from '@/lib/services/podcasts';
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/authors/[name]/route';

const mockBook = prisma.book as unknown as { findMany: jest.Mock };
const mockGetAuthorData = getAuthorData as jest.Mock;
const mockIsPodcastEnabled = isPodcastSearchEnabled as jest.Mock;
const mockSearchPodcasts = searchPodcastEpisodes as jest.Mock;

function makeReq(name: string): NextRequest {
  return new NextRequest(`http://localhost/api/authors/${encodeURIComponent(name)}`);
}

function makeCtx(name: string) {
  return { params: Promise.resolve({ name: encodeURIComponent(name) }) };
}

const emptyAuthorData = {
  author: null,
  wikipedia: null,
  works: [],
};

const richAuthorData = {
  author: {
    name: 'Frank Herbert',
    bio: 'American science fiction author',
    photoUrl: 'https://example.com/photo.jpg',
    birthDate: '1920-10-08',
    deathDate: '1986-02-11',
    alternateNames: ['Herbert, Frank'],
    topSubjects: ['Science Fiction'],
    openLibraryKey: 'OL12345A',
  },
  wikipedia: {
    url: 'https://en.wikipedia.org/wiki/Frank_Herbert',
    extract: 'Frank Herbert was an American science fiction author...',
  },
  works: [
    { title: 'Dune', firstPublishYear: 1965 },
    { title: 'Dune Messiah', firstPublishYear: 1969 },
  ],
};

beforeEach(() => {
  jest.clearAllMocks();
  mockGetAuthorData.mockResolvedValue(emptyAuthorData);
  mockBook.findMany.mockResolvedValue([]);
  mockIsPodcastEnabled.mockReturnValue(false);
});

// =============================================================================
describe('GET /api/authors/[name]', () => {
  it('returns 200 with author data structure', async () => {
    const req = makeReq('Frank Herbert');
    const res = await GET(req, makeCtx('Frank Herbert'));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty('name');
    expect(data).toHaveProperty('userBooks');
    expect(data).toHaveProperty('userStats');
    expect(data).toHaveProperty('externalLinks');
    expect(data).toHaveProperty('podcasts');
  });

  it('returns decoded author name', async () => {
    const req = makeReq('Frank Herbert');
    const res = await GET(req, makeCtx('Frank Herbert'));
    const data = await res.json();
    expect(data.name).toBe('Frank Herbert');
  });

  it('includes rich author data when available', async () => {
    mockGetAuthorData.mockResolvedValue(richAuthorData);
    const req = makeReq('Frank Herbert');
    const res = await GET(req, makeCtx('Frank Herbert'));
    const data = await res.json();
    expect(data.bio).toBe('American science fiction author');
    expect(data.photoUrl).toBe('https://example.com/photo.jpg');
    expect(data.wikipedia).toBeDefined();
  });

  it('falls back to Wikipedia extract when no author bio', async () => {
    mockGetAuthorData.mockResolvedValue({
      author: null,
      wikipedia: { url: 'https://en.wikipedia.org/wiki/test', extract: 'Wikipedia bio' },
      works: [],
    });
    const req = makeReq('Test Author');
    const res = await GET(req, makeCtx('Test Author'));
    const data = await res.json();
    expect(data.bio).toBe('Wikipedia bio');
  });

  it('calculates user stats correctly', async () => {
    mockBook.findMany.mockResolvedValue([
      { id: 'b1', title: 'Dune', status: 'FINISHED', rating: 5, dateFinished: new Date(), coverImageUrl: null, thoughts: null, notes: [] },
      { id: 'b2', title: 'Dune Messiah', status: 'READING', rating: null, dateFinished: null, coverImageUrl: null, thoughts: null, notes: [] },
    ]);
    const req = makeReq('Frank Herbert');
    const res = await GET(req, makeCtx('Frank Herbert'));
    const data = await res.json();
    expect(data.userStats.totalBooks).toBe(2);
    expect(data.userStats.booksFinished).toBe(1);
    expect(data.userStats.averageRating).toBe(5);
  });

  it('returns null averageRating when no rated books', async () => {
    mockBook.findMany.mockResolvedValue([
      { id: 'b1', title: 'Dune', status: 'FINISHED', rating: null, dateFinished: new Date(), coverImageUrl: null, thoughts: null, notes: [] },
    ]);
    const req = makeReq('Frank Herbert');
    const res = await GET(req, makeCtx('Frank Herbert'));
    const data = await res.json();
    expect(data.userStats.averageRating).toBeNull();
  });

  it('includes external links with proper URLs', async () => {
    const req = makeReq('Frank Herbert');
    const res = await GET(req, makeCtx('Frank Herbert'));
    const data = await res.json();
    expect(data.externalLinks.goodreads).toContain('goodreads.com');
    expect(data.externalLinks.amazon).toContain('amazon.com');
    expect(data.externalLinks.google).toContain('google.com');
  });

  it('limits otherWorks to 12', async () => {
    mockGetAuthorData.mockResolvedValue({
      ...richAuthorData,
      works: Array(20).fill({ title: 'Work', firstPublishYear: 2000 }),
    });
    const req = makeReq('Frank Herbert');
    const res = await GET(req, makeCtx('Frank Herbert'));
    const data = await res.json();
    expect(data.otherWorks.length).toBeLessThanOrEqual(12);
  });

  it('includes podcast data as disabled when not configured', async () => {
    mockIsPodcastEnabled.mockReturnValue(false);
    const req = makeReq('Frank Herbert');
    const res = await GET(req, makeCtx('Frank Herbert'));
    const data = await res.json();
    expect(data.podcasts.enabled).toBe(false);
    expect(data.podcasts.episodes).toEqual([]);
  });

  it('fetches podcast episodes when enabled', async () => {
    mockIsPodcastEnabled.mockReturnValue(true);
    mockSearchPodcasts.mockResolvedValue({
      episodes: [{ id: 'ep1', title: 'Frank on Books' }],
      total: 1,
    });
    const req = makeReq('Frank Herbert');
    const res = await GET(req, makeCtx('Frank Herbert'));
    const data = await res.json();
    expect(data.podcasts.enabled).toBe(true);
    expect(data.podcasts.episodes).toHaveLength(1);
    expect(data.podcasts.totalFound).toBe(1);
  });

  it('includes notes from user books', async () => {
    mockBook.findMany.mockResolvedValue([
      {
        id: 'b1', title: 'Dune', status: 'FINISHED', rating: 5,
        dateFinished: new Date(), coverImageUrl: null, thoughts: null,
        notes: [
          { id: 'n1', content: 'Great book!', page: 100 },
        ],
      },
    ]);
    const req = makeReq('Frank Herbert');
    const res = await GET(req, makeCtx('Frank Herbert'));
    const data = await res.json();
    expect(data.userNotes).toHaveLength(1);
    expect(data.userNotes[0].bookTitle).toBe('Dune');
  });

  it('returns 500 on error', async () => {
    mockGetAuthorData.mockRejectedValueOnce(new Error('api down'));
    const req = makeReq('Frank Herbert');
    const res = await GET(req, makeCtx('Frank Herbert'));
    expect(res.status).toBe(500);
  });
});
