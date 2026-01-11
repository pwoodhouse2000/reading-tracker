import Link from 'next/link';
import Image from 'next/image';
import { Card, CardContent } from '@/components/ui/card';
import { StatusBadge } from './status-badge';
import { RatingStars } from './rating-stars';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Headphones, Tablet } from 'lucide-react';

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
  compact?: boolean;
}

const mediaTypeIcons = {
  PAPER: BookOpen,
  AUDIOBOOK: Headphones,
  EBOOK: Tablet,
};

const mediaTypeLabels = {
  PAPER: 'Paper',
  AUDIOBOOK: 'Audiobook',
  EBOOK: 'E-book',
};

// Generate a consistent gradient based on title
function getTitleGradient(title: string): string {
  const gradients = [
    'from-amber-600 via-orange-700 to-red-800',
    'from-emerald-600 via-teal-700 to-cyan-800',
    'from-violet-600 via-purple-700 to-indigo-800',
    'from-rose-600 via-pink-700 to-fuchsia-800',
    'from-sky-600 via-blue-700 to-indigo-800',
    'from-lime-600 via-green-700 to-emerald-800',
    'from-orange-600 via-amber-700 to-yellow-800',
    'from-cyan-600 via-sky-700 to-blue-800',
  ];
  const hash = title.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return gradients[hash % gradients.length];
}

export function BookCard({ book, compact = false }: BookCardProps) {
  const MediaIcon = mediaTypeIcons[book.mediaType];

  if (compact) {
    return (
      <Link href={`/books/${book.id}`}>
        <Card className="group overflow-hidden transition-all hover:shadow-lg hover:scale-[1.01] cursor-pointer border-0 bg-white/80 backdrop-blur">
          <CardContent className="p-0">
            <div className="flex items-center gap-4 p-4">
              {/* Small Cover */}
              <div className="relative w-12 h-16 flex-shrink-0 rounded-md overflow-hidden shadow-md">
                {book.coverImageUrl ? (
                  <Image
                    src={book.coverImageUrl}
                    alt={book.title}
                    fill
                    className="object-cover"
                    sizes="48px"
                  />
                ) : (
                  <div className={`absolute inset-0 bg-gradient-to-br ${getTitleGradient(book.title)} flex items-center justify-center`}>
                    <span className="text-white/90 text-xs font-bold px-1 text-center line-clamp-2">
                      {book.title.substring(0, 10)}
                    </span>
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm line-clamp-1 group-hover:text-primary transition-colors">
                  {book.title}
                </h3>
                <p className="text-sm text-muted-foreground line-clamp-1">
                  {book.author}
                </p>
              </div>

              {/* Right side: rating + badges */}
              <div className="flex items-center gap-3 flex-shrink-0">
                {book.rating && <RatingStars rating={book.rating} readonly size="sm" />}
                <div className="flex items-center gap-1">
                  <MediaIcon className="h-4 w-4 text-muted-foreground" />
                </div>
                <StatusBadge status={book.status} />
              </div>
            </div>
          </CardContent>
        </Card>
      </Link>
    );
  }

  return (
    <Link href={`/books/${book.id}`}>
      <Card className="group h-full overflow-hidden transition-all hover:shadow-2xl hover:scale-[1.03] cursor-pointer border-0 bg-white/80 backdrop-blur">
        <CardContent className="p-0">
          <div className="relative">
            {/* Cover Image */}
            <div className="relative aspect-[2/3] w-full overflow-hidden">
              {book.coverImageUrl ? (
                <>
                  <Image
                    src={book.coverImageUrl}
                    alt={book.title}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-110"
                    sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 20vw"
                  />
                  {/* Subtle overlay on hover */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </>
              ) : (
                <div className={`absolute inset-0 bg-gradient-to-br ${getTitleGradient(book.title)} flex items-center justify-center p-6`}>
                  <div className="text-center">
                    <p className="font-serif text-lg font-semibold text-white/95 line-clamp-4 drop-shadow-lg">
                      {book.title}
                    </p>
                    <p className="text-sm text-white/70 mt-2 line-clamp-1">
                      {book.author}
                    </p>
                  </div>
                </div>
              )}
              
              {/* Status Badge Overlay */}
              <div className="absolute top-3 right-3 z-10">
                <StatusBadge status={book.status} />
              </div>

              {/* Media Type Icon */}
              <div className="absolute bottom-3 left-3 z-10">
                <div className="bg-black/50 backdrop-blur-sm text-white p-1.5 rounded-lg">
                  <MediaIcon className="h-4 w-4" />
                </div>
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

              {/* Category Badge */}
              <div className="pt-1">
                <Badge 
                  variant="outline" 
                  className={`text-xs ${
                    book.category === 'FICTION' 
                      ? 'border-violet-300 text-violet-700 bg-violet-50' 
                      : 'border-emerald-300 text-emerald-700 bg-emerald-50'
                  }`}
                >
                  {book.category === 'FICTION' ? 'Fiction' : 'Non-Fiction'}
                </Badge>
              </div>

              {/* Summary */}
              {book.summary && (
                <p className="text-xs text-muted-foreground line-clamp-2 pt-1 leading-relaxed">
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
