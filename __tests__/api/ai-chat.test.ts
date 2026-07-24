/**
 * Tests for POST /api/ai/chat
 * Uses jest.resetModules() to reload the route with different OPENAI_API_KEY values.
 * @jest-environment node
 */
export {};

jest.mock('@/lib/prisma', () => ({
  prisma: {
    book: { findMany: jest.fn() },
    note: { findMany: jest.fn() },
    readingGoal: { findMany: jest.fn() },
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
  // Re-mock prisma after resetModules
  jest.mock('@/lib/prisma', () => ({
    prisma: {
      book: { findMany: jest.fn().mockResolvedValue([]) },
      note: { findMany: jest.fn().mockResolvedValue([]) },
      readingGoal: { findMany: jest.fn().mockResolvedValue([]) },
    },
  }));
  return require('@/app/api/ai/chat/route') as typeof import('@/app/api/ai/chat/route');
}

function postReq(body: unknown): any {
  return { url: 'http://localhost/api/ai/chat', json: async () => body };
}

describe('POST /api/ai/chat', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 503 when OPENAI_API_KEY is not configured', async () => {
    const { POST } = loadRoute(undefined);
    const res = await POST(postReq({ message: 'Hello' }));
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.error).toMatch(/not configured/i);
  });

  it('returns 400 when message is missing', async () => {
    const { POST } = loadRoute('sk-test-key');
    const res = await POST(postReq({ history: [] }));
    expect(res.status).toBe(400);
  });

  it('calls OpenAI API with the message', async () => {
    const { POST } = loadRoute('sk-test-key');
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: 'AI response here' } }],
      }),
    });

    const res = await POST(postReq({ message: 'What did I read last month?' }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.reply).toBe('AI response here');
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.openai.com/v1/chat/completions',
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('returns 429 when OpenAI quota is exceeded', async () => {
    const { POST } = loadRoute('sk-test-key');
    mockFetch.mockResolvedValueOnce({
      ok: false,
      text: async () => JSON.stringify({
        error: { message: 'You exceeded your current quota, please check your plan' },
      }),
    });

    const res = await POST(postReq({ message: 'Hello' }));
    expect(res.status).toBe(429);
    const body = await res.json();
    expect(body.code).toBe('QUOTA_EXCEEDED');
  });

  it('returns 401 when OpenAI key is invalid', async () => {
    const { POST } = loadRoute('sk-bad-key');
    mockFetch.mockResolvedValueOnce({
      ok: false,
      text: async () => JSON.stringify({
        error: { message: 'Incorrect API key provided: sk-bad-key' },
      }),
    });

    const res = await POST(postReq({ message: 'Hello' }));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.code).toBe('INVALID_KEY');
  });

  it('returns 500 for generic OpenAI error', async () => {
    const { POST } = loadRoute('sk-test-key');
    mockFetch.mockResolvedValueOnce({
      ok: false,
      text: async () => JSON.stringify({ error: { message: 'Internal server error' } }),
    });

    const res = await POST(postReq({ message: 'Hello' }));
    expect(res.status).toBe(500);
  });

  it('returns 500 when fetch throws', async () => {
    const { POST } = loadRoute('sk-test-key');
    mockFetch.mockRejectedValueOnce(new Error('Network error'));
    const res = await POST(postReq({ message: 'Hello' }));
    expect(res.status).toBe(500);
  });
});
