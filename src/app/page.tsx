import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { Button } from '@/components/ui/button';
import { BookCard } from '@/components/books/book-card';
import { Card } from '@/components/ui/card';

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
      take: 6,
    }),
  ]);

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="text-center max-w-3xl mx-auto">
        <h1 className="text-5xl font-bold tracking-tight bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
          Your Reading Journey
        </h1>
        <p className="text-lg text-muted-foreground mt-4">
          Track, discover, and celebrate every book you read
        </p>
        <div className="flex gap-3 justify-center mt-6">
          <Link href="/books/new">
            <Button size="lg" className="shadow-lg">
              📚 Add Book
            </Button>
          </Link>
          <Link href="/books">
            <Button size="lg" variant="outline">
              Browse Library
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-xl">
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-100">Currently Reading</p>
                <p className="text-4xl font-bold mt-2">{currentlyReading}</p>
              </div>
              <div className="text-5xl opacity-20">📖</div>
            </div>
          </div>
          <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-12 -mt-12"></div>
        </Card>

        <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-purple-500 to-purple-600 text-white shadow-xl">
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-100">To Read</p>
                <p className="text-4xl font-bold mt-2">{toRead}</p>
              </div>
              <div className="text-5xl opacity-20">📚</div>
            </div>
          </div>
          <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-12 -mt-12"></div>
        </Card>

        <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-green-500 to-green-600 text-white shadow-xl">
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-100">Finished {new Date().getFullYear()}</p>
                <p className="text-4xl font-bold mt-2">{finishedThisYear}</p>
              </div>
              <div className="text-5xl opacity-20">✅</div>
            </div>
          </div>
          <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-12 -mt-12"></div>
        </Card>

        <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-orange-500 to-orange-600 text-white shadow-xl">
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-100">Total Collection</p>
                <p className="text-4xl font-bold mt-2">{totalBooks}</p>
              </div>
              <div className="text-5xl opacity-20">📊</div>
            </div>
          </div>
          <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-12 -mt-12"></div>
        </Card>
      </div>

      {/* Recently Added */}
      {recentBooks.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">Recently Added</h2>
            <Link href="/books">
              <Button variant="ghost" className="text-primary hover:text-primary/80">
                View All Books →
              </Button>
            </Link>
          </div>
          <div className="grid gap-6 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {recentBooks.map((book) => (
              <BookCard key={book.id} book={book} />
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {totalBooks === 0 && (
        <Card className="border-2 border-dashed p-16 text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-purple-100 to-blue-100 mb-6">
            <span className="text-4xl">📚</span>
          </div>
          <h3 className="text-2xl font-bold mb-2">Start Your Reading Journey</h3>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            Add your first book and begin tracking your amazing reading adventure!
          </p>
          <Link href="/books/new">
            <Button size="lg" className="shadow-lg">
              Add Your First Book
            </Button>
          </Link>
        </Card>
      )}
    </div>
  );
}
