import { prisma } from '@/lib/prisma';
import { BookList } from '@/components/books/book-list';
import { BookAddButton, TodoistImportButton } from '@/components/books/admin-actions';
import { bookForViewer } from '@/lib/privacy';

export const dynamic = 'force-dynamic';

interface BooksPageProps {
  searchParams: Promise<{ status?: string; category?: string; subCategory?: string; year?: string; search?: string }>;
}

export default async function BooksPage({ searchParams }: BooksPageProps) {
  const params = await searchParams;
  // Filtering happens against the complete library, not an already filtered
  // subset. Never pass private thoughts to the library's client component.
  const books = await prisma.book.findMany({
    orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }],
  });
  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-4xl font-bold">My Library</h1>
          <p className="text-muted-foreground mt-2 text-lg">{books.length} books in your library</p>
        </div>
        <div className="flex gap-3"><TodoistImportButton /><BookAddButton /></div>
      </div>
      <BookList
        books={books.map(b => bookForViewer(b))}
        initialStatus={params.status}
        initialCategory={params.category}
        initialSubCategory={params.subCategory}
        initialSearch={params.search}
        initialYear={params.year}
      />
    </div>
  );
}
