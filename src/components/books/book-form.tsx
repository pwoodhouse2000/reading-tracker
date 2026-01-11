'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Search, X, RefreshCw, Star } from 'lucide-react';
import Image from 'next/image';

interface BookInfo {
  title: string;
  author: string;
  summary?: string;
  coverImageUrl?: string;
  isbn?: string;
}

interface BookFormProps {
  book?: any;
  mode: 'create' | 'edit';
}

export function BookForm({ book, mode }: BookFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<BookInfo[]>([]);
  const [searching, setSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [formData, setFormData] = useState({
    title: book?.title || '',
    author: book?.author || '',
    mediaType: book?.mediaType || 'PAPER',
    status: book?.status || 'TO_READ',
    category: book?.category || 'NON_FICTION',
    subCategory: book?.subCategory || '',
    summary: book?.summary || '',
    thoughts: book?.thoughts || '',
    coverImageUrl: book?.coverImageUrl || '',
    isbn: book?.isbn || '',
    rating: book?.rating || null,
  });

  // Debounced search effect
  useEffect(() => {
    if (!searchQuery || searchQuery.length < 3) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const response = await fetch(
          `/api/books/search?q=${encodeURIComponent(searchQuery)}`
        );
        const data = await response.json();
        setSearchResults(data || []);
        setShowResults(true);
      } catch (error) {
        console.error('Error searching books:', error);
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 500); // 500ms debounce

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const url = mode === 'create' ? '/api/books' : `/api/books/${book.id}`;
      const method = mode === 'create' ? 'POST' : 'PATCH';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error('Failed to save book');

      router.push('/books');
      router.refresh();
    } catch (error) {
      console.error('Error saving book:', error);
      alert('Failed to save book');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSelectBook = (bookInfo: BookInfo) => {
    setFormData((prev) => ({
      ...prev,
      title: bookInfo.title,
      author: bookInfo.author,
      summary: bookInfo.summary || prev.summary,
      coverImageUrl: bookInfo.coverImageUrl || prev.coverImageUrl,
      isbn: bookInfo.isbn || prev.isbn,
    }));
    setSearchQuery('');
    setShowResults(false);
    setSearchResults([]);
  };

  const handleRefreshMetadata = async () => {
    if (!formData.title) {
      alert('Please enter a title first');
      return;
    }

    setSearching(true);
    try {
      const query = `${formData.title} ${formData.author}`.trim();
      const response = await fetch(
        `/api/books/search?q=${encodeURIComponent(query)}`
      );
      const data = await response.json();

      if (data && data.length > 0) {
        setSearchResults(data);
        setShowResults(true);
      } else {
        alert('No matching books found. Try editing the title or author.');
      }
    } catch (error) {
      console.error('Error searching books:', error);
      alert('Failed to search for book metadata');
    } finally {
      setSearching(false);
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    setShowResults(false);
    setSearchResults([]);
  };

  const setRating = (rating: number | null) => {
    setFormData((prev) => ({ ...prev, rating }));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {mode === 'create' ? 'Add New Book' : 'Edit Book'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Search Section - for both create and edit */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <label className="block text-sm font-medium mb-2">
              {mode === 'create' ? 'Search for a book (optional)' : 'Refresh cover image & summary'}
            </label>
            <div className="relative">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={mode === 'create' ? "Search by title, author, or ISBN..." : "Search again or use refresh button..."}
                  className="w-full pl-10 pr-10 py-2 border rounded-md"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={clearSearch}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {mode === 'edit' && (
                <Button
                  type="button"
                  onClick={handleRefreshMetadata}
                  disabled={searching}
                  variant="outline"
                  className="mt-2 w-full"
                  size="sm"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${searching ? 'animate-spin' : ''}`} />
                  {searching ? 'Searching...' : 'Search for Covers & Summary'}
                </Button>
              )}

              {/* Search Results */}
              {showResults && (
                <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-96 overflow-y-auto">
                  {searching ? (
                    <div className="p-4 text-center text-muted-foreground">
                      Searching...
                    </div>
                  ) : searchResults.length === 0 ? (
                    <div className="p-4 text-center text-muted-foreground">
                      No books found. Try a different search term.
                    </div>
                  ) : (
                    <div className="divide-y">
                      {searchResults.map((result, index) => (
                        <button
                          key={index}
                          type="button"
                          onClick={() => handleSelectBook(result)}
                          className="w-full p-3 text-left hover:bg-accent transition-colors flex gap-3"
                        >
                          {result.coverImageUrl && (
                            <img
                              src={result.coverImageUrl}
                              alt={result.title}
                              className="w-12 h-16 object-cover rounded"
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm line-clamp-1">
                              {result.title}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              by {result.author}
                            </div>
                            {result.summary && (
                              <div className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                {result.summary}
                              </div>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {mode === 'create'
                ? 'Search to auto-fill book details, or enter manually below'
                : 'Find and select a different edition or cover image'}
            </p>
          </div>

          {/* Current Cover Preview */}
          {formData.coverImageUrl && (
            <div>
              <label className="block text-sm font-medium mb-2">Current Cover</label>
              <div className="relative w-32 h-48">
                <Image
                  src={formData.coverImageUrl}
                  alt={formData.title}
                  fill
                  className="object-cover rounded-md border"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1">
              Title *
            </label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border rounded-md"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Author *
            </label>
            <input
              type="text"
              name="author"
              value={formData.author}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border rounded-md"
            />
          </div>

          {/* Rating Selector */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Rating (optional)
            </label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(formData.rating === star ? null : star)}
                  className="transition-all hover:scale-110"
                >
                  <Star
                    className={`h-8 w-8 ${
                      formData.rating && star <= formData.rating
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-gray-300'
                    }`}
                  />
                </button>
              ))}
              {formData.rating && (
                <button
                  type="button"
                  onClick={() => setRating(null)}
                  className="ml-2 text-sm text-muted-foreground hover:text-foreground"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Media Type
              </label>
              <select
                name="mediaType"
                value={formData.mediaType}
                onChange={handleChange}
                className="w-full px-3 py-2 border rounded-md"
              >
                <option value="PAPER">Paper</option>
                <option value="AUDIOBOOK">Audiobook</option>
                <option value="EBOOK">E-book</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Status
              </label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="w-full px-3 py-2 border rounded-md"
              >
                <option value="TO_READ">To Read</option>
                <option value="NEXT_UP">Next Up</option>
                <option value="READING">Reading</option>
                <option value="PAUSED">Paused</option>
                <option value="FINISHED">Finished</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Category
              </label>
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="w-full px-3 py-2 border rounded-md"
              >
                <option value="FICTION">Fiction</option>
                <option value="NON_FICTION">Non-Fiction</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Sub-category (optional)
            </label>
            <input
              type="text"
              name="subCategory"
              value={formData.subCategory}
              onChange={handleChange}
              placeholder="e.g., Science Fiction, Biography, etc."
              className="w-full px-3 py-2 border rounded-md"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Summary (optional)
            </label>
            <textarea
              name="summary"
              value={formData.summary}
              onChange={handleChange}
              rows={3}
              placeholder="Book description or synopsis"
              className="w-full px-3 py-2 border rounded-md"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              My Thoughts (optional)
            </label>
            <textarea
              name="thoughts"
              value={formData.thoughts}
              onChange={handleChange}
              rows={3}
              placeholder="Your personal thoughts about this book..."
              className="w-full px-3 py-2 border rounded-md"
            />
          </div>

          <div className="flex gap-2">
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : mode === 'create' ? 'Add Book' : 'Save Changes'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
            >
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
