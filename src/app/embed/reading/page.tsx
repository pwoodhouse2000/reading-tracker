'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { BookOpen, Star } from 'lucide-react';

interface Book {
  id: string;
  title: string;
  author: string;
  coverImageUrl: string | null;
  status: string;
  rating: number | null;
}

type Theme = 'light' | 'dark' | 'transparent' | 'gradient';

const themes: Record<Theme, { bg: string; text: string; subtext: string; border: string }> = {
  light: {
    bg: 'bg-white',
    text: 'text-gray-900',
    subtext: 'text-gray-500',
    border: 'border-gray-200',
  },
  dark: {
    bg: 'bg-gray-900',
    text: 'text-white',
    subtext: 'text-gray-400',
    border: 'border-gray-700',
  },
  transparent: {
    bg: 'bg-transparent',
    text: 'text-gray-900',
    subtext: 'text-gray-600',
    border: 'border-gray-300',
  },
  gradient: {
    bg: 'bg-gradient-to-br from-violet-500 to-purple-600',
    text: 'text-white',
    subtext: 'text-violet-100',
    border: 'border-violet-400/30',
  },
};

function BookCover({ book, theme }: { book: Book; theme: Theme }) {
  const colors = themes[theme];
  
  if (book.coverImageUrl) {
    return (
      <img
        src={book.coverImageUrl}
        alt={book.title}
        className="w-12 h-16 object-cover rounded shadow-sm flex-shrink-0"
      />
    );
  }

  return (
    <div className={`w-12 h-16 rounded shadow-sm flex-shrink-0 flex items-center justify-center ${
      theme === 'gradient' ? 'bg-white/20' : 'bg-gray-100 dark:bg-gray-800'
    }`}>
      <BookOpen className={`h-5 w-5 ${colors.subtext}`} />
    </div>
  );
}

function RatingStars({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`h-3 w-3 ${
            star <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'
          }`}
        />
      ))}
    </div>
  );
}

export default function EmbedReadingPage() {
  const searchParams = useSearchParams();
  const [books, setBooks] = useState<Book[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const theme = (searchParams.get('theme') || 'light') as Theme;
  const status = searchParams.get('status') || 'READING';
  const limit = searchParams.get('limit') || '3';
  const showRating = searchParams.get('rating') !== 'false';
  const compact = searchParams.get('compact') === 'true';

  const colors = themes[theme] || themes.light;

  useEffect(() => {
    async function fetchBooks() {
      try {
        const response = await fetch(`/api/embed?status=${status}&limit=${limit}`);
        const data = await response.json();
        setBooks(data.books || []);
      } catch (error) {
        console.error('Failed to fetch books:', error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchBooks();
  }, [status, limit]);

  const statusLabels: Record<string, string> = {
    READING: 'Currently Reading',
    NEXT_UP: 'Up Next',
    FINISHED: 'Recently Finished',
  };

  if (isLoading) {
    return (
      <div className={`p-4 rounded-xl border ${colors.bg} ${colors.border}`}>
        <div className="animate-pulse flex items-center gap-3">
          <div className="w-12 h-16 bg-gray-200 rounded" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-200 rounded w-3/4" />
            <div className="h-3 bg-gray-200 rounded w-1/2" />
          </div>
        </div>
      </div>
    );
  }

  if (books.length === 0) {
    return (
      <div className={`p-4 rounded-xl border ${colors.bg} ${colors.border} ${colors.text}`}>
        <div className="flex items-center gap-2 text-sm">
          <BookOpen className="h-4 w-4" />
          <span>No books {status === 'READING' ? 'currently being read' : 'to display'}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-xl border overflow-hidden ${colors.bg} ${colors.border}`}>
      {/* Header */}
      <div className={`px-4 py-2 border-b ${colors.border} ${
        theme === 'gradient' ? 'bg-black/10' : ''
      }`}>
        <div className="flex items-center gap-2">
          <BookOpen className={`h-4 w-4 ${colors.text}`} />
          <span className={`text-sm font-medium ${colors.text}`}>
            {statusLabels[status] || 'Books'}
          </span>
        </div>
      </div>

      {/* Book List */}
      <div className={compact ? 'p-2 space-y-2' : 'p-4 space-y-3'}>
        {books.map((book) => (
          <div key={book.id} className="flex items-start gap-3">
            <BookCover book={book} theme={theme} />
            <div className="flex-1 min-w-0">
              <h3 className={`font-medium text-sm leading-tight truncate ${colors.text}`}>
                {book.title}
              </h3>
              <p className={`text-xs truncate mt-0.5 ${colors.subtext}`}>
                {book.author}
              </p>
              {showRating && book.rating && (
                <div className="mt-1">
                  <RatingStars rating={book.rating} />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className={`px-4 py-2 border-t ${colors.border} ${
        theme === 'gradient' ? 'bg-black/10' : theme === 'dark' ? 'bg-gray-800' : 'bg-gray-50'
      }`}>
        <a
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className={`text-xs ${colors.subtext} hover:underline`}
        >
          Pete's Reading Tracker
        </a>
      </div>
    </div>
  );
}
