export {};
/**
 * Tests for src/lib/services/podcasts.ts
 * The API key is read at module load time, so tests reload the module
 * with different environment configurations.
 */

const mockFetch = global.fetch as jest.Mock;

const loadModule = (apiKey?: string) => {
  jest.resetModules();
  if (apiKey === undefined) {
    delete process.env.LISTENNOTES_API_KEY;
  } else {
    process.env.LISTENNOTES_API_KEY = apiKey;
  }
  return require('@/lib/services/podcasts') as typeof import('@/lib/services/podcasts');
};

const originalKey = process.env.LISTENNOTES_API_KEY;

afterAll(() => {
  if (originalKey === undefined) {
    delete process.env.LISTENNOTES_API_KEY;
  } else {
    process.env.LISTENNOTES_API_KEY = originalKey;
  }
});

beforeEach(() => {
  jest.clearAllMocks();
});

const episodeResult = {
  id: 'ep1',
  title_original: 'An Interview',
  description_original: '<p>Hello&nbsp;world</p>',
  podcast: {
    id: 'pod1',
    title_original: 'The Podcast',
    image: 'img.jpg',
    listennotes_url: 'https://ln.com/pod',
  },
  audio: 'audio.mp3',
  listennotes_url: 'https://ln.com/ep',
  pub_date_ms: 1700000000000,
  audio_length_sec: 3600,
};

describe('isPodcastSearchEnabled', () => {
  it('is false without an API key', () => {
    const mod = loadModule(undefined);
    expect(mod.isPodcastSearchEnabled()).toBe(false);
  });

  it('is true with an API key', () => {
    const mod = loadModule('test-key');
    expect(mod.isPodcastSearchEnabled()).toBe(true);
  });
});

describe('searchPodcastEpisodes', () => {
  it('returns null when no API key is configured', async () => {
    const mod = loadModule(undefined);
    expect(await mod.searchPodcastEpisodes('Jane Author')).toBeNull();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('maps ListenNotes results to PodcastEpisode objects', async () => {
    const mod = loadModule('test-key');
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ results: [episodeResult], total: 42 }),
    });

    const result = await mod.searchPodcastEpisodes('Jane Author');
    expect(result?.total).toBe(42);
    expect(result?.episodes).toHaveLength(1);
    expect(result?.episodes[0]).toMatchObject({
      id: 'ep1',
      title: 'An Interview',
      description: 'Hello world', // HTML stripped
      podcastTitle: 'The Podcast',
      durationSeconds: 3600,
    });
    expect(new Date(result!.episodes[0].publishDate).getTime()).toBe(1700000000000);

    // API key header sent
    const [, options] = mockFetch.mock.calls[0];
    expect(options.headers['X-ListenAPI-Key']).toBe('test-key');
  });

  it('respects the limit parameter', async () => {
    const mod = loadModule('test-key');
    const many = Array.from({ length: 10 }, (_, i) => ({ ...episodeResult, id: `ep${i}` }));
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ results: many, total: 10 }),
    });

    const result = await mod.searchPodcastEpisodes('X', 3);
    expect(result?.episodes).toHaveLength(3);
  });

  it('returns null on API error', async () => {
    const mod = loadModule('test-key');
    mockFetch.mockResolvedValue({
      ok: false,
      status: 429,
      text: async () => 'rate limited',
    });
    expect(await mod.searchPodcastEpisodes('X')).toBeNull();
  });

  it('returns null when fetch throws', async () => {
    const mod = loadModule('test-key');
    mockFetch.mockRejectedValue(new Error('offline'));
    expect(await mod.searchPodcastEpisodes('X')).toBeNull();
  });
});

describe('formatDuration', () => {
  it('formats minutes-only durations', () => {
    const mod = loadModule(undefined);
    expect(mod.formatDuration(600)).toBe('10 min');
    expect(mod.formatDuration(59 * 60)).toBe('59 min');
  });

  it('formats hour+ durations', () => {
    const mod = loadModule(undefined);
    expect(mod.formatDuration(3600)).toBe('1h 0m');
    expect(mod.formatDuration(3660)).toBe('1h 1m');
    expect(mod.formatDuration(7260)).toBe('2h 1m');
  });
});
