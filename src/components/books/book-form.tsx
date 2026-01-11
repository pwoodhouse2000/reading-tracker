'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Search, X, RefreshCw, Star, Sparkles } from 'lucide-react';
import Image from 'next/image';

interface BookInfo {
  title: string;
  author: string;
  summary?: string;
  coverImageUrl?: string;
  isbn?: string;
}

interface BookFormProps {
  book?: {
    id: string;
    title: string;
    author: string;
    mediaType: string;
    status: string;
    category: string;
    subCategory: string | null;
    summary: string | null;
    thoughts: string | null;
    coverImageUrl: string | null;
    isbn: string | null;
    rating: number | null;
    priority: number | null;
    dateStarted: Date | null;
    dateFinished: Date | null;
  };
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
    priority: book?.priority || null,
    dateStarted: book?.dateStarted ? new Date(book.dateStarted).toISOString().split('T')[0] : '',
    dateFinished: book?.dateFinished ? new Date(book.dateFinished).toISOString().split('T')[0] : '',
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
        setSearchResults(data.results || []);
        setShowResults(true);
      } catch (error) {
        console.error('Error searching books:', error);
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const url = mode === 'create' ? '/api/books' : `/api/books/${book?.id}`;
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
    const value = e.target.type === 'number' 
      ? (e.target.value === '' ? null : parseInt(e.target.value))
      : e.target.value;
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: value,
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

      if (data.results && data.results.length > 0) {
        setSearchResults(data.results);
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

  // Common input class for consistent styling
  const inputClass = "w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-primary focus:ring-0 transition-all bg-white text-gray-900";
  const textareaClass = "w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-primary focus:ring-0 transition-all resize-none bg-white text-gray-900";
  const selectClass = "w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-primary focus:ring-0 transition-all bg-white text-gray-900";

  return (
    <Card className="border-0 shadow-xl bg-white/90 backdrop-blur">
      <CardHeader className="border-b border-gray-100 bg-gradient-to-r from-primary/5 to-accent/5">
        <CardTitle className="text-2xl">
          {mode === 'create' ? 'Add New Book' : 'Edit Book'}
        </CardTitle>
        <CardDescription>
          {mode === 'create' 
            ? 'Search for a book or enter details manually'
            : 'Update book information and your notes'}
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Search Section */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="h-5 w-5 text-blue-600" />
              <label className="text-sm font-semibold text-blue-900">
                {mode === 'create' ? 'Search for a book' : 'Find different edition or cover'}
              </label>
            </div>
            <div className="relative">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by title, author, or ISBN..."
                  className="w-full pl-12 pr-12 py-3 border-2 border-transparent bg-white rounded-xl shadow-sm focus:border-blue-300 focus:ring-0 transition-all text-gray-900 placeholder-gray-400"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={clearSearch}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                )}
              </div>

              {mode === 'edit' && (
                <Button
                  type="button"
                  onClick={handleRefreshMetadata}
                  disabled={searching}
                  variant="outline"
                  className="mt-3 w-full rounded-xl border-2 border-blue-200 hover:border-blue-300 hover:bg-blue-50"
                  size="sm"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${searching ? 'animate-spin' : ''}`} />
                  {searching ? 'Searching...' : 'Search for Cover & Summary'}
                </Button>
              )}

              {/* Search Results Dropdown */}
              {showResults && (
                <div className="absolute z-20 w-full mt-2 bg-white border-2 border-gray-100 rounded-xl shadow-2xl max-h-96 overflow-y-auto">
                  {searching ? (
                    <div className="p-6 text-center text-gray-500">
                      <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2" />
                      Searching...
                    </div>
                  ) : searchResults.length === 0 ? (
                    <div className="p-6 text-center text-gray-500">
                      No books found. Try a different search term.
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-100">
                      {searchResults.map((result, index) => (
                        <button
                          key={index}
                          type="button"
                          onClick={() => handleSelectBook(result)}
                          className="w-full p-4 text-left hover:bg-gray-50 transition-colors flex gap-4"
                        >
                          {result.coverImageUrl ? (
                            <img
                              src={result.coverImageUrl}
                              alt={result.title}
                              className="w-14 h-20 object-cover rounded-lg shadow-md flex-shrink-0"
                            />
                          ) : (
                            <div className="w-14 h-20 bg-gradient-to-br from-gray-200 to-gray-300 rounded-lg flex items-center justify-center flex-shrink-0">
                              <span className="text-gray-500 text-xs">No cover</span>
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-sm text-gray-900 line-clamp-2">
                              {result.title}
                            </div>
                            <div className="text-sm text-gray-600 mt-0.5">
                              by {result.author}
                            </div>
                            {result.summary && (
                              <div className="text-xs text-gray-500 mt-2 line-clamp-2 leading-relaxed">
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
            <p className="text-xs text-blue-700/70 mt-3">
              {mode === 'create'
                ? 'Search to auto-fill book details, or enter manually below'
                : 'Find and select a different edition or cover image'}
            </p>
          </div>

          {/* Cover Preview */}
          {formData.coverImageUrl && (
            <div className="flex gap-6 items-start">
              <div className="relative w-32 h-48 flex-shrink-0">
                <Image
                  src={formData.coverImageUrl}
                  alt={formData.title}
                  fill
                  className="object-cover rounded-xl shadow-lg"
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium mb-2 text-gray-600">
                  Cover Image URL
                </label>
                <input
                  type="url"
                  name="coverImageUrl"
                  value={formData.coverImageUrl}
                  onChange={handleChange}
                  className={inputClass + " text-sm"}
                  placeholder="https://..."
                />
              </div>
            </div>
          )}

          {/* Title and Author */}
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <label className="block text-sm font-semibold mb-2 text-gray-700">
                Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                required
                className={inputClass}
                placeholder="Enter book title"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2 text-gray-700">
                Author <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="author"
                value={formData.author}
                onChange={handleChange}
                required
                className={inputClass}
                placeholder="Enter author name"
              />
            </div>
          </div>

          {/* Rating */}
          <div>
            <label className="block text-sm font-semibold mb-3 text-gray-700">
              Rating
            </label>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(formData.rating === star ? null : star)}
                  className="transition-all hover:scale-110 focus:scale-110"
                >
                  <Star
                    className={`h-8 w-8 ${
                      formData.rating && star <= formData.rating
                        ? 'fill-amber-400 text-amber-400'
                        : 'text-gray-300 hover:text-amber-300'
                    }`}
                  />
                </button>
              ))}
              {formData.rating && (
                <button
                  type="button"
                  onClick={() => setRating(null)}
                  className="ml-3 text-sm text-gray-500 hover:text-gray-700 transition-colors"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Type, Status, Category, Priority */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-2 text-gray-700">
                Media Type
              </label>
              <select
                name="mediaType"
                value={formData.mediaType}
                onChange={handleChange}
                className={selectClass}
              >
                <option value="PAPER">📖 Paper</option>
                <option value="AUDIOBOOK">🎧 Audiobook</option>
                <option value="EBOOK">📱 E-book</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2 text-gray-700">
                Status
              </label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className={selectClass}
              >
                <option value="TO_READ">📋 To Read</option>
                <option value="NEXT_UP">⏳ Next Up</option>
                <option value="READING">📖 Reading</option>
                <option value="PAUSED">⏸️ Paused</option>
                <option value="FINISHED">✅ Finished</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2 text-gray-700">
                Category
              </label>
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                className={selectClass}
              >
                <option value="FICTION">Fiction</option>
                <option value="NON_FICTION">Non-Fiction</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2 text-gray-700">
                Priority
              </label>
              <input
                type="number"
                name="priority"
                value={formData.priority ?? ''}
                onChange={handleChange}
                min="1"
                className={inputClass}
                placeholder="1 = highest"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2 text-gray-700">
              Sub-category
            </label>
            <input
              type="text"
              name="subCategory"
              value={formData.subCategory}
              onChange={handleChange}
              placeholder="e.g., Science Fiction, Biography, Self-Help..."
              className={inputClass}
            />
          </div>

          {/* Date Started and Date Finished */}
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <label className="block text-sm font-semibold mb-2 text-gray-700">
                Date Started
              </label>
              <input
                type="date"
                name="dateStarted"
                value={formData.dateStarted}
                onChange={handleChange}
                className={inputClass}
              />
              <p className="text-xs text-gray-500 mt-1">
                Auto-set when status changes to &quot;Reading&quot;
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2 text-gray-700">
                Date Finished
              </label>
              <input
                type="date"
                name="dateFinished"
                value={formData.dateFinished}
                onChange={handleChange}
                className={inputClass}
              />
              <p className="text-xs text-gray-500 mt-1">
                Auto-set when status changes to &quot;Finished&quot;
              </p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2 text-gray-700">
              Summary
            </label>
            <textarea
              name="summary"
              value={formData.summary}
              onChange={handleChange}
              rows={4}
              placeholder="Book description or synopsis..."
              className={textareaClass}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2 text-gray-700">
              My Thoughts
            </label>
            <textarea
              name="thoughts"
              value={formData.thoughts}
              onChange={handleChange}
              rows={4}
              placeholder="Your personal thoughts about this book..."
              className={textareaClass}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-gray-100">
            <Button type="submit" disabled={loading} className="shadow-lg shadow-primary/25">
              {loading ? 'Saving...' : mode === 'create' ? 'Add Book' : 'Save Changes'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              className="border-2"
            >
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
