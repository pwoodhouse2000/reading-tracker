/**
 * Tests for POST /api/notes/ocr
 * Uses jest.resetModules() to reload the route with different OPENAI_API_KEY values.
 * @jest-environment node
 */
export {};

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
  // Fresh auth-guard mock per module load (undefined = authenticated)
  jest.mock('@/lib/auth-guard', () => ({ requireAuth: jest.fn() }));
  const route = require('@/app/api/notes/ocr/route') as typeof import('@/app/api/notes/ocr/route');
  const guard = require('@/lib/auth-guard') as { requireAuth: jest.Mock };
  return { POST: route.POST, mockRequireAuth: guard.requireAuth };
}

function postReq(body: unknown): any {
  return { url: 'http://localhost/api/notes/ocr', json: async () => body };
}

const validBody = { image: 'aGVsbG8=', bookId: 'book-1' };

describe('POST /api/notes/ocr', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns the auth error response when unauthenticated', async () => {
    const { POST, mockRequireAuth } = loadRoute('sk-test-key');
    const { NextResponse } = require('next/server');
    mockRequireAuth.mockResolvedValue(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }));
    const res = await POST(postReq(validBody));
    expect(res.status).toBe(401);
  });

  it('returns 503 when OPENAI_API_KEY is not configured', async () => {
    const { POST } = loadRoute(undefined);
    const res = await POST(postReq(validBody));
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.error).toMatch(/not configured/i);
  });

  it('returns 400 when image is missing', async () => {
    const { POST } = loadRoute('sk-test-key');
    const res = await POST(postReq({ bookId: 'book-1' }));
    expect(res.status).toBe(400);
  });

  it('returns 400 when bookId is missing', async () => {
    const { POST } = loadRoute('sk-test-key');
    const res = await POST(postReq({ image: 'aGVsbG8=' }));
    expect(res.status).toBe(400);
  });

  it('returns 413 when the image payload is too large', async () => {
    const { POST } = loadRoute('sk-test-key');
    const res = await POST(postReq({ image: 'x'.repeat(7_000_001), bookId: 'book-1' }));
    expect(res.status).toBe(413);
  });

  it('extracts text from a data-URI image via OpenAI vision', async () => {
    const { POST } = loadRoute('sk-test-key');
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: 'It was the best of times.' } }],
      }),
    });

    const res = await POST(postReq({ image: 'data:image/jpeg;base64,aGVsbG8=', bookId: 'book-1' }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.text).toBe('It was the best of times.');

    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toBe('https://api.openai.com/v1/chat/completions');
    expect(options.method).toBe('POST');
    const payload = JSON.parse(options.body);
    expect(payload.model).toBe('gpt-4o-mini');
    expect(payload.messages[0].content[1].image_url.url).toBe('data:image/jpeg;base64,aGVsbG8=');
  });

  it('wraps raw base64 in a jpeg data URI', async () => {
    const { POST } = loadRoute('sk-test-key');
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: 'Some text' } }],
      }),
    });

    const res = await POST(postReq(validBody));
    expect(res.status).toBe(200);
    const payload = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(payload.messages[0].content[1].image_url.url).toBe('data:image/jpeg;base64,aGVsbG8=');
  });

  it('returns 429 when OpenAI quota is exceeded', async () => {
    const { POST } = loadRoute('sk-test-key');
    mockFetch.mockResolvedValueOnce({
      ok: false,
      text: async () => JSON.stringify({
        error: { message: 'You exceeded your current quota, please check your plan' },
      }),
    });

    const res = await POST(postReq(validBody));
    expect(res.status).toBe(429);
    const body = await res.json();
    expect(body.code).toBe('QUOTA_EXCEEDED');
  });

  it('returns 500 for a generic OpenAI error', async () => {
    const { POST } = loadRoute('sk-test-key');
    mockFetch.mockResolvedValueOnce({
      ok: false,
      text: async () => JSON.stringify({ error: { message: 'Internal server error' } }),
    });

    const res = await POST(postReq(validBody));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.details).toBe('Internal server error');
  });

  it('returns 422 when OpenAI returns no text', async () => {
    const { POST } = loadRoute('sk-test-key');
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ choices: [{ message: { content: '' } }] }),
    });

    const res = await POST(postReq(validBody));
    expect(res.status).toBe(422);
  });
});
