/**
 * Tests for src/lib/services/notion.ts
 * Mocks @notionhq/client and Prisma.
 */

// ---- Prisma mock ----
jest.mock('@/lib/prisma', () => ({
  prisma: {
    book: {
      findMany: jest.fn(),
      createMany: jest.fn(),
      findUnique: jest.fn(),
    },
    notionImport: {
      create: jest.fn(),
      findFirst: jest.fn(),
    },
  },
}));

// ---- Notion client mock ----
jest.mock('@notionhq/client', () => ({
  Client: jest.fn().mockImplementation(() => ({
    search: jest.fn(),
  })),
}));

import { Client } from '@notionhq/client';
import { prisma } from '@/lib/prisma';
import { getNotionDatabases, importFromNotion, getLastImport } from '@/lib/services/notion';

const bookFindMany = prisma.book.findMany as jest.Mock;
const bookCreateMany = prisma.book.createMany as jest.Mock;
const notionImportCreate = prisma.notionImport.create as jest.Mock;
const notionImportFindFirst = prisma.notionImport.findFirst as jest.Mock;
const mockFetch = global.fetch as jest.Mock;

const MockClient = Client as unknown as jest.Mock;

function getNotionSearchMock() {
  const instance = MockClient.mock.results[0]?.value;
  return instance?.search as jest.Mock;
}

function setupNotionSearch(response: unknown) {
  MockClient.mockImplementationOnce(() => ({
    search: jest.fn().mockResolvedValue(response),
  }));
}

function setupNotionSearchError(error: Error) {
  MockClient.mockImplementationOnce(() => ({
    search: jest.fn().mockRejectedValue(error),
  }));
}

// Helpers to build Notion property shapes
function titleProp(text: string) {
  return { type: 'title', title: [{ plain_text: text }] };
}
function multiSelectProp(names: string[]) {
  return { type: 'multi_select', multi_select: names.map(n => ({ name: n })) };
}
function selectProp(name: string) {
  return { type: 'select', select: { name } };
}
function numberProp(value: number | null) {
  return { type: 'number', number: value };
}
function dateProp(start: string) {
  return { type: 'date', date: { start } };
}

function makeNotionPage(id: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    object: 'page',
    properties: {
      Name: titleProp('Test Book'),
      'Author(s)': multiSelectProp(['Test Author']),
      Rating: numberProp(4),
      Status: selectProp('Finished'),
      Media: multiSelectProp(['Audible']),
      Category: selectProp('Non-Fiction'),
      'Sub-Category': multiSelectProp(['Science']),
      Priority: selectProp('High'),
      'Date Finished': dateProp('2024-06-15'),
      ...overrides,
    },
  };
}

describe('notion service', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  // -----------------------------------------------------------------------
  describe('getNotionDatabases', () => {
    it('returns filtered databases from search results', async () => {
      setupNotionSearch({
        results: [
          { object: 'database', id: 'db1', title: [{ plain_text: 'My Books' }] },
          { object: 'page', id: 'p1', title: [] },
          { object: 'database', id: 'db2', title: [{ plain_text: 'Reading List' }] },
        ],
      });
      const result = await getNotionDatabases('token');
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ id: 'db1', name: 'My Books' });
      expect(result[1]).toEqual({ id: 'db2', name: 'Reading List' });
    });

    it('uses "Untitled Database" when title is missing', async () => {
      setupNotionSearch({
        results: [{ object: 'database', id: 'db1', title: [] }],
      });
      const result = await getNotionDatabases('token');
      expect(result[0].name).toBe('Untitled Database');
    });

    it('throws on Notion client error', async () => {
      setupNotionSearchError(new Error('Unauthorized'));
      await expect(getNotionDatabases('bad-token')).rejects.toThrow('Failed to fetch Notion databases');
    });
  });

  // -----------------------------------------------------------------------
  describe('importFromNotion', () => {
    function setupFetchWithPages(pages: unknown[], hasMore = false) {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ results: pages, has_more: hasMore, next_cursor: undefined }),
      });
    }

    it('imports new books and returns counts', async () => {
      const page = makeNotionPage('page-1');
      setupFetchWithPages([page]);
      bookFindMany.mockResolvedValue([]); // No existing books
      bookCreateMany.mockResolvedValue({ count: 1 });
      notionImportCreate.mockResolvedValue({});

      const result = await importFromNotion('token', 'db1');
      expect(result.itemsImported).toBe(1);
      expect(result.totalFound).toBe(1);
      expect(result.skipped).toBe(0);
    });

    it('skips books already imported by notionPageId', async () => {
      const page = makeNotionPage('page-1');
      setupFetchWithPages([page]);
      bookFindMany.mockResolvedValue([{ notionPageId: 'page-1' }]);
      notionImportCreate.mockResolvedValue({});

      const result = await importFromNotion('token', 'db1');
      expect(result.skipped).toBe(1);
      expect(result.itemsImported).toBe(0);
    });

    it('records import with success status', async () => {
      setupFetchWithPages([makeNotionPage('p1')]);
      bookFindMany.mockResolvedValue([]);
      bookCreateMany.mockResolvedValue({});
      notionImportCreate.mockResolvedValue({});

      await importFromNotion('token', 'db1');
      expect(notionImportCreate).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: 'success' }) })
      );
    });

    it('records import with error status and re-throws on fetch failure', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, json: async () => ({ message: 'Forbidden' }) });
      notionImportCreate.mockResolvedValue({});
      await expect(importFromNotion('token', 'db1')).rejects.toThrow();
      expect(notionImportCreate).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: 'error' }) })
      );
    });

    it('maps Notion status to ReadingStatus correctly', async () => {
      const page = makeNotionPage('p1', { Status: selectProp('Reading') });
      setupFetchWithPages([page]);
      bookFindMany.mockResolvedValue([]);
      bookCreateMany.mockResolvedValue({});
      notionImportCreate.mockResolvedValue({});

      await importFromNotion('token', 'db1');
      const createData = bookCreateMany.mock.calls[0][0].data[0];
      expect(createData.status).toBe('READING');
    });

    it('maps Notion category Fiction correctly', async () => {
      const page = makeNotionPage('p1', { Category: selectProp('Fiction') });
      setupFetchWithPages([page]);
      bookFindMany.mockResolvedValue([]);
      bookCreateMany.mockResolvedValue({});
      notionImportCreate.mockResolvedValue({});

      await importFromNotion('token', 'db1');
      const createData = bookCreateMany.mock.calls[0][0].data[0];
      expect(createData.category).toBe('FICTION');
    });

    it('maps Audible media to AUDIOBOOK', async () => {
      const page = makeNotionPage('p1', { Media: multiSelectProp(['Audible']) });
      setupFetchWithPages([page]);
      bookFindMany.mockResolvedValue([]);
      bookCreateMany.mockResolvedValue({});
      notionImportCreate.mockResolvedValue({});

      await importFromNotion('token', 'db1');
      const createData = bookCreateMany.mock.calls[0][0].data[0];
      expect(createData.mediaTypes).toContain('AUDIOBOOK');
    });

    it('maps Kindle media to EBOOK', async () => {
      const page = makeNotionPage('p1', { Media: multiSelectProp(['Kindle']) });
      setupFetchWithPages([page]);
      bookFindMany.mockResolvedValue([]);
      bookCreateMany.mockResolvedValue({});
      notionImportCreate.mockResolvedValue({});

      await importFromNotion('token', 'db1');
      const createData = bookCreateMany.mock.calls[0][0].data[0];
      expect(createData.mediaTypes).toContain('EBOOK');
    });

    it('maps High priority to 1', async () => {
      setupFetchWithPages([makeNotionPage('p1', { Priority: selectProp('High') })]);
      bookFindMany.mockResolvedValue([]);
      bookCreateMany.mockResolvedValue({});
      notionImportCreate.mockResolvedValue({});

      await importFromNotion('token', 'db1');
      const createData = bookCreateMany.mock.calls[0][0].data[0];
      expect(createData.priority).toBe(1);
    });

    it('handles pagination - fetches multiple pages', async () => {
      const page1 = makeNotionPage('p1');
      const page2 = makeNotionPage('p2');
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ results: [page1], has_more: true, next_cursor: 'cursor1' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ results: [page2], has_more: false, next_cursor: undefined }),
        });
      bookFindMany.mockResolvedValue([]);
      bookCreateMany.mockResolvedValue({});
      notionImportCreate.mockResolvedValue({});

      const result = await importFromNotion('token', 'db1');
      expect(result.totalFound).toBe(2);
    });

    it('skips createMany when all books are already imported', async () => {
      const page = makeNotionPage('p1');
      setupFetchWithPages([page]);
      bookFindMany.mockResolvedValue([{ notionPageId: 'p1' }]);
      notionImportCreate.mockResolvedValue({});

      await importFromNotion('token', 'db1');
      expect(bookCreateMany).not.toHaveBeenCalled();
    });
  });

  // -----------------------------------------------------------------------
  describe('getLastImport', () => {
    it('returns most recent import record', async () => {
      notionImportFindFirst.mockResolvedValue({ id: '1', importedAt: new Date(), status: 'success', itemsImported: 5 });
      const result = await getLastImport();
      expect(result?.status).toBe('success');
      expect(notionImportFindFirst).toHaveBeenCalledWith({
        orderBy: { importedAt: 'desc' },
      });
    });

    it('returns null when no imports exist', async () => {
      notionImportFindFirst.mockResolvedValue(null);
      expect(await getLastImport()).toBeNull();
    });
  });
});
