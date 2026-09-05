'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/components/auth/auth-provider';
import { 
  Search, 
  X, 
  Quote, 
  FileText, 
  BookOpen,
  Edit2,
  Trash2,
  ArrowRight
} from 'lucide-react';

interface Note {
  id: string;
  content: string;
  page: number | null;
  createdAt: string;
  tags?: string;
  isQuote?: boolean;
  isPublic?: boolean;
  book: {
    id: string;
    title: string;
    author: string;
    coverImageUrl: string | null;
  };
}

export default function NotesPage() {
  const { isAuthenticated } = useAuth();
  const [notes, setNotes] = useState<Note[]>([]);
  const [filteredNotes, setFilteredNotes] = useState<Note[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'quotes' | 'notes'>('all');
  const [error, setError] = useState('');

  useEffect(() => {
    fetchNotes();
  }, [isAuthenticated]);

  useEffect(() => {
    let filtered = notes;

    // Filter by type
    if (filter === 'quotes') {
      filtered = filtered.filter(n => n.isQuote ?? isQuote(n.content));
    } else if (filter === 'notes') {
      filtered = filtered.filter(n => !(n.isQuote ?? isQuote(n.content)));
    }

    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(n => 
        n.content.toLowerCase().includes(query) ||
        n.book.title.toLowerCase().includes(query) ||
        n.book.author.toLowerCase().includes(query) || n.tags?.toLowerCase().includes(query)
      );
    }

    setFilteredNotes(filtered);
  }, [notes, searchQuery, filter]);

  async function fetchNotes() {
    try {
      const response = await fetch('/api/notes');
      if (!response.ok) throw new Error('Could not load notes. Please try again.');
      const data = await response.json();
      setNotes(data);
      setFilteredNotes(data);
    } catch (error) {
      console.error('Failed to fetch notes:', error);
      setError('Could not load notes. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (noteId: string) => {
    if (!confirm('Delete this note?')) return;
    
    try {
      const response = await fetch(`/api/notes/${noteId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setNotes(notes.filter(n => n.id !== noteId));
      }
    } catch (error) {
      console.error('Failed to delete note:', error);
    }
  };

  function isQuote(content: string) {
    return content.startsWith('"') || content.startsWith('"') || content.startsWith('「');
  };

  // Group notes by book
  const notesByBook = filteredNotes.reduce((acc, note) => {
    if (!acc[note.book.id]) {
      acc[note.book.id] = {
        book: note.book,
        notes: [],
      };
    }
    acc[note.book.id].notes.push(note);
    return acc;
  }, {} as Record<string, { book: Note['book']; notes: Note[] }>);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <span className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {error && <p role="alert">{error}<Button onClick={fetchNotes}>Retry</Button></p>}
      {isAuthenticated && <a href="/api/notes/export" download className="inline-flex border rounded-lg px-4 py-2">Export Markdown / Obsidian</a>}
      {notes.some(n=>n.isQuote) && (()=>{const quotes=notes.filter(n=>n.isQuote);const note=quotes[Math.floor(Date.now()/86400000)%quotes.length];return <aside className="p-6 rounded-2xl bg-amber-50 dark:bg-amber-950 border border-amber-200"><h2 className="font-semibold">A quote to revisit today</h2><blockquote className="mt-3 whitespace-pre-wrap">{note.content}</blockquote><Link className="underline text-sm" href={`/books/${note.book.id}#notes`}>{note.book.title}</Link></aside>;})()}
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold">Notes & Quotes</h1>
        <p className="text-muted-foreground mt-2">
          {notes.length} notes across {Object.keys(notesByBook).length} books
        </p>
      </div>

      {/* Search & Filters */}
      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search notes, quotes, books, authors, or tags..."
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

        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              filter === 'all'
                ? 'bg-primary text-primary-foreground shadow-md'
                : 'bg-white/80 dark:bg-gray-800/80 text-muted-foreground hover:bg-white dark:hover:bg-gray-700'
            }`}
          >
            All ({notes.length})
          </button>
          <button
            onClick={() => setFilter('quotes')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              filter === 'quotes'
                ? 'bg-primary text-primary-foreground shadow-md'
                : 'bg-white/80 dark:bg-gray-800/80 text-muted-foreground hover:bg-white dark:hover:bg-gray-700'
            }`}
          >
            <Quote className="h-4 w-4" />
            Quotes ({notes.filter(n => n.isQuote ?? isQuote(n.content)).length})
          </button>
          <button
            onClick={() => setFilter('notes')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              filter === 'notes'
                ? 'bg-primary text-primary-foreground shadow-md'
                : 'bg-white/80 dark:bg-gray-800/80 text-muted-foreground hover:bg-white dark:hover:bg-gray-700'
            }`}
          >
            <FileText className="h-4 w-4" />
            Notes ({notes.filter(n => !(n.isQuote ?? isQuote(n.content))).length})
          </button>
        </div>
      </div>

      {/* Results */}
      {filteredNotes.length === 0 ? (
        <Card className="border-0 shadow-lg dark:bg-gray-800">
          <CardContent className="py-12 text-center">
            <Quote className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
            <h3 className="text-lg font-semibold mb-2">
              {searchQuery ? 'No matching notes' : 'No notes yet'}
            </h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery 
                ? 'Try a different search term'
                : 'Add notes and quotes while reading your books'}
            </p>
            <Link href="/books">
              <Button variant="outline">
                <BookOpen className="h-4 w-4 mr-2" />
                Browse Books
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {Object.values(notesByBook).map(({ book, notes: bookNotes }) => (
            <div key={book.id}>
              {/* Book Header */}
              <Link 
                href={`/books/${book.id}`}
                className="flex items-center gap-4 mb-4 group"
              >
                <div className="relative w-12 h-16 rounded-lg overflow-hidden shadow-md flex-shrink-0">
                  {book.coverImageUrl ? (
                    <Image
                      src={book.coverImageUrl}
                      alt={book.title}
                      fill
                      className="object-cover"
                      sizes="48px"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                      <BookOpen className="h-5 w-5 text-white" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="font-semibold text-lg group-hover:text-primary transition-colors truncate">
                    {book.title}
                  </h2>
                  <p className="text-sm text-muted-foreground truncate">
                    {book.author} · {bookNotes.length} note{bookNotes.length !== 1 ? 's' : ''}
                  </p>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
              </Link>

              {/* Notes List */}
              <div className="space-y-3 pl-16">
                {bookNotes.map((note) => {
                  const isQuoteNote = note.isQuote ?? isQuote(note.content);
                  
                  return (
                    <Card 
                      key={note.id}
                      className={`border-0 shadow-sm dark:bg-gray-800 group ${
                        isQuoteNote ? 'bg-amber-50/50 dark:bg-amber-950/20 border-l-4 border-l-amber-400' : ''
                      }`}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          {isQuoteNote && (
                            <Quote className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className={`leading-relaxed whitespace-pre-wrap ${
                              isQuoteNote ? 'italic text-amber-900 dark:text-amber-100' : ''
                            }`}>
                              {note.content}
                            </p>
                            
                            <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
                              <span>{note.isPublic ? 'Shared quote' : 'Private'}{note.tags ? ` · ${note.tags}` : ''}</span>
                              {note.page && (
                                <span className="flex items-center gap-1">
                                  <BookOpen className="h-3 w-3" />
                                  Page {note.page}
                                </span>
                              )}
                              <span>
                                {new Date(note.createdAt).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric',
                                })}
                              </span>
                            </div>
                          </div>
                          
                          {isAuthenticated && (
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Link href={`/books/${book.id}`}>
                                <button className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-muted-foreground hover:text-foreground transition-colors">
                                  <Edit2 className="h-4 w-4" />
                                </button>
                              </Link>
                              <button
                                onClick={() => handleDelete(note.id)}
                                className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-muted-foreground hover:text-red-600 transition-colors"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
