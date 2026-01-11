import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { StatusBadge } from '@/components/books/status-badge';
import { RatingStars } from '@/components/books/rating-stars';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Edit, BookOpen, Headphones, Tablet, Calendar, Clock, Sparkles } from 'lucide-react';

interface BookDetailPageProps {
  params: Promise<{ id: string }>;
}

const mediaTypeConfig = {
  PAPER: { label: 'Paper', icon: BookOpen },
  AUDIOBOOK: { label: 'Audiobook', icon: Headphones },
  EBOOK: { label: 'E-book', icon: Tablet },
};

// Generate gradient based on title
function getTitleGradient(title: string): string {
  const gradients = [
    'from-amber-600 via-orange-700 to-red-800',
    'from-emerald-600 via-teal-700 to-cyan-800',
    'from-violet-600 via-purple-700 to-indigo-800',
    'from-rose-600 via-pink-700 to-fuchsia-800',
    'from-sky-600 via-blue-700 to-indigo-800',
    'from-lime-600 via-green-700 to-emerald-800',
  ];
  const hash = title.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return gradients[hash % gradients.length];
}

export default async function BookDetailPage({ params }: BookDetailPageProps) {
  const { id } = await params;

  const book = await prisma.book.findUnique({
    where: { id },
    include: { notes: true },
  });

  if (!book) {
    notFound();
  }

  const MediaIcon = mediaTypeConfig[book.mediaType].icon;

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header Actions */}
      <div className="flex items-center justify-between">
        <Link href="/books">
          <Button variant="ghost" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Library
          </Button>
        </Link>
        <Link href={`/books/${book.id}/edit`}>
          <Button className="gap-2 shadow-lg shadow-primary/25">
            <Edit className="h-4 w-4" />
            Edit Book
          </Button>
        </Link>
      </div>

      {/* Main Content */}
      <div className="grid lg:grid-cols-[300px_1fr] gap-8">
        {/* Left Column - Cover */}
        <div className="space-y-4">
          <div className="relative aspect-[2/3] w-full rounded-2xl overflow-hidden shadow-2xl">
            {book.coverImageUrl ? (
              <Image
                src={book.coverImageUrl}
                alt={book.title}
                fill
                className="object-cover"
                sizes="300px"
              />
            ) : (
              <div className={`absolute inset-0 bg-gradient-to-br ${getTitleGradient(book.title)} flex items-center justify-center p-8`}>
                <div className="text-center">
                  <p className="font-serif text-2xl font-semibold text-white/95 drop-shadow-lg">
                    {book.title}
                  </p>
                  <p className="text-white/70 mt-3">
                    {book.author}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Quick Info Card */}
          <Card className="border-0 shadow-lg">
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <MediaIcon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Format</p>
                  <p className="font-medium">{mediaTypeConfig[book.mediaType].label}</p>
                </div>
              </div>

              {book.dateStarted && (
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Calendar className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Started</p>
                    <p className="font-medium">
                      {new Date(book.dateStarted).toLocaleDateString('en-US', {
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                </div>
              )}

              {book.dateFinished && (
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-100 rounded-lg">
                    <Clock className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Finished</p>
                    <p className="font-medium">
                      {new Date(book.dateFinished).toLocaleDateString('en-US', {
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                </div>
              )}

              {book.isbn && (
                <div className="pt-3 border-t border-gray-100">
                  <p className="text-xs text-muted-foreground">ISBN</p>
                  <p className="font-mono text-sm">{book.isbn}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Details */}
        <div className="space-y-6">
          {/* Title & Meta */}
          <div>
            <div className="flex items-start gap-4 mb-4">
              <StatusBadge status={book.status} />
              <Badge 
                variant="outline" 
                className={
                  book.category === 'FICTION' 
                    ? 'border-violet-300 text-violet-700 bg-violet-50' 
                    : 'border-emerald-300 text-emerald-700 bg-emerald-50'
                }
              >
                {book.category === 'FICTION' ? 'Fiction' : 'Non-Fiction'}
              </Badge>
              {book.subCategory && (
                <Badge variant="outline">{book.subCategory}</Badge>
              )}
            </div>
            
            <h1 className="text-4xl lg:text-5xl font-bold text-foreground leading-tight">
              {book.title}
            </h1>
            <p className="text-2xl text-muted-foreground mt-3">
              by {book.author}
            </p>

            {book.rating && (
              <div className="mt-6">
                <RatingStars rating={book.rating} readonly size="lg" />
              </div>
            )}
          </div>

          {/* Summary */}
          {book.summary && (
            <Card className="border-0 shadow-lg">
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  Summary
                </h3>
                <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
                  {book.summary}
                </p>
              </CardContent>
            </Card>
          )}

          {/* My Thoughts */}
          {book.thoughts && (
            <Card className="border-0 shadow-lg bg-gradient-to-br from-amber-50/80 to-orange-50/80">
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-3 text-amber-900">
                  My Thoughts
                </h3>
                <p className="text-amber-800/80 leading-relaxed whitespace-pre-line">
                  {book.thoughts}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Notes */}
          {book.notes.length > 0 && (
            <Card className="border-0 shadow-lg">
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-4">
                  Notes ({book.notes.length})
                </h3>
                <div className="space-y-4">
                  {book.notes.map((note) => (
                    <div
                      key={note.id}
                      className="p-4 bg-gray-50 rounded-xl border border-gray-100"
                    >
                      {note.page && (
                        <p className="text-xs font-medium text-primary mb-2">
                          Page {note.page}
                        </p>
                      )}
                      <p className="text-sm leading-relaxed">{note.content}</p>
                      <p className="text-xs text-muted-foreground mt-3">
                        {new Date(note.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Empty state for thoughts/summary */}
          {!book.summary && !book.thoughts && (
            <Card className="border-2 border-dashed border-gray-200">
              <CardContent className="p-8 text-center">
                <Sparkles className="h-10 w-10 text-gray-300 mx-auto mb-4" />
                <h3 className="font-semibold text-gray-600 mb-2">No details yet</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Add a summary or your thoughts about this book
                </p>
                <Link href={`/books/${book.id}/edit`}>
                  <Button variant="outline" size="sm" className="border-2">
                    <Edit className="h-4 w-4 mr-2" />
                    Add Details
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
