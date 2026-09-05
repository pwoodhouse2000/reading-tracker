import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { Button } from '@/components/ui/button';
import { BookCard } from '@/components/books/book-card';
import { Card } from '@/components/ui/card';
import { BookAddButtonLarge, EmptyStateAddButton } from '@/components/books/admin-actions';
import { ReadingGoalCard } from '@/components/stats/reading-goal-card';
import { PageProgress } from '@/components/books/page-progress';
import { NextBook } from '@/components/books/next-book';
import { AdminOnly } from '@/components/auth/admin-only';
import { bookForViewer } from '@/lib/privacy';
import { historyCount } from '@/lib/services/reading-history';
import { BookOpen, Clock, CheckCircle2, Library, ArrowRight, Sparkles } from 'lucide-react';

// Force dynamic rendering - database queries at runtime, not build time
export const dynamic = 'force-dynamic';

export default async function Home() {
  const [
    currentlyReading,
    toRead,
    finishedThisYear,
    totalBooks,
    recentBooks,
    currentBooks,
    nextBooks,
  ] = await Promise.all([
    prisma.book.count({ where: { status: 'READING' } }),
    prisma.book.count({ where: { status: 'TO_READ' } }),
    historyCount({
        status: 'FINISHED',
        dateFinished: {
          gte: new Date(new Date().getFullYear(), 0, 1),
        },
    }),
    prisma.book.count(),
    prisma.book.findMany({
      orderBy: { createdAt: 'desc' },
      take: 6,
    }),
    prisma.book.findMany({
      where: { status: 'READING' },
      orderBy: { priority: 'asc' },
    }),
    prisma.book.findMany({ where:{status:'NEXT_UP'},orderBy:{priority:'asc'},take:6 }),
  ]);

  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <section className="relative py-12">
        <div className="max-w-4xl">
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-foreground leading-[1.1]">
            Your reading,
            <span className="block gradient-text">right where you left it.</span>
          </h1>
          <p className="text-xl text-muted-foreground mt-6 max-w-2xl leading-relaxed">
            Pick up a current read, record a little progress, or find your next book.
          </p>
          <div className="flex flex-wrap gap-4 mt-8">
            <BookAddButtonLarge />
            <Link href="/books">
              <Button size="lg" variant="outline">
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

      {/* Reading Goal + Stats Cards */}
      <section className="space-y-4">
        {/* Reading Goal Card - Full Width */}
        <div className="grid gap-4 md:grid-cols-2">
          <ReadingGoalCard />
          
          {/* Quick Stats Summary */}
          <div className="grid grid-cols-2 gap-4">
            <Link href="/books?status=READING">
              <Card className="group relative overflow-hidden border-0 bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-xl shadow-blue-500/20 hover:shadow-2xl hover:shadow-blue-500/30 transition-all hover:-translate-y-1 cursor-pointer h-full">
                <div className="p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-medium text-blue-100">Reading</p>
                      <p className="text-4xl font-bold mt-1 tracking-tight">{currentlyReading}</p>
                    </div>
                    <div className="bg-white/20 p-2 rounded-xl">
                      <BookOpen className="h-5 w-5" />
                    </div>
                  </div>
                </div>
                <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-white/10 rounded-full group-hover:scale-150 transition-transform duration-500" />
              </Card>
            </Link>

            <Link href="/books?status=TO_READ">
              <Card className="group relative overflow-hidden border-0 bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-xl shadow-amber-500/20 hover:shadow-2xl hover:shadow-amber-500/30 transition-all hover:-translate-y-1 cursor-pointer h-full">
                <div className="p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-medium text-amber-100">To Read</p>
                      <p className="text-4xl font-bold mt-1 tracking-tight">{toRead}</p>
                    </div>
                    <div className="bg-white/20 p-2 rounded-xl">
                      <Clock className="h-5 w-5" />
                    </div>
                  </div>
                </div>
                <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-white/10 rounded-full group-hover:scale-150 transition-transform duration-500" />
              </Card>
            </Link>

            <Link href="/reports">
              <Card className="group relative overflow-hidden border-0 bg-gradient-to-br from-emerald-500 to-green-600 text-white shadow-xl shadow-emerald-500/20 hover:shadow-2xl hover:shadow-emerald-500/30 transition-all hover:-translate-y-1 cursor-pointer h-full">
                <div className="p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-medium text-emerald-100">Finished</p>
                      <p className="text-4xl font-bold mt-1 tracking-tight">{finishedThisYear}</p>
                    </div>
                    <div className="bg-white/20 p-2 rounded-xl">
                      <CheckCircle2 className="h-5 w-5" />
                    </div>
                  </div>
                </div>
                <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-white/10 rounded-full group-hover:scale-150 transition-transform duration-500" />
              </Card>
            </Link>

            <Link href="/books">
              <Card className="group relative overflow-hidden border-0 bg-gradient-to-br from-slate-600 to-slate-700 text-white shadow-xl shadow-slate-500/20 hover:shadow-2xl hover:shadow-slate-500/30 transition-all hover:-translate-y-1 cursor-pointer h-full">
                <div className="p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-medium text-slate-300">Total</p>
                      <p className="text-4xl font-bold mt-1 tracking-tight">{totalBooks}</p>
                    </div>
                    <div className="bg-white/20 p-2 rounded-xl">
                      <Library className="h-5 w-5" />
                    </div>
                  </div>
                </div>
                <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-white/10 rounded-full group-hover:scale-150 transition-transform duration-500" />
              </Card>
            </Link>
          </div>
        </div>
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
              <div key={book.id} className="rounded-xl border p-3 bg-card space-y-3"><BookCard book={bookForViewer(book)} compact /><div className="p-2"><PageProgress bookId={book.id} currentPage={book.currentPage} totalPages={book.totalPages} />{book.audioMinutes!==null&&<p className="mt-2 text-sm">{book.audioMinutes} / {book.totalAudioMinutes??'?'} minutes listened</p>}{book.progressPercent!==null&&<p className="text-sm">{book.progressPercent}% complete</p>}</div></div>
            ))}
          </div>
        </section>
      )}

      {/* Recently Added */}
      <AdminOnly><NextBook /></AdminOnly>
      {nextBooks.length > 0 && <section><div className="flex justify-between items-center mb-6"><h2 className="text-3xl font-bold">Next Up</h2><Link className="text-primary underline" href="/books?status=NEXT_UP">View queue</Link></div><div className="grid gap-6 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">{nextBooks.map(book=><BookCard key={book.id} book={bookForViewer(book)} />)}</div></section>}
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
              <BookCard key={book.id} book={bookForViewer(book)} />
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
            <EmptyStateAddButton />
          </div>
        </section>
      )}
    </div>
  );
}
