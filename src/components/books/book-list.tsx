'use client';

import { useState } from 'react';
import { BookCard } from './book-card';
import { Button } from '@/components/ui/button';

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
  const [enriching, setEnriching] = useState(false);

  const filteredBooks = statusFilter
    ? books.filter((book) => book.status === statusFilter)
    : books;

  const handleEnrich = async () => {
    setEnriching(true);
    try {
      const response = await fetch('/api/books/enrich', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      const data = await response.json();

      if (data.success) {
        alert(`Enriched ${data.enriched} books with cover images and summaries!`);
        window.location.reload();
      } else {
        alert('Failed to enrich books');
      }
    } catch (error) {
      console.error('Error enriching books:', error);
      alert('Failed to enrich books');
    } finally {
      setEnriching(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex gap-2 flex-wrap">
          {statusFilters.map((filter) => (
            <button
              key={filter.label}
              onClick={() => setStatusFilter(filter.value)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                statusFilter === filter.value
                  ? 'bg-primary text-primary-foreground shadow-md'
                  : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
        <Button
          onClick={handleEnrich}
          disabled={enriching}
          variant="outline"
          className="ml-auto"
        >
          {enriching ? 'Enriching...' : '✨ Add Covers & Summaries'}
        </Button>
      </div>

      {filteredBooks.length === 0 ? (
        <div className="text-center py-24">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
            <span className="text-3xl">📚</span>
          </div>
          <p className="text-lg font-medium text-gray-900">No books found</p>
          <p className="text-sm text-muted-foreground mt-1">Try selecting a different filter</p>
        </div>
      ) : (
        <div className="grid gap-6 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {filteredBooks.map((book) => (
            <BookCard key={book.id} book={book} />
          ))}
        </div>
      )}
    </div>
  );
}
