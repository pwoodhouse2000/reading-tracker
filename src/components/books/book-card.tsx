import Link from 'next/link';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from './status-badge';
import { RatingStars } from './rating-stars';
import { Badge } from '@/components/ui/badge';

interface Book {
  id: string;
  title: string;
  author: string;
  status: 'TO_READ' | 'NEXT_UP' | 'READING' | 'PAUSED' | 'FINISHED';
  mediaType: 'PAPER' | 'AUDIOBOOK' | 'EBOOK';
  category: 'FICTION' | 'NON_FICTION';
  rating: number | null;
  coverImageUrl: string | null;
  summary: string | null;
}

interface BookCardProps {
  book: Book;
}

const mediaTypeLabels = {
  PAPER: 'Paper',
  AUDIOBOOK: 'Audiobook',
  EBOOK: 'E-book',
};

export function BookCard({ book }: BookCardProps) {
  return (
    <Link href={`/books/${book.id}`}>
      <Card className="h-full transition-shadow hover:shadow-md cursor-pointer">
        <CardHeader className="pb-3">
          <div className="flex gap-4">
            {book.coverImageUrl && (
              <div className="relative h-32 w-24 flex-shrink-0">
                <Image
                  src={book.coverImageUrl}
                  alt={book.title}
                  fill
                  className="object-cover rounded"
                />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <CardTitle className="text-lg line-clamp-2">
                {book.title}
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                by {book.author}
              </p>
              <div className="flex gap-2 mt-2 flex-wrap">
                <StatusBadge status={book.status} />
                <Badge variant="outline">{mediaTypeLabels[book.mediaType]}</Badge>
              </div>
            </div>
          </div>
        </CardHeader>
        {(book.summary || book.rating) && (
          <CardContent className="pt-0">
            {book.rating && (
              <div className="mb-2">
                <RatingStars rating={book.rating} readonly size="sm" />
              </div>
            )}
            {book.summary && (
              <p className="text-sm text-muted-foreground line-clamp-2">
                {book.summary}
              </p>
            )}
          </CardContent>
        )}
      </Card>
    </Link>
  );
}
