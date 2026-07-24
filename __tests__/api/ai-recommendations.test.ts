/**
 * Tests for GET /api/ai/recommendations
 * @jest-environment node
 */
export {};

jest.mock('@/lib/prisma', () => ({
  prisma: {
    book: { findMany: jest.fn() },
  },
}));

const originalKey = process.env.OPENAI_API_KEY;

afterAll(() => {
  if (originalKey === undefined) delete process.env.OPENAI_API_KEY;
  else process.env.OPENAI_API_KEY = originalKey;
});

const mockFetch = global.fetch as jest.Mock;

function loadRoute(apiKey?: string) {
  jest.resetModules();
  if (apiKey === undefined) {
    delete process.env.OPENAI_API_KEY;
  } else {
    process.env.OPENAI_API_KEY = apiKey;
  }
  jest.mock('@/lib/prisma', () => ({
    prisma: {
      book: {
        findMany: jest.fn().mockResolvedValue([
          { title: 'Dune', author: 'Frank Herbert', category: 'FICTION', subCategory: 'SciFi', rating: 5 },
        ]),
      },
    },
  }));
  return require('@/app/api/ai/recommendations/route') as typeof import('@/app/api/ai/recommendations/route');
}

function getReq(): any {
  return { url: 'http://localhost/api/ai/recommendations' };
}

describe('GET /api/ai/recommendations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 503 when OPENAI_API_KEY is not configured', async () => {
    const { GET } = loadRoute(undefined);
    const res = await GET(getReq());
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.error).toMatch(/not configured/i);
  });

  it('returns recommendations from OpenAI', async () => {
    const { GET } = loadRoute('sk-test');
    const recs = [
      { title: 'Foundation', author: 'Isaac Asimov', reason: 'You love sci-fi.', confidence: 'high' },
    ];
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: JSON.stringify(recs) } }],
      }),
    });

    const res = await GET(getReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.recommendations).toHaveLength(1);
    expect(body.recommendations[0].title).toBe('Foundation');
  });

  it('handles JSON wrapped in markdown code blocks', async () => {
    const { GET } = loadRoute('sk-test');
    const recs = [{ title: 'Neuromancer', author: 'Gibson', reason: 'Cyberpunk', confidence: 'medium' }];
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: `\`\`\`json\n${JSON.stringify(recs)}\n\`\`\`` } }],
      }),
    });

    const res = await GET(getReq());
    const body = await res.json();
    expect(body.recommendations).toHaveLength(1);
  });

  it('returns 429 when quota exceeded', async () => {
    const { GET } = loadRoute('sk-test');
    mockFetch.mockResolvedValueOnce({
      ok: false,
      text: async () => JSON.stringify({ error: { message: 'You exceeded your current quota' } }),
    });
    const res = await GET(getReq());
    expect(res.status).toBe(429);
    expect((await res.json()).code).toBe('QUOTA_EXCEEDED');
  });

  it('returns 401 when API key is invalid', async () => {
    const { GET } = loadRoute('sk-bad');
    mockFetch.mockResolvedValueOnce({
      ok: false,
      text: async () => JSON.stringify({ error: { message: 'Incorrect API key provided' } }),
    });
    const res = await GET(getReq());
    expect(res.status).toBe(401);
    expect((await res.json()).code).toBe('INVALID_KEY');
  });

  it('returns 500 on generic API error', async () => {
    const { GET } = loadRoute('sk-test');
    mockFetch.mockResolvedValueOnce({
      ok: false,
      text: async () => JSON.stringify({ error: { message: 'Server error' } }),
    });
    const res = await GET(getReq());
    expect(res.status).toBe(500);
  });

  it('returns 500 when fetch throws', async () => {
    const { GET } = loadRoute('sk-test');
    mockFetch.mockRejectedValueOnce(new Error('Network'));
    const res = await GET(getReq());
    expect(res.status).toBe(500);
  });

  it('includes context in response (booksAnalyzed, favoriteAuthors)', async () => {
    const { GET } = loadRoute('sk-test');
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ choices: [{ message: { content: '[]' } }] }),
    });
    const res = await GET(getReq());
    const body = await res.json();
    expect(body).toHaveProperty('context');
    expect(typeof body.context.booksAnalyzed).toBe('number');
  });
});
