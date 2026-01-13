'use client';

import { useState, useMemo, useEffect } from 'react';
import { BookCard } from './book-card';
import { SortableBookList } from './sortable-book-list';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/components/auth/auth-provider';
import { Search, X, Sparkles, LayoutGrid, List, GripVertical } from 'lucide-react';

interface Book {
  id: string;
  title: string;
  author: string;
  status: 'TO_READ' | 'NEXT_UP' | 'READING' | 'PAUSED' | 'FINISHED';
  mediaTypes: string;
  category: 'FICTION' | 'NON_FICTION';
  subCategory?: string | null;
  rating: number | null;
  coverImageUrl: string | null;
  summary: string | null;
  createdAt: Date | string;
  priority: number | null;
}

interface BookListProps {
  books: Book[];
  initialStatus?: string;
  initialCategory?: string;
  initialSubCategory?: string;
  initialSearch?: string;
}

const statusFilters = [
  { label: 'All', value: null, emoji: '📚' },
  { label: 'Reading', value: 'READING', emoji: '📖' },
  { label: 'Next Up', value: 'NEXT_UP', emoji: '⏳' },
  { label: 'To Read', value: 'TO_READ', emoji: '📋' },
  { label: 'Paused', value: 'PAUSED', emoji: '⏸️' },
  { label: 'Finished', value: 'FINISHED', emoji: '✅' },
] as const;

const statusOrder = {
  'READING': 1,
  'NEXT_UP': 2,
  'TO_READ': 3,
  'PAUSED': 4,
  'FINISHED': 5,
};

// Statuses where drag-and-drop reordering makes sense
const reorderableStatuses = ['TO_READ', 'NEXT_UP', 'READING'];

export function BookList({ 
  books, 
  initialStatus,
  initialCategory,
  initialSubCategory,
  initialSearch 
}: BookListProps) {
  const { isAuthenticated } = useAuth();
  const hasUrlFilters = !!(initialStatus || initialCategory || initialSubCategory);
  
  const [statusFilter, setStatusFilter] = useState<string | null>(initialStatus || null);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(initialCategory || null);
  const [subCategoryFilter, setSubCategoryFilter] = useState<string | null>(initialSubCategory || null);
  const [groupByStatus, setGroupByStatus] = useState(!hasUrlFilters);
  const [sortBy, setSortBy] = useState<'title' | 'author' | 'rating' | 'recent' | 'priority'>('priority');
  const [enriching, setEnriching] = useState(false);
  const [searchQuery, setSearchQuery] = useState(initialSearch || '');
  const [viewMode, setViewMode] = useState<'grid' | 'compact'>('grid');
  const [reorderMode, setReorderMode] = useState(false);

  // Enable reorder mode only when viewing a single reorderable status
  const canReorder = isAuthenticated && 
    statusFilter && 
    reorderableStatuses.includes(statusFilter) && 
    !searchQuery &&
    sortBy === 'priority';

  // Turn off reorder mode if conditions change
  useEffect(() => {
    if (!canReorder) {
      setReorderMode(false);
    }
  }, [canReorder]);

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
    let filtered = books.filter((book) => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        book.title.toLowerCase().includes(query) ||
        book.author.toLowerCase().includes(query) ||
        book.summary?.toLowerCase().includes(query) ||
        book.subCategory?.toLowerCase().includes(query)
      );
    });

    if (statusFilter) {
      filtered = filtered.filter((book) => book.status === statusFilter);
    }

    if (categoryFilter) {
      filtered = filtered.filter((book) => book.category === categoryFilter);
    }

    if (subCategoryFilter) {
      filtered = filtered.filter((book) => book.subCategory === subCategoryFilter);
    }

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
            return b.rating - a.rating;
          case 'recent':
            const dateA = new Date(a.createdAt).getTime();
            const dateB = new Date(b.createdAt).getTime();
            return dateB - dateA;
          case 'priority':
            if (a.priority === b.priority) return 0;
            if (a.priority === null) return 1;
            if (b.priority === null) return -1;
            return a.priority - b.priority;
          default:
            return 0;
        }
      });
    };

    if (!groupByStatus) {
      return { grouped: false, books: sortBooks(filtered) };
    }

    const grouped = filtered.reduce((acc, book) => {
      if (!acc[book.status]) {
        acc[book.status] = [];
      }
      acc[book.status].push(book);
      return acc;
    }, {} as Record<string, Book[]>);

    Object.keys(grouped).forEach((status) => {
      grouped[status] = sortBooks(grouped[status]);
    });

    return { grouped: true, booksByStatus: grouped };
  }, [books, statusFilter, categoryFilter, subCategoryFilter, groupByStatus, sortBy, searchQuery]);

  const totalFiltered = sortedAndGroupedBooks.grouped
    ? Object.values(sortedAndGroupedBooks.booksByStatus || {}).flat().length
    : (sortedAndGroupedBooks.books || []).length;

  return (
    <div className="space-y-6">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by title, author, or keywords..."
          className="w-full pl-12 pr-12 py-3 bg-white dark:bg-gray-800 border-2 border-transparent rounded-xl shadow-sm focus:border-primary focus:ring-0 transition-all text-base"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-4 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Controls */}
      <div className="space-y-4">
        {/* Status Filters */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex gap-2 flex-wrap">
            {statusFilters.map((filter) => (
              <button
                key={filter.label}
                onClick={() => setStatusFilter(filter.value)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${
                  statusFilter === filter.value
                    ? 'bg-primary text-primary-foreground shadow-md scale-105'
                    : 'bg-white/80 dark:bg-gray-800/80 backdrop-blur border border-white/20 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-700 hover:shadow-sm'
                }`}
              >
                <span>{filter.emoji}</span>
                <span>{filter.label}</span>
              </button>
            ))}
          </div>
          <Button
            onClick={handleEnrich}
            disabled={enriching}
            variant="outline"
            className="rounded-xl border-2"
          >
            <Sparkles className={`h-4 w-4 mr-2 ${enriching ? 'animate-pulse' : ''}`} />
            {enriching ? 'Enriching...' : 'Add Covers & Summaries'}
          </Button>
        </div>

        {/* Sort and View Controls */}
        <div className="flex items-center justify-between gap-4 flex-wrap bg-white/60 dark:bg-gray-800/60 backdrop-blur p-4 rounded-xl border border-white/20 dark:border-gray-700">
          <div className="flex items-center gap-6 flex-wrap">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Group by Status</label>
              <button
                onClick={() => setGroupByStatus(!groupByStatus)}
                className={`w-12 h-6 rounded-full transition-all relative ${
                  groupByStatus ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600'
                }`}
              >
                <span
                  className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow ${
                    groupByStatus ? 'left-7' : 'left-1'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Sort by</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                className="px-3 py-1.5 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 focus:ring-2 focus:ring-primary/20 focus:border-primary"
              >
                <option value="priority">Priority</option>
                <option value="title">Title (A-Z)</option>
                <option value="author">Author (A-Z)</option>
                <option value="rating">Rating (High-Low)</option>
                <option value="recent">Recently Added</option>
              </select>
            </div>

            {/* Reorder Mode Toggle */}
            {canReorder && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setReorderMode(!reorderMode)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    reorderMode
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
                  }`}
                >
                  <GripVertical className="h-4 w-4" />
                  Reorder
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition-all ${
                viewMode === 'grid'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
              }`}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('compact')}
              className={`p-2 rounded-lg transition-all ${
                viewMode === 'compact'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
              }`}
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Reorder Mode Hint */}
        {reorderMode && (
          <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-xl p-3 text-sm text-blue-700 dark:text-blue-300 flex items-center gap-2">
            <GripVertical className="h-4 w-4" />
            Drag books to reorder. Changes are saved automatically.
          </div>
        )}

        {/* Results count */}
        {searchQuery && (
          <p className="text-sm text-muted-foreground">
            Found <span className="font-semibold text-foreground">{totalFiltered}</span> books
            matching "<span className="font-medium">{searchQuery}</span>"
          </p>
        )}
      </div>

      {/* Books Display */}
      {totalFiltered === 0 ? (
        <div className="text-center py-24 bg-white/60 dark:bg-gray-800/60 backdrop-blur rounded-2xl">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 mb-6">
            <span className="text-4xl">📚</span>
          </div>
          <p className="text-xl font-medium text-gray-900 dark:text-gray-100">No books found</p>
          <p className="text-muted-foreground mt-2 max-w-md mx-auto">
            {searchQuery
              ? `No books match "${searchQuery}". Try a different search term.`
              : 'Try selecting a different filter or add some books to get started.'}
          </p>
        </div>
      ) : reorderMode && !sortedAndGroupedBooks.grouped ? (
        // Reorder mode - use sortable list
        <SortableBookList
          books={sortedAndGroupedBooks.books || []}
          compact={viewMode === 'compact'}
        />
      ) : sortedAndGroupedBooks.grouped && sortedAndGroupedBooks.booksByStatus ? (
        // Grouped by status
        <div className="space-y-10">
          {Object.entries(statusOrder)
            .filter(([status]) => (sortedAndGroupedBooks.booksByStatus?.[status]?.length ?? 0) > 0)
            .map(([status]) => {
              const statusBooks = sortedAndGroupedBooks.booksByStatus?.[status] || [];
              const statusInfo = statusFilters.find(f => f.value === status);

              return (
                <div key={status}>
                  <div className="flex items-center gap-3 mb-6">
                    <span className="text-2xl">{statusInfo?.emoji}</span>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{statusInfo?.label || status}</h2>
                    <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-semibold">
                      {statusBooks.length}
                    </span>
                  </div>
                  <div className={
                    viewMode === 'grid'
                      ? 'grid gap-6 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6'
                      : 'space-y-3'
                  }>
                    {statusBooks.map((book) => (
                      <BookCard key={book.id} book={book} compact={viewMode === 'compact'} />
                    ))}
                  </div>
                </div>
              );
            })}
        </div>
      ) : (
        // Not grouped - single list (no reorder)
        <div className={
          viewMode === 'grid'
            ? 'grid gap-6 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6'
            : 'space-y-3'
        }>
          {(sortedAndGroupedBooks.books || []).map((book: Book) => (
            <BookCard key={book.id} book={book} compact={viewMode === 'compact'} />
          ))}
        </div>
      )}
    </div>
  );
}
