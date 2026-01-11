import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { BookList } from '@/components/books/book-list';
import { Button } from '@/components/ui/button';
import { Plus, Download } from 'lucide-react';

// Force dynamic rendering - database queries at runtime
export const dynamic = 'force-dynamic';

export default async function BooksPage() {
  const books = await prisma.book.findMany({
    orderBy: [
      { priority: 'asc' },
      { createdAt: 'desc' },
    ],
  });

  // Calculate stats
  const stats = {
    total: books.length,
    withCovers: books.filter(b => b.coverImageUrl).length,
    withSummaries: books.filter(b => b.summary).length,
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-4xl font-bold text-foreground">My Library</h1>
          <p className="text-muted-foreground mt-2 text-lg">
            {stats.total} books • {stats.withCovers} with covers • {stats.withSummaries} with summaries
          </p>
        </div>
        <div className="flex gap-3">
          <Link href="/settings/todoist">
            <Button variant="outline" className="rounded-xl border-2">
              <Download className="h-4 w-4 mr-2" />
              Import from Todoist
            </Button>
          </Link>
          <Link href="/books/new">
            <Button className="rounded-xl shadow-lg shadow-primary/25">
              <Plus className="h-4 w-4 mr-2" />
              Add Book
            </Button>
          </Link>
        </div>
      </div>

      {/* Book List with Search and Filters */}
      <BookList books={books} />
    </div>
  );
}
