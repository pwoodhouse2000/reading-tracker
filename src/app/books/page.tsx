import { prisma } from '@/lib/prisma';
import { BookList } from '@/components/books/book-list';
import { BookAddButton, TodoistImportButton } from '@/components/books/admin-actions';

export const dynamic = 'force-dynamic';

export default async function BooksPage() {
  // Keep the full library available when changing filters without a reload.
  const books = await prisma.book.findMany({
    orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }],
  });

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-4xl font-bold text-foreground">My Library</h1>
          <p className="text-muted-foreground mt-2 text-lg">{books.length} books in your library</p>
        </div>
        <div className="flex gap-3 flex-wrap">
          <TodoistImportButton />
          <BookAddButton />
        </div>
      </div>
      <BookList books={books} />
    </div>
  );
}
