import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { Button } from '@/components/ui/button';
import { BookCard } from '@/components/books/book-card';

export default async function Home() {
  const [
    currentlyReading,
    toRead,
    finishedThisYear,
    totalBooks,
    recentBooks,
  ] = await Promise.all([
    prisma.book.count({ where: { status: 'READING' } }),
    prisma.book.count({ where: { status: 'TO_READ' } }),
    prisma.book.count({
      where: {
        status: 'FINISHED',
        dateFinished: {
          gte: new Date(new Date().getFullYear(), 0, 1),
        },
      },
    }),
    prisma.book.count(),
    prisma.book.findMany({
      orderBy: { createdAt: 'desc' },
      take: 3,
    }),
  ]);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">
            Welcome to Reading Tracker
          </h2>
          <p className="text-muted-foreground mt-2">
            Your personal reading companion
          </p>
        </div>
        <Link href="/books/new">
          <Button>Add Book</Button>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border bg-card p-6">
          <h3 className="text-sm font-medium text-muted-foreground">
            Currently Reading
          </h3>
          <p className="text-2xl font-bold mt-2">{currentlyReading}</p>
        </div>
        <div className="rounded-lg border bg-card p-6">
          <h3 className="text-sm font-medium text-muted-foreground">To Read</h3>
          <p className="text-2xl font-bold mt-2">{toRead}</p>
        </div>
        <div className="rounded-lg border bg-card p-6">
          <h3 className="text-sm font-medium text-muted-foreground">
            Finished This Year
          </h3>
          <p className="text-2xl font-bold mt-2">{finishedThisYear}</p>
        </div>
        <div className="rounded-lg border bg-card p-6">
          <h3 className="text-sm font-medium text-muted-foreground">
            Total Books
          </h3>
          <p className="text-2xl font-bold mt-2">{totalBooks}</p>
        </div>
      </div>

      {recentBooks.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold">Recently Added</h3>
            <Link href="/books">
              <Button variant="outline">View All Books →</Button>
            </Link>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {recentBooks.map((book) => (
              <BookCard key={book.id} book={book} />
            ))}
          </div>
        </div>
      )}

      {totalBooks === 0 && (
        <div className="rounded-lg border bg-card p-12 text-center">
          <h3 className="text-lg font-semibold mb-2">Get Started</h3>
          <p className="text-muted-foreground mb-4">
            Start tracking your reading journey by adding your first book!
          </p>
          <Link href="/books/new">
            <Button>Add Your First Book</Button>
          </Link>
        </div>
      )}
    </div>
  );
}
