/**
 * Tests for /api/ai/chat and /api/ai/recommendations
 * @jest-environment node
 *
 * The AI routes capture OPENAI_API_KEY as a module-level constant at import
 * time, so we split tests by setting the env var BEFORE (re-)loading the module.
 */

jest.mock('@/lib/prisma', () => ({
  prisma: {
    book: {
      findMany: jest.fn(),
    },
    note: {
      findMany: jest.fn(),
    },
    readingGoal: {
      findMany: jest.fn(),
    },
  },
}));

import { prisma } from '@/lib/prisma';
import { NextRequest } from 'next/server';

const mockBook = prisma.book as unknown as { findMany: jest.Mock };
const mockNote = prisma.note as unknown as { findMany: jest.Mock };
const mockGoal = prisma.readingGoal as unknown as { findMany: jest.Mock };
const mockFetch = global.fetch as jest.Mock;

function makeReq(url: string, body?: unknown, method = 'GET'): NextRequest {
  return new NextRequest(url, {
    method,
    body: body != null ? JSON.stringify(body) : undefined,
    headers: body != null ? { 'content-type': 'application/json' } : {},
  });
}

// Helper to make a fake OpenAI chat response
function makeOpenAIResponse(content: string) {
  return {
    ok: true,
    status: 200,
    json: jest.fn().mockResolvedValue({
      choices: [{ message: { content } }],
    }),
    text: jest.fn().mockResolvedValue(''),
  };
}

function makeOpenAIErrorResponse(message: string, status = 500) {
  return {
    ok: false,
    status,
    json: jest.fn().mockResolvedValue({ error: { message } }),
    text: jest.fn().mockResolvedValue(JSON.stringify({ error: { message } })),
  };
}

// =============================================================================
// Tests requiring NO OpenAI API key (503 responses)
// =============================================================================
describe('AI routes — no API key configured', () => {
  let chatPOST: (req: NextRequest) => Promise<Response>;
  let recommendationsGET: (req: NextRequest) => Promise<Response>;

  beforeAll(async () => {
    delete process.env.OPENAI_API_KEY;
    jest.resetModules();
    // Re-mock prisma after resetModules
    jest.mock('@/lib/prisma', () => ({
      prisma: {
        book: { findMany: jest.fn() },
        note: { findMany: jest.fn() },
        readingGoal: { findMany: jest.fn() },
      },
    }));
    const chatMod = await import('@/app/api/ai/chat/route');
    const recsMod = await import('@/app/api/ai/recommendations/route');
    chatPOST = chatMod.POST;
    recommendationsGET = recsMod.GET;
  });

  it('POST /api/ai/chat returns 503 when key not configured', async () => {
    const req = makeReq('http://localhost/api/ai/chat', { message: 'Hi' }, 'POST');
    const res = await chatPOST(req);
    expect(res.status).toBe(503);
    const data = await (res as any).json();
    expect(data.error).toContain('OPENAI_API_KEY');
  });

  it('GET /api/ai/recommendations returns 503 when key not configured', async () => {
    const req = makeReq('http://localhost/api/ai/recommendations');
    const res = await recommendationsGET(req);
    expect(res.status).toBe(503);
  });
});

// =============================================================================
// Tests with a valid API key
// =============================================================================
describe('AI routes — with API key configured', () => {
  let chatPOST: (req: NextRequest) => Promise<Response>;
  let recommendationsGET: (req: NextRequest) => Promise<Response>;

  beforeAll(async () => {
    process.env.OPENAI_API_KEY = 'test-key-12345';
    jest.resetModules();
    jest.mock('@/lib/prisma', () => ({
      prisma: {
        book: { findMany: jest.fn().mockResolvedValue([]) },
        note: { findMany: jest.fn().mockResolvedValue([]) },
        readingGoal: { findMany: jest.fn().mockResolvedValue([]) },
      },
    }));
    const chatMod = await import('@/app/api/ai/chat/route');
    const recsMod = await import('@/app/api/ai/recommendations/route');
    chatPOST = chatMod.POST;
    recommendationsGET = recsMod.GET;
  });

  afterAll(() => {
    delete process.env.OPENAI_API_KEY;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockBook.findMany.mockResolvedValue([]);
    mockNote.findMany.mockResolvedValue([]);
    mockGoal.findMany.mockResolvedValue([]);
  });

  // --- /api/ai/chat ----------------------------------------------------------

  it('POST /api/ai/chat returns 400 when message is missing', async () => {
    const req = makeReq('http://localhost/api/ai/chat', { history: [] }, 'POST');
    const res = await chatPOST(req);
    expect(res.status).toBe(400);
  });

  it('POST /api/ai/chat returns 200 with reply on success', async () => {
    mockFetch.mockResolvedValueOnce(makeOpenAIResponse('Hello there!'));
    const req = makeReq(
      'http://localhost/api/ai/chat',
      { message: 'What am I reading?', history: [] },
      'POST'
    );
    const res = await chatPOST(req);
    expect(res.status).toBe(200);
    const data = await (res as any).json();
    expect(data.reply).toBe('Hello there!');
  });

  it('POST /api/ai/chat sends history to OpenAI (last 10 messages)', async () => {
    mockFetch.mockResolvedValueOnce(makeOpenAIResponse('Reply'));
    const history = Array(15).fill(null).map((_, i) => ({
      role: i % 2 === 0 ? 'user' : 'assistant',
      content: `Message ${i}`,
    }));
    const req = makeReq(
      'http://localhost/api/ai/chat',
      { message: 'New message', history },
      'POST'
    );
    await chatPOST(req);
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    // system + up to 10 history + 1 user = at most 12 messages
    expect(body.messages.length).toBeLessThanOrEqual(12);
  });

  it('POST /api/ai/chat returns 429 on quota exceeded', async () => {
    mockFetch.mockResolvedValueOnce(makeOpenAIErrorResponse('You exceeded your current quota', 429));
    const req = makeReq('http://localhost/api/ai/chat', { message: 'Hello' }, 'POST');
    const res = await chatPOST(req);
    expect(res.status).toBe(429);
    const data = await (res as any).json();
    expect(data.code).toBe('QUOTA_EXCEEDED');
  });

  it('POST /api/ai/chat returns 401 on invalid key', async () => {
    mockFetch.mockResolvedValueOnce(makeOpenAIErrorResponse('Incorrect API key provided', 401));
    const req = makeReq('http://localhost/api/ai/chat', { message: 'Hello' }, 'POST');
    const res = await chatPOST(req);
    expect(res.status).toBe(401);
    const data = await (res as any).json();
    expect(data.code).toBe('INVALID_KEY');
  });

  it('POST /api/ai/chat returns 500 on generic OpenAI error', async () => {
    mockFetch.mockResolvedValueOnce(makeOpenAIErrorResponse('Internal error', 500));
    const req = makeReq('http://localhost/api/ai/chat', { message: 'Hello' }, 'POST');
    const res = await chatPOST(req);
    expect(res.status).toBe(500);
  });

  it('POST /api/ai/chat returns 500 on fetch exception', async () => {
    mockFetch.mockRejectedValueOnce(new Error('network down'));
    const req = makeReq('http://localhost/api/ai/chat', { message: 'Hello' }, 'POST');
    const res = await chatPOST(req);
    expect(res.status).toBe(500);
  });

  // --- /api/ai/recommendations ------------------------------------------------

  it('GET /api/ai/recommendations returns 200 with parsed recommendations', async () => {
    const recs = [
      { title: 'Foundation', author: 'Asimov', reason: 'You love sci-fi', confidence: 'high' },
    ];
    mockFetch.mockResolvedValueOnce(makeOpenAIResponse(JSON.stringify(recs)));
    const req = makeReq('http://localhost/api/ai/recommendations');
    const res = await recommendationsGET(req);
    expect(res.status).toBe(200);
    const data = await (res as any).json();
    expect(data.recommendations).toHaveLength(1);
    expect(data.recommendations[0].title).toBe('Foundation');
    expect(data.context).toBeDefined();
  });

  it('GET /api/ai/recommendations handles JSON in markdown code block', async () => {
    const recs = [{ title: 'Dune', author: 'Herbert', reason: 'Epic', confidence: 'high' }];
    mockFetch.mockResolvedValueOnce(
      makeOpenAIResponse('```json\n' + JSON.stringify(recs) + '\n```')
    );
    const req = makeReq('http://localhost/api/ai/recommendations');
    const res = await recommendationsGET(req);
    const data = await (res as any).json();
    expect(data.recommendations).toHaveLength(1);
  });

  it('GET /api/ai/recommendations returns empty array on bad JSON', async () => {
    mockFetch.mockResolvedValueOnce(makeOpenAIResponse('not valid json'));
    const req = makeReq('http://localhost/api/ai/recommendations');
    const res = await recommendationsGET(req);
    const data = await (res as any).json();
    expect(data.recommendations).toEqual([]);
  });

  it('GET /api/ai/recommendations returns 429 on quota exceeded', async () => {
    mockFetch.mockResolvedValueOnce(makeOpenAIErrorResponse('exceeded your current quota', 429));
    const req = makeReq('http://localhost/api/ai/recommendations');
    const res = await recommendationsGET(req);
    expect(res.status).toBe(429);
  });

  it('GET /api/ai/recommendations returns 401 on invalid key', async () => {
    mockFetch.mockResolvedValueOnce(makeOpenAIErrorResponse('invalid_api_key', 401));
    const req = makeReq('http://localhost/api/ai/recommendations');
    const res = await recommendationsGET(req);
    expect(res.status).toBe(401);
  });

  it('GET /api/ai/recommendations returns 500 on fetch exception', async () => {
    mockFetch.mockRejectedValueOnce(new Error('network'));
    const req = makeReq('http://localhost/api/ai/recommendations');
    const res = await recommendationsGET(req);
    expect(res.status).toBe(500);
  });
});
