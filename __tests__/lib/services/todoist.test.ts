/**
 * Tests for src/lib/services/todoist.ts
 * Mocks Prisma, the book-api service, and global fetch (Todoist REST API).
 *
 * NOTE: jest.mock factories are hoisted before any variable declarations.
 * Define mocks INSIDE the factory or access them via the imported module.
 */

jest.mock('@/lib/prisma', () => ({
  prisma: {
    book: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    todoistSync: {
      create: jest.fn(),
      findFirst: jest.fn(),
    },
  },
}));

jest.mock('@/lib/services/book-api', () => ({
  searchBooks: jest.fn(),
  parseBookTitle: jest.requireActual('@/lib/services/book-api').parseBookTitle,
}));

import { prisma } from '@/lib/prisma';
import { searchBooks } from '@/lib/services/book-api';
import {
  getTodoistProjects,
  syncTodoistReadingList,
  getLastSync,
} from '@/lib/services/todoist';

const mockBook = prisma.book as unknown as {
  findUnique: jest.Mock;
  create: jest.Mock;
};
const mockTodoistSync = prisma.todoistSync as unknown as {
  create: jest.Mock;
  findFirst: jest.Mock;
};
const mockSearchBooks = searchBooks as jest.Mock;
const mockFetch = global.fetch as jest.Mock;

beforeEach(() => {
  // Mock setTimeout to immediately resolve delays in syncTodoistReadingList
  jest.spyOn(global, 'setTimeout').mockImplementation((fn: any) => { fn(); return 0 as any; });
  jest.clearAllMocks();
});

afterEach(() => {
  jest.restoreAllMocks();
});

// =============================================================================
describe('getTodoistProjects', () => {
  it('follows the API v1 cursor through all projects', async () => {
    mockFetch.mockResolvedValueOnce({ok:true,json:async()=>({results:[{id:'p1',name:'One'}],next_cursor:'page-two'})});
    mockFetch.mockResolvedValueOnce({ok:true,json:async()=>({results:[{id:'p2',name:'Two'}],next_cursor:null})});
    expect(await getTodoistProjects('token')).toEqual([{id:'p1',name:'One'},{id:'p2',name:'Two'}]);
    expect(mockFetch.mock.calls[1][0]).toBe('https://api.todoist.com/api/v1/projects?cursor=page-two');
  });
  it('maps projects to id/name', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => [
        { id: 'p1', name: 'Reading List' },
        { id: 'p2', name: 'Other' },
      ],
    });

    const projects = await getTodoistProjects('token');
    expect(projects).toEqual([
      { id: 'p1', name: 'Reading List' },
      { id: 'p2', name: 'Other' },
    ]);
    expect(mockFetch.mock.calls[0][1].headers.Authorization).toBe('Bearer token');
  });

  it('throws a friendly error on API failure', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 401 });
    await expect(getTodoistProjects('bad')).rejects.toThrow(
      'Failed to fetch Todoist projects. Please check your API token.'
    );
  });

  it('throws a friendly error on network exception', async () => {
    mockFetch.mockRejectedValueOnce(new Error('network down'));
    await expect(getTodoistProjects('token')).rejects.toThrow(
      'Failed to fetch Todoist projects.'
    );
  });
});

// =============================================================================
describe('syncTodoistReadingList', () => {
  const task = (id: string, content: string, extra: Record<string, unknown> = {}) => ({
    id,
    content,
    labels: [],
    priority: 4,
    ...extra,
  });

  const mockTasksResponse = (tasks: unknown[]) => ({
    ok: true,
    json: async () => tasks,
  });

  it('syncs new tasks, enriches them, and closes them in Todoist', async () => {
    mockFetch.mockImplementation((url: string) => {
      if (url.includes('/tasks?project_id='))
        return Promise.resolve(mockTasksResponse([task('t1', 'Dune (Frank Herbert)')]));
      if (url.includes('/close')) return Promise.resolve({ ok: true });
      return Promise.reject(new Error('unexpected url ' + url));
    });
    mockBook.findUnique.mockResolvedValue(null);
    mockSearchBooks.mockResolvedValue([
      {
        title: 'Dune',
        author: 'Frank Herbert',
        summary: 'S',
        coverImageUrl: 'C',
        isbn: 'I',
        apiSource: 'combined',
      },
    ]);
    mockBook.create.mockResolvedValue({});
    mockTodoistSync.create.mockResolvedValue({});

    const result = await syncTodoistReadingList('token', 'proj1');

    expect(result).toEqual({ synced: 1, errors: [], skipped: 0, enriched: 1 });
    expect(mockBook.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        title: 'Dune',
        author: 'Frank Herbert',
        status: 'TO_READ',
        category: 'NON_FICTION',
        mediaTypes: 'PAPER',
        summary: 'S',
        coverImageUrl: 'C',
        isbn: 'I',
        priority: 1, // 5 - todoist priority 4
        todoistTaskId: 't1',
      }),
    });
    // closed in Todoist
    const closeCall = mockFetch.mock.calls.find(([url]: [string]) =>
      url.includes('/t1/close')
    );
    expect(closeCall).toBeDefined();
    // sync recorded
    expect(mockTodoistSync.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        projectId: 'proj1',
        syncStatus: 'success',
        itemsSynced: 1,
      }),
    });
  });

  it('skips tasks that were already synced', async () => {
    mockFetch.mockImplementation((url: string) =>
      Promise.resolve(
        url.includes('/tasks?project_id=')
          ? mockTasksResponse([task('t1', 'Dune')])
          : { ok: true }
      )
    );
    mockBook.findUnique.mockResolvedValue({ id: 'existing' });
    mockTodoistSync.create.mockResolvedValue({});

    const result = await syncTodoistReadingList('token', 'proj1');
    expect(result.skipped).toBe(1);
    expect(result.synced).toBe(0);
    expect(mockBook.create).not.toHaveBeenCalled();
  });

  it('marks category FICTION when a fiction label is present', async () => {
    mockFetch.mockImplementation((url: string) =>
      Promise.resolve(
        url.includes('/tasks?project_id=')
          ? mockTasksResponse([task('t1', 'Novel', { labels: ['fiction'] })])
          : { ok: true }
      )
    );
    mockBook.findUnique.mockResolvedValue(null);
    mockSearchBooks.mockResolvedValue([]);
    mockBook.create.mockResolvedValue({});
    mockTodoistSync.create.mockResolvedValue({});

    await syncTodoistReadingList('token', 'proj1');
    expect(mockBook.create.mock.calls[0][0].data.category).toBe('FICTION');
  });

  it('does not close tasks when autoComplete is false', async () => {
    mockFetch.mockImplementation((url: string) =>
      Promise.resolve(
        url.includes('/tasks?project_id=')
          ? mockTasksResponse([task('t1', 'Dune')])
          : { ok: true }
      )
    );
    mockBook.findUnique.mockResolvedValue(null);
    mockSearchBooks.mockResolvedValue([]);
    mockBook.create.mockResolvedValue({});
    mockTodoistSync.create.mockResolvedValue({});

    await syncTodoistReadingList('token', 'proj1', false);
    const closeCall = mockFetch.mock.calls.find(([url]: [string]) =>
      url.includes('/close')
    );
    expect(closeCall).toBeUndefined();
  });

  it('falls back to parsed title/author when enrichment finds nothing', async () => {
    mockFetch.mockImplementation((url: string) =>
      Promise.resolve(
        url.includes('/tasks?project_id=')
          ? mockTasksResponse([task('t1', 'Obscure Book - Some Author')])
          : { ok: true }
      )
    );
    mockBook.findUnique.mockResolvedValue(null);
    mockSearchBooks.mockResolvedValue([]);
    mockBook.create.mockResolvedValue({});
    mockTodoistSync.create.mockResolvedValue({});

    const result = await syncTodoistReadingList('token', 'proj1');
    expect(mockBook.create.mock.calls[0][0].data).toMatchObject({
      title: 'Obscure Book',
      author: 'Some Author',
    });
    expect(result.enriched).toBe(0);
  });

  it('collects errors for individual tasks without aborting the sync', async () => {
    mockFetch.mockImplementation((url: string) =>
      Promise.resolve(
        url.includes('/tasks?project_id=')
          ? mockTasksResponse([task('t1', 'Good Book'), task('t2', 'Bad Book')])
          : { ok: true }
      )
    );
    mockBook.findUnique.mockResolvedValue(null);
    mockSearchBooks.mockResolvedValue([]);
    mockBook.create
      .mockResolvedValueOnce({})
      .mockRejectedValueOnce(new Error('db write failed'));
    mockTodoistSync.create.mockResolvedValue({});

    const result = await syncTodoistReadingList('token', 'proj1');
    expect(result.synced).toBe(1);
    expect(result.errors).toEqual(['Failed to sync: Bad Book']);
    expect(mockTodoistSync.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ syncStatus: 'partial' }),
    });
  });

  it('throws a friendly error when the tasks request fails', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 403 });
    await expect(syncTodoistReadingList('bad', 'proj1')).rejects.toThrow(
      'Failed to sync with Todoist. Please check your settings.'
    );
  });
});

// =============================================================================
describe('getLastSync', () => {
  it('queries by projectId when provided', async () => {
    mockTodoistSync.findFirst.mockResolvedValue({ id: 's1' });
    await getLastSync('proj1');
    expect(mockTodoistSync.findFirst).toHaveBeenCalledWith({
      where: { projectId: 'proj1' },
      orderBy: { lastSyncedAt: 'desc' },
    });
  });

  it('queries without a filter when no projectId given', async () => {
    mockTodoistSync.findFirst.mockResolvedValue({ id: 's1' });
    await getLastSync();
    expect(mockTodoistSync.findFirst).toHaveBeenCalledWith({
      where: undefined,
      orderBy: { lastSyncedAt: 'desc' },
    });
  });
});
