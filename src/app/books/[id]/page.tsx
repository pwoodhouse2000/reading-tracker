import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/books/status-badge';
import { RatingStars } from '@/components/books/rating-stars';
import { Badge } from '@/components/ui/badge';

interface BookDetailPageProps {
  params: Promise<{ id: string }>;
}

const mediaTypeLabels = {
  PAPER: 'Paper',
  AUDIOBOOK: 'Audiobook',
  EBOOK: 'E-book',
};

export default async function BookDetailPage({ params }: BookDetailPageProps) {
  const { id } = await params;

  const book = await prisma.book.findUnique({
    where: { id },
    include: { notes: true },
  });

  if (!book) {
    notFound();
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/books">
          <Button variant="outline">← Back to Books</Button>
        </Link>
        <Link href={`/books/${book.id}/edit`}>
          <Button>Edit Book</Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <div className="flex gap-6">
            {book.coverImageUrl && (
              <div className="relative h-64 w-48 flex-shrink-0">
                <Image
                  src={book.coverImageUrl}
                  alt={book.title}
                  fill
                  className="object-cover rounded"
                />
              </div>
            )}
            <div className="flex-1">
              <CardTitle className="text-3xl mb-2">{book.title}</CardTitle>
              <p className="text-xl text-muted-foreground mb-4">
                by {book.author}
              </p>
              <div className="flex gap-2 mb-4 flex-wrap">
                <StatusBadge status={book.status} />
                <Badge variant="outline">{mediaTypeLabels[book.mediaType]}</Badge>
                <Badge variant="outline">{book.category.replace('_', ' ')}</Badge>
                {book.subCategory && (
                  <Badge variant="outline">{book.subCategory}</Badge>
                )}
              </div>
              {book.rating && (
                <div className="mb-4">
                  <p className="text-sm font-medium mb-1">My Rating</p>
                  <RatingStars rating={book.rating} readonly />
                </div>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {book.summary && (
            <div>
              <h3 className="font-semibold mb-2">Summary</h3>
              <p className="text-muted-foreground">{book.summary}</p>
            </div>
          )}

          {book.thoughts && (
            <div>
              <h3 className="font-semibold mb-2">My Thoughts</h3>
              <p className="text-muted-foreground">{book.thoughts}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 pt-4 border-t">
            {book.dateStarted && (
              <div>
                <p className="text-sm font-medium">Started</p>
                <p className="text-muted-foreground">
                  {new Date(book.dateStarted).toLocaleDateString()}
                </p>
              </div>
            )}
            {book.dateFinished && (
              <div>
                <p className="text-sm font-medium">Finished</p>
                <p className="text-muted-foreground">
                  {new Date(book.dateFinished).toLocaleDateString()}
                </p>
              </div>
            )}
          </div>

          {book.notes.length > 0 && (
            <div className="pt-4 border-t">
              <h3 className="font-semibold mb-3">Notes</h3>
              <div className="space-y-3">
                {book.notes.map((note) => (
                  <div
                    key={note.id}
                    className="p-3 bg-muted rounded-md"
                  >
                    {note.page && (
                      <p className="text-sm font-medium mb-1">Page {note.page}</p>
                    )}
                    <p className="text-sm">{note.content}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(note.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
