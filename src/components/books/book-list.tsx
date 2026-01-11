'use client';

import { useState, useMemo } from 'react';
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
  createdAt: Date | string;
  priority: number | null;
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

const statusOrder = {
  'READING': 1,
  'NEXT_UP': 2,
  'TO_READ': 3,
  'PAUSED': 4,
  'FINISHED': 5,
};

export function BookList({ books }: BookListProps) {
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [groupByStatus, setGroupByStatus] = useState(true);
  const [sortBy, setSortBy] = useState<'title' | 'author' | 'rating' | 'recent' | 'priority'>('priority');
  const [enriching, setEnriching] = useState(false);

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

  const sortedAndGroupedBooks = useMemo(() => {
    let filtered = statusFilter
      ? books.filter((book) => book.status === statusFilter)
      : books;

    // Sort function
    const sortBooks = (booksToSort: Book[]) => {
      return [...booksToSort].sort((a, b) => {
        switch (sortBy) {
          case 'title':
            return a.title.localeCompare(b.title);
          case 'author':
            return a.author.localeCompare(b.author);
          case 'rating':
            if (a.rating === b.rating) return 0;
            if (a.rating === null) return 1;
            if (b.rating === null) return -1;
            return b.rating - a.rating; // Highest rating first
          case 'recent':
            const dateA = new Date(a.createdAt).getTime();
            const dateB = new Date(b.createdAt).getTime();
            return dateB - dateA; // Most recent first
          case 'priority':
            if (a.priority === b.priority) return 0;
            if (a.priority === null) return 1;
            if (b.priority === null) return -1;
            return a.priority - b.priority; // Lower number = higher priority
          default:
            return 0;
        }
      });
    };

    if (!groupByStatus) {
      return { grouped: false, books: sortBooks(filtered) };
    }

    // Group by status
    const grouped = filtered.reduce((acc, book) => {
      if (!acc[book.status]) {
        acc[book.status] = [];
      }
      acc[book.status].push(book);
      return acc;
    }, {} as Record<string, Book[]>);

    // Sort within each group
    Object.keys(grouped).forEach((status) => {
      grouped[status] = sortBooks(grouped[status]);
    });

    return { grouped: true, booksByStatus: grouped };
  }, [books, statusFilter, groupByStatus, sortBy]);

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="space-y-4">
        {/* Status Filters */}
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
          >
            {enriching ? 'Enriching...' : '✨ Add Covers & Summaries'}
          </Button>
        </div>

        {/* Sort and Group Controls */}
        <div className="flex items-center gap-4 flex-wrap bg-gray-50 p-4 rounded-lg">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">Group by Status:</label>
            <button
              onClick={() => setGroupByStatus(!groupByStatus)}
              className={`px-3 py-1 rounded text-sm font-medium transition-all ${
                groupByStatus
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-white border border-gray-300 text-gray-700'
              }`}
            >
              {groupByStatus ? 'On' : 'Off'}
            </button>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">Sort by:</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-1 border rounded text-sm"
            >
              <option value="priority">Priority</option>
              <option value="title">Title (A-Z)</option>
              <option value="author">Author (A-Z)</option>
              <option value="rating">Rating (High-Low)</option>
              <option value="recent">Recently Added</option>
            </select>
          </div>
        </div>
      </div>

      {/* Books Display */}
      {books.length === 0 ? (
        <div className="text-center py-24">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
            <span className="text-3xl">📚</span>
          </div>
          <p className="text-lg font-medium text-gray-900">No books found</p>
          <p className="text-sm text-muted-foreground mt-1">Try selecting a different filter</p>
        </div>
      ) : sortedAndGroupedBooks.grouped ? (
        // Grouped by status
        <div className="space-y-8">
          {Object.entries(statusOrder)
            .filter(([status]) => sortedAndGroupedBooks.booksByStatus?.[status]?.length > 0)
            .map(([status, order]) => {
              const books = sortedAndGroupedBooks.booksByStatus![status];
              const statusLabel = statusFilters.find(f => f.value === status)?.label || status;

              return (
                <div key={status}>
                  <div className="flex items-center gap-3 mb-4">
                    <h2 className="text-2xl font-bold">{statusLabel}</h2>
                    <span className="bg-gray-200 text-gray-700 px-3 py-1 rounded-full text-sm font-medium">
                      {books.length}
                    </span>
                  </div>
                  <div className="grid gap-6 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                    {books.map((book) => (
                      <BookCard key={book.id} book={book} />
                    ))}
                  </div>
                </div>
              );
            })}
        </div>
      ) : (
        // Not grouped - single list
        <div className="grid gap-6 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {sortedAndGroupedBooks.books.map((book: Book) => (
            <BookCard key={book.id} book={book} />
          ))}
        </div>
      )}
    </div>
  );
}
