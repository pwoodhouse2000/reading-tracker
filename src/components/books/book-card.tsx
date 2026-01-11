import Link from 'next/link';
import Image from 'next/image';
import { Card, CardContent } from '@/components/ui/card';
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
      <Card className="group h-full overflow-hidden transition-all hover:shadow-xl hover:scale-[1.02] cursor-pointer border-0 bg-gradient-to-br from-white to-gray-50">
        <CardContent className="p-0">
          <div className="relative">
            {/* Cover Image */}
            <div className="relative aspect-[2/3] w-full bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden">
              {book.coverImageUrl ? (
                <Image
                  src={book.coverImageUrl}
                  alt={book.title}
                  fill
                  className="object-cover transition-transform group-hover:scale-105"
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center p-4">
                  <div className="text-center">
                    <p className="font-serif text-lg font-semibold text-gray-600 line-clamp-3">
                      {book.title}
                    </p>
                  </div>
                </div>
              )}
              {/* Status Badge Overlay */}
              <div className="absolute top-2 right-2">
                <StatusBadge status={book.status} />
              </div>
            </div>

            {/* Book Info */}
            <div className="p-4 space-y-2">
              <h3 className="font-semibold text-base line-clamp-2 leading-tight group-hover:text-primary transition-colors">
                {book.title}
              </h3>
              <p className="text-sm text-muted-foreground line-clamp-1">
                {book.author}
              </p>

              {/* Rating */}
              {book.rating && (
                <div className="pt-1">
                  <RatingStars rating={book.rating} readonly size="sm" />
                </div>
              )}

              {/* Media Type */}
              <div className="flex gap-1.5 flex-wrap">
                <Badge variant="secondary" className="text-xs">
                  {mediaTypeLabels[book.mediaType]}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {book.category === 'FICTION' ? 'Fiction' : 'Non-Fiction'}
                </Badge>
              </div>

              {/* Summary */}
              {book.summary && (
                <p className="text-xs text-muted-foreground line-clamp-2 pt-1">
                  {book.summary}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
