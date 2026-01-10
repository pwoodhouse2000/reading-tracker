'use client';

import { useState } from 'react';
import { BookCard } from './book-card';

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

interface BookListProps {
  books: Book[];
}

const statusFilters = [
  { label: 'All', value: null },
  { label: 'To Read', value: 'TO_READ' },
  { label: 'Next Up', value: 'NEXT_UP' },
  { label: 'Reading', value: 'READING' },
  { label: 'Paused', value: 'PAUSED' },
  { label: 'Finished', value: 'FINISHED' },
] as const;

export function BookList({ books }: BookListProps) {
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  const filteredBooks = statusFilter
    ? books.filter((book) => book.status === statusFilter)
    : books;

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        {statusFilters.map((filter) => (
          <button
            key={filter.label}
            onClick={() => setStatusFilter(filter.value)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              statusFilter === filter.value
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {filteredBooks.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p>No books found</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredBooks.map((book) => (
            <BookCard key={book.id} book={book} />
          ))}
        </div>
      )}
    </div>
  );
}
