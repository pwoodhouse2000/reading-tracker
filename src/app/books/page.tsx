import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { BookList } from '@/components/books/book-list';
import { Button } from '@/components/ui/button';
import { Plus, Download } from 'lucide-react';

// Force dynamic rendering - database queries at runtime
export const dynamic = 'force-dynamic';

interface BooksPageProps {
  searchParams: Promise<{
    status?: string;
    category?: string;
    subCategory?: string;
    year?: string;
    search?: string;
  }>;
}

export default async function BooksPage({ searchParams }: BooksPageProps) {
  const params = await searchParams;
  
  // Build where clause based on URL parameters
  const where: Record<string, unknown> = {};
  
  if (params.status) {
    where.status = params.status;
  }
  
  if (params.category) {
    where.category = params.category;
  }
  
  if (params.subCategory) {
    where.subCategory = params.subCategory;
  }
  
  if (params.year) {
    const year = parseInt(params.year);
    where.dateFinished = {
      gte: new Date(year, 0, 1),
      lt: new Date(year + 1, 0, 1),
    };
  }

  const books = await prisma.book.findMany({
    where: Object.keys(where).length > 0 ? where : undefined,
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

  // Generate filter description for UI
  const activeFilters: string[] = [];
  if (params.status) {
    const statusLabels: Record<string, string> = {
      READING: 'Currently Reading',
      TO_READ: 'To Read',
      NEXT_UP: 'Next Up',
      PAUSED: 'Paused',
      FINISHED: 'Finished',
    };
    activeFilters.push(statusLabels[params.status] || params.status);
  }
  if (params.category) {
    activeFilters.push(params.category === 'FICTION' ? 'Fiction' : 'Non-Fiction');
  }
  if (params.subCategory) {
    activeFilters.push(params.subCategory);
  }
  if (params.year) {
    activeFilters.push(`Finished in ${params.year}`);
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-4xl font-bold text-foreground">
              {activeFilters.length > 0 ? activeFilters.join(' · ') : 'My Library'}
            </h1>
            {activeFilters.length > 0 && (
              <Link href="/books">
                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                  Clear filters ×
                </Button>
              </Link>
            )}
          </div>
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
      <BookList 
        books={books} 
        initialStatus={params.status}
        initialCategory={params.category}
        initialSubCategory={params.subCategory}
        initialSearch={params.search}
      />
    </div>
  );
}
