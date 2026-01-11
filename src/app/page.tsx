import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { Button } from '@/components/ui/button';
import { BookCard } from '@/components/books/book-card';
import { Card } from '@/components/ui/card';
import { Plus, BookOpen, Clock, CheckCircle2, Library, ArrowRight, Sparkles } from 'lucide-react';

export default async function Home() {
  const [
    currentlyReading,
    toRead,
    finishedThisYear,
    totalBooks,
    recentBooks,
    currentBooks,
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
    prisma.book.findMany({
      where: { status: 'READING' },
      take: 3,
    }),
  ]);

  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <section className="relative py-12">
        <div className="max-w-4xl">
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-foreground leading-[1.1]">
            Your Reading
            <span className="block gradient-text">Journey Awaits</span>
          </h1>
          <p className="text-xl text-muted-foreground mt-6 max-w-2xl leading-relaxed">
            Track every book, discover new favorites, and celebrate your reading milestones. 
            Your personal library, beautifully organized.
          </p>
          <div className="flex gap-4 mt-8">
            <Link href="/books/new">
              <Button size="lg" className="rounded-xl shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all">
                <Plus className="h-5 w-5 mr-2" />
                Add Book
              </Button>
            </Link>
            <Link href="/books">
              <Button size="lg" variant="outline" className="rounded-xl border-2 hover:bg-white/50">
                <Library className="h-5 w-5 mr-2" />
                Browse Library
              </Button>
            </Link>
          </div>
        </div>

        {/* Decorative element */}
        <div className="absolute right-0 top-0 -z-10 hidden lg:block">
          <div className="w-72 h-72 bg-gradient-to-br from-primary/10 to-accent/10 rounded-full blur-3xl" />
        </div>
      </section>

      {/* Stats Cards */}
      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="group relative overflow-hidden border-0 bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-xl shadow-blue-500/20 hover:shadow-2xl hover:shadow-blue-500/30 transition-all hover:-translate-y-1">
          <div className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-blue-100">Currently Reading</p>
                <p className="text-5xl font-bold mt-2 tracking-tight">{currentlyReading}</p>
              </div>
              <div className="bg-white/20 p-3 rounded-xl">
                <BookOpen className="h-6 w-6" />
              </div>
            </div>
          </div>
          <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-white/10 rounded-full group-hover:scale-150 transition-transform duration-500" />
        </Card>

        <Card className="group relative overflow-hidden border-0 bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-xl shadow-violet-500/20 hover:shadow-2xl hover:shadow-violet-500/30 transition-all hover:-translate-y-1">
          <div className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-violet-100">To Read</p>
                <p className="text-5xl font-bold mt-2 tracking-tight">{toRead}</p>
              </div>
              <div className="bg-white/20 p-3 rounded-xl">
                <Clock className="h-6 w-6" />
              </div>
            </div>
          </div>
          <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-white/10 rounded-full group-hover:scale-150 transition-transform duration-500" />
        </Card>

        <Card className="group relative overflow-hidden border-0 bg-gradient-to-br from-emerald-500 to-green-600 text-white shadow-xl shadow-emerald-500/20 hover:shadow-2xl hover:shadow-emerald-500/30 transition-all hover:-translate-y-1">
          <div className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-emerald-100">Finished {new Date().getFullYear()}</p>
                <p className="text-5xl font-bold mt-2 tracking-tight">{finishedThisYear}</p>
              </div>
              <div className="bg-white/20 p-3 rounded-xl">
                <CheckCircle2 className="h-6 w-6" />
              </div>
            </div>
          </div>
          <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-white/10 rounded-full group-hover:scale-150 transition-transform duration-500" />
        </Card>

        <Card className="group relative overflow-hidden border-0 bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-xl shadow-amber-500/20 hover:shadow-2xl hover:shadow-amber-500/30 transition-all hover:-translate-y-1">
          <div className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-amber-100">Total Collection</p>
                <p className="text-5xl font-bold mt-2 tracking-tight">{totalBooks}</p>
              </div>
              <div className="bg-white/20 p-3 rounded-xl">
                <Library className="h-6 w-6" />
              </div>
            </div>
          </div>
          <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-white/10 rounded-full group-hover:scale-150 transition-transform duration-500" />
        </Card>
      </section>

      {/* Currently Reading */}
      {currentBooks.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-3xl font-bold text-foreground">Currently Reading</h2>
              <p className="text-muted-foreground mt-1">Continue where you left off</p>
            </div>
          </div>
          <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {currentBooks.map((book) => (
              <BookCard key={book.id} book={book} />
            ))}
          </div>
        </section>
      )}

      {/* Recently Added */}
      {recentBooks.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-3xl font-bold text-foreground">Recently Added</h2>
              <p className="text-muted-foreground mt-1">Latest additions to your library</p>
            </div>
            <Link href="/books">
              <Button variant="ghost" className="text-primary hover:text-primary/80 group">
                View All
                <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
          </div>
          <div className="grid gap-6 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {recentBooks.map((book) => (
              <BookCard key={book.id} book={book} />
            ))}
          </div>
        </section>
      )}

      {/* Empty State */}
      {totalBooks === 0 && (
        <section className="text-center py-20">
          <div className="max-w-md mx-auto">
            <div className="inline-flex items-center justify-center w-24 h-24 rounded-3xl bg-gradient-to-br from-primary/20 to-accent/20 mb-8">
              <Sparkles className="h-12 w-12 text-primary" />
            </div>
            <h2 className="text-3xl font-bold text-foreground mb-4">
              Start Your Reading Journey
            </h2>
            <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
              Add your first book and begin tracking your amazing reading adventure. 
              Every great library starts with a single book.
            </p>
            <Link href="/books/new">
              <Button size="lg" className="rounded-xl shadow-lg shadow-primary/25">
                <Plus className="h-5 w-5 mr-2" />
                Add Your First Book
              </Button>
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}
