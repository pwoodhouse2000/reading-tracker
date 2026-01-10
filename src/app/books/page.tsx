import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { BookList } from '@/components/books/book-list';
import { Button } from '@/components/ui/button';

export default async function BooksPage() {
  const books = await prisma.book.findMany({
    orderBy: [
      { priority: 'asc' },
      { createdAt: 'desc' },
    ],
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">My Books</h1>
          <p className="text-muted-foreground mt-1">
            Manage your reading collection
          </p>
        </div>
        <Link href="/books/new">
          <Button>Add New Book</Button>
        </Link>
      </div>

      <BookList books={books} />
    </div>
  );
}
