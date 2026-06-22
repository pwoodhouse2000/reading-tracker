'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Search, X, RefreshCw, Star, Sparkles } from 'lucide-react';
import Image from 'next/image';
import { MEDIA_TYPES, getSubCategoriesForCategory, parseMediaTypes, serializeMediaTypes } from '@/lib/constants';

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
    mediaTypes: string; // Comma-separated string
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
  const [mediaTypes, setMediaTypes] = useState<string[]>(
    book?.mediaTypes ? parseMediaTypes(book.mediaTypes) : ['PAPER']
  );
  
  // Check if subCategory is a predefined one or custom
  const availableSubCats = book ? getSubCategoriesForCategory(book.category as 'FICTION' | 'NON_FICTION') : [];
  const isCustomSubCat = book?.subCategory && !availableSubCats.some(sc => sc.value === book.subCategory);
  
  const [customSubCategory, setCustomSubCategory] = useState(isCustomSubCat ? book?.subCategory || '' : '');
  const [formData, setFormData] = useState({
    title: book?.title || '',
    author: book?.author || '',
    status: book?.status || 'TO_READ',
    category: book?.category || 'NON_FICTION',
    subCategory: isCustomSubCat ? 'Other' : (book?.subCategory || ''),
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

      // Use custom sub-category if "Other" is selected and custom value is provided
      const finalSubCategory = formData.subCategory === 'Other' && customSubCategory 
        ? customSubCategory 
        : formData.subCategory;

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          mediaTypes: serializeMediaTypes(mediaTypes),
          subCategory: finalSubCategory,
        }),
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
  const inputClass = "w-full px-4 py-3 border-2 border-input rounded-xl focus:border-primary focus:ring-0 transition-all bg-background text-foreground placeholder-muted-foreground";
  const textareaClass = "w-full px-4 py-3 border-2 border-input rounded-xl focus:border-primary focus:ring-0 transition-all resize-none bg-background text-foreground placeholder-muted-foreground";
  const selectClass = "w-full px-4 py-3 border-2 border-input rounded-xl focus:border-primary focus:ring-0 transition-all bg-background text-foreground";

  return (
    <Card className="border-0 shadow-xl bg-card/90 backdrop-blur">
      <CardHeader className="border-b border-border bg-gradient-to-r from-primary/5 to-accent/5">
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
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 border border-blue-100 dark:border-blue-900 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <label className="text-sm font-semibold text-blue-900 dark:text-blue-100">
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
                  className="w-full pl-12 pr-12 py-3 border-2 border-transparent bg-background rounded-xl shadow-sm focus:border-blue-300 focus:ring-0 transition-all text-foreground placeholder-muted-foreground"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={clearSearch}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-muted-foreground transition-colors"
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
                  className="mt-3 w-full rounded-xl border-2 border-blue-200 dark:border-blue-800 hover:border-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/40"
                  size="sm"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${searching ? 'animate-spin' : ''}`} />
                  {searching ? 'Searching...' : 'Search for Cover & Summary'}
                </Button>
              )}

              {/* Search Results Dropdown */}
              {showResults && (
                <div className="absolute z-20 w-full mt-2 bg-card border-2 border-border rounded-xl shadow-2xl max-h-96 overflow-y-auto">
                  {searching ? (
                    <div className="p-6 text-center text-muted-foreground">
                      <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2" />
                      Searching...
                    </div>
                  ) : searchResults.length === 0 ? (
                    <div className="p-6 text-center text-muted-foreground">
                      No books found. Try a different search term.
                    </div>
                  ) : (
                    <div className="divide-y divide-border">
                      {searchResults.map((result, index) => (
                        <button
                          key={index}
                          type="button"
                          onClick={() => handleSelectBook(result)}
                          className="w-full p-4 text-left hover:bg-muted transition-colors flex gap-4"
                        >
                          {result.coverImageUrl ? (
                            <img
                              src={result.coverImageUrl}
                              alt={result.title}
                              className="w-14 h-20 object-cover rounded-lg shadow-md flex-shrink-0"
                            />
                          ) : (
                            <div className="w-14 h-20 bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800 rounded-lg flex items-center justify-center flex-shrink-0">
                              <span className="text-muted-foreground text-xs">No cover</span>
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-sm text-foreground line-clamp-2">
                              {result.title}
                            </div>
                            <div className="text-sm text-muted-foreground mt-0.5">
                              by {result.author}
                            </div>
                            {result.summary && (
                              <div className="text-xs text-muted-foreground mt-2 line-clamp-2 leading-relaxed">
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
            <p className="text-xs text-blue-700/70 dark:text-blue-300/70 mt-3">
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
                <label className="block text-sm font-medium mb-2 text-muted-foreground">
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
              <label className="block text-sm font-semibold mb-2 text-foreground">
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
              <label className="block text-sm font-semibold mb-2 text-foreground">
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
            <label className="block text-sm font-semibold mb-3 text-foreground">
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
                  className="ml-3 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Media Types (Multiple Selection) */}
          <div>
            <label className="block text-sm font-semibold mb-3 text-foreground">
              Media Type(s) <span className="text-xs font-normal text-muted-foreground">(select all that apply)</span>
            </label>
            <div className="flex flex-wrap gap-4">
              {MEDIA_TYPES.map((mediaType) => (
                <label
                  key={mediaType.value}
                  className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded-md transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={mediaTypes.includes(mediaType.value)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setMediaTypes([...mediaTypes, mediaType.value]);
                      } else {
                        setMediaTypes(mediaTypes.filter(mt => mt !== mediaType.value));
                      }
                    }}
                    className="h-4 w-4 text-primary border-gray-300 rounded focus:ring-primary"
                  />
                  <span className="text-sm">
                    {mediaType.emoji} {mediaType.label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Status, Category, Priority */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

            <div>
              <label className="block text-sm font-semibold mb-2 text-foreground">
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
              <label className="block text-sm font-semibold mb-2 text-foreground">
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
              <label className="block text-sm font-semibold mb-2 text-foreground">
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

          {/* Sub-category with emoji picker */}
          <div>
            <label className="block text-sm font-semibold mb-2 text-foreground">
              Sub-category
            </label>
            <select
              name="subCategory"
              value={formData.subCategory || ''}
              onChange={(e) => {
                handleChange(e);
                if (e.target.value !== 'Other') {
                  setCustomSubCategory('');
                }
              }}
              className={selectClass}
            >
              <option value="">Select a sub-category...</option>
              {getSubCategoriesForCategory(formData.category as 'FICTION' | 'NON_FICTION').map((subCat) => (
                <option key={subCat.value} value={subCat.value}>
                  {subCat.emoji} {subCat.value}
                </option>
              ))}
            </select>
            
            {/* Custom sub-category input when "Other" is selected */}
            {formData.subCategory === 'Other' && (
              <input
                type="text"
                value={customSubCategory}
                onChange={(e) => setCustomSubCategory(e.target.value)}
                placeholder="Enter custom sub-category..."
                className={inputClass + ' mt-2'}
              />
            )}
          </div>

          {/* Date Started and Date Finished */}
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <label className="block text-sm font-semibold mb-2 text-foreground">
                Date Started
              </label>
              <input
                type="date"
                name="dateStarted"
                value={formData.dateStarted}
                onChange={handleChange}
                className={inputClass}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Auto-set when status changes to &quot;Reading&quot;
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2 text-foreground">
                Date Finished
              </label>
              <input
                type="date"
                name="dateFinished"
                value={formData.dateFinished}
                onChange={handleChange}
                className={inputClass}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Auto-set when status changes to &quot;Finished&quot;
              </p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2 text-foreground">
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
            <label className="block text-sm font-semibold mb-2 text-foreground">
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
