/**
 * Tests for /api/notes (list + create) and /api/notes/[id]
 */

jest.mock('next/server', () => ({
  NextRequest: class NextRequest {},
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      json: async () => body,
    }),
  },
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    note: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

jest.mock('@/lib/auth-guard', () => ({
  requireAuth: jest.fn().mockResolvedValue(null),
}));

import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-guard';
import { GET as listNotes, POST as createNote } from '@/app/api/notes/route';
import { GET as getNote, PATCH as updateNote, DELETE as deleteNote } from '@/app/api/notes/[id]/route';

const notesFindMany = prisma.note.findMany as jest.Mock;
const notesFindUnique = prisma.note.findUnique as jest.Mock;
const notesCreate = prisma.note.create as jest.Mock;
const notesUpdate = prisma.note.update as jest.Mock;
const notesDelete = prisma.note.delete as jest.Mock;
const mockRequireAuth = requireAuth as jest.Mock;

const sampleNote = {
  id: 'n1',
  content: 'Great point',
  page: 50,
  bookId: 'b1',
  createdAt: new Date(),
  book: { id: 'b1', title: 'Dune', author: 'Herbert', coverImageUrl: null },
};

function req(url: string, body?: unknown): any {
  return { url, json: async () => body };
}

describe('Notes API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireAuth.mockResolvedValue(null);
  });

  // GET /api/notes
  describe('GET /api/notes', () => {
    it('returns all notes with 200', async () => {
      notesFindMany.mockResolvedValue([sampleNote]);
      const res = await listNotes(req('http://localhost/api/notes'));
      expect(res.status).toBe(200);
      expect((await res.json())).toHaveLength(1);
    });

    it('filters by bookId', async () => {
      notesFindMany.mockResolvedValue([]);
      await listNotes(req('http://localhost/api/notes?bookId=b1'));
      expect(notesFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ bookId: 'b1' }) })
      );
    });

    it('filters by search text', async () => {
      notesFindMany.mockResolvedValue([]);
      await listNotes(req('http://localhost/api/notes?search=great'));
      expect(notesFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ content: { contains: 'great' } }) })
      );
    });

    it('returns 500 on DB error', async () => {
      notesFindMany.mockRejectedValue(new Error('DB'));
      expect((await listNotes(req('http://localhost/api/notes'))).status).toBe(500);
    });
  });

  // POST /api/notes
  describe('POST /api/notes', () => {
    it('creates note and returns 201', async () => {
      notesCreate.mockResolvedValue(sampleNote);
      const res = await createNote(req('http://localhost/api/notes', { bookId: 'b1', content: 'Great point' }));
      expect(res.status).toBe(201);
    });

    it('returns 400 when bookId missing', async () => {
      expect((await createNote(req('http://localhost/api/notes', { content: 'x' }))).status).toBe(400);
    });

    it('returns 400 when content missing', async () => {
      expect((await createNote(req('http://localhost/api/notes', { bookId: 'b1' }))).status).toBe(400);
    });

    it('returns 401 when not authenticated', async () => {
      mockRequireAuth.mockResolvedValue({ status: 401, json: async () => ({}) });
      expect((await createNote(req('http://localhost/api/notes', { bookId: 'b1', content: 'x' }))).status).toBe(401);
    });

    it('returns 500 on DB error', async () => {
      notesCreate.mockRejectedValue(new Error('DB'));
      expect((await createNote(req('http://localhost/api/notes', { bookId: 'b1', content: 'x' }))).status).toBe(500);
    });
  });

  // GET /api/notes/[id]
  describe('GET /api/notes/[id]', () => {
    it('returns single note', async () => {
      notesFindUnique.mockResolvedValue(sampleNote);
      const res = await getNote(req('http://localhost/api/notes/n1'), { params: Promise.resolve({ id: 'n1' }) });
      expect(res.status).toBe(200);
    });

    it('returns 404 when not found', async () => {
      notesFindUnique.mockResolvedValue(null);
      expect((await getNote(req('http://localhost/api/notes/x'), { params: Promise.resolve({ id: 'x' }) })).status).toBe(404);
    });

    it('returns 500 on DB error', async () => {
      notesFindUnique.mockRejectedValue(new Error('DB'));
      expect((await getNote(req('http://localhost/api/notes/n1'), { params: Promise.resolve({ id: 'n1' }) })).status).toBe(500);
    });
  });

  // PATCH /api/notes/[id]
  describe('PATCH /api/notes/[id]', () => {
    it('updates note and returns updated data', async () => {
      notesUpdate.mockResolvedValue({ ...sampleNote, content: 'Updated' });
      const res = await updateNote(req('http://localhost/api/notes/n1', { content: 'Updated' }), { params: Promise.resolve({ id: 'n1' }) });
      expect(res.status).toBe(200);
    });

    it('returns 401 when not authenticated', async () => {
      mockRequireAuth.mockResolvedValue({ status: 401, json: async () => ({}) });
      expect((await updateNote(req('http://localhost/api/notes/n1', {}), { params: Promise.resolve({ id: 'n1' }) })).status).toBe(401);
    });

    it('returns 500 on DB error', async () => {
      notesUpdate.mockRejectedValue(new Error('DB'));
      expect((await updateNote(req('http://localhost/api/notes/n1', {}), { params: Promise.resolve({ id: 'n1' }) })).status).toBe(500);
    });
  });

  // DELETE /api/notes/[id]
  describe('DELETE /api/notes/[id]', () => {
    it('deletes note and returns success', async () => {
      notesDelete.mockResolvedValue(sampleNote);
      const res = await deleteNote(req('http://localhost/api/notes/n1'), { params: Promise.resolve({ id: 'n1' }) });
      const data = await res.json();
      expect(data.success).toBe(true);
    });

    it('returns 401 when not authenticated', async () => {
      mockRequireAuth.mockResolvedValue({ status: 401, json: async () => ({}) });
      expect((await deleteNote(req('http://localhost/api/notes/n1'), { params: Promise.resolve({ id: 'n1' }) })).status).toBe(401);
    });

    it('returns 500 on DB error', async () => {
      notesDelete.mockRejectedValue(new Error('DB'));
      expect((await deleteNote(req('http://localhost/api/notes/n1'), { params: Promise.resolve({ id: 'n1' }) })).status).toBe(500);
    });
  });
});
