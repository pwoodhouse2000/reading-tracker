'use client';

import { useState, useRef, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/components/auth/auth-provider';
import { 
  Quote, 
  FileText, 
  Trash2, 
  Edit2, 
  Check, 
  X, 
  Plus,
  BookOpen,
  Camera
} from 'lucide-react';

interface Note {
  id: string;
  content: string;
  page: number | null;
  createdAt: string;
  isQuote?: boolean;
  isPublic?: boolean;
  tags?: string;
  book?: {
    id: string;
    title: string;
    author: string;
  };
}

interface NoteListProps {
  notes: Note[];
  bookId: string;
  onNoteAdded?: (note: Note) => void;
  onNoteUpdated?: (note: Note) => void;
  onNoteDeleted?: (noteId: string) => void;
  showBookInfo?: boolean;
}

export function NoteList({ 
  notes: initialNotes, 
  bookId, 
  onNoteAdded,
  onNoteUpdated,
  onNoteDeleted,
  showBookInfo = false
}: NoteListProps) {
  const { isAuthenticated } = useAuth();
  const [notes, setNotes] = useState<Note[]>(initialNotes);
  useEffect(() => {setNotes(initialNotes.filter(n => isAuthenticated || (n.isPublic && n.isQuote)));}, [initialNotes,isAuthenticated]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newContent, setNewContent] = useState('');
  const [newPage, setNewPage] = useState('');
  const [isQuote, setIsQuote] = useState(false);
  const [isPublic, setIsPublic] = useState(false);
  const [tags, setTags] = useState('');
  const [editQuote, setEditQuote] = useState(false);
  const [editPublic, setEditPublic] = useState(false);
  const [editTags, setEditTags] = useState('');
  const [saveError, setSaveError] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editPage, setEditPage] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrError, setOcrError] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  // Downscale a photo client-side (max 1600px on the long edge, JPEG ~0.8)
  const downscaleImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          const MAX_EDGE = 1600;
          const scale = Math.min(1, MAX_EDGE / Math.max(img.width, img.height));
          const canvas = document.createElement('canvas');
          canvas.width = Math.round(img.width * scale);
          canvas.height = Math.round(img.height * scale);
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Canvas not supported'));
            return;
          }
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/jpeg', 0.8));
        };
        img.onerror = () => reject(new Error('Could not read image'));
        img.src = reader.result as string;
      };
      reader.onerror = () => reject(new Error('Could not read file'));
      reader.readAsDataURL(file);
    });
  };

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setOcrLoading(true);
    setOcrError(null);
    try {
      const dataUri = await downscaleImage(file);
      const response = await fetch('/api/notes/ocr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: dataUri, bookId }),
      });

      const data = await response.json();
      if (!response.ok) {
        setOcrError(data.error || 'Could not extract text from the photo');
        return;
      }

      // Drop the extracted text into the note form for review before saving
      setNewContent(data.text);
      setIsQuote(true);
      setShowAddForm(true);
    } catch (error) {
      console.error('Failed to OCR photo:', error);
      setOcrError('Something went wrong reading the photo. Please try again.');
    } finally {
      setOcrLoading(false);
    }
  };

  const handleAddNote = async () => {
    if (!newContent.trim()) return;
    
    setIsSaving(true);
    try {
      const response = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookId,
          content: newContent,
          page: newPage || null,
          isQuote, isPublic: isQuote && isPublic, tags,
        }),
      });

      if (!response.ok) throw new Error((await response.json()).error || 'Could not save note');
      if (response.ok) {
        const note = await response.json();
        setNotes([note, ...notes]);
        setNewContent('');
        setNewPage('');
        setIsQuote(false);
        setIsPublic(false);setTags('');setSaveError('');
        setShowAddForm(false);
        onNoteAdded?.(note);
      }
    } catch (error) {
      console.error('Failed to add note:', error);
      setSaveError(error instanceof Error ? error.message : 'Could not save note');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateNote = async (noteId: string) => {
    if (!editContent.trim()) return;
    
    setIsSaving(true);
    try {
      const response = await fetch(`/api/notes/${noteId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: editContent,
          page: editPage || null,
          isQuote: editQuote, isPublic: editQuote && editPublic, tags: editTags,
        }),
      });

      if (!response.ok) throw new Error((await response.json()).error || 'Could not save note');
      if (response.ok) {
        const updatedNote = await response.json();
        setNotes(notes.map(n => n.id === noteId ? updatedNote : n));
        setEditingId(null);
        setSaveError('');
        onNoteUpdated?.(updatedNote);
      }
    } catch (error) {
      console.error('Failed to update note:', error);
      setSaveError(error instanceof Error ? error.message : 'Could not save note');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!confirm('Delete this note?')) return;
    
    try {
      const response = await fetch(`/api/notes/${noteId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Could not delete note');
      if (response.ok) {
        setNotes(notes.filter(n => n.id !== noteId));
        onNoteDeleted?.(noteId);
      }
    } catch (error) {
      console.error('Failed to delete note:', error);
      setSaveError('Could not delete note. Please try again.');
    }
  };

  const startEditing = (note: Note) => {
    setEditingId(note.id);
    setEditContent(note.content);
    setEditPage(note.page?.toString() || '');
    setEditQuote(note.isQuote ?? isQuoteContent(note.content));setEditPublic(!!note.isPublic);setEditTags(note.tags || '');
  };

  const isQuoteContent = (content: string) => {
    return content.startsWith('"') || content.startsWith('"') || content.startsWith('「');
  };

  return (
    <div className="space-y-4">
      {saveError && <p role="alert" className="text-red-600">{saveError}</p>}
      {/* Add Note Button/Form */}
      {isAuthenticated && (
        <div>
          {showAddForm ? (
            <Card className="border-2 border-primary/20 dark:bg-gray-800">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-4 mb-2">
                  <button
                    onClick={() => setIsQuote(false)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-all ${
                      !isQuote 
                        ? 'bg-primary text-primary-foreground' 
                        : 'bg-gray-100 dark:bg-gray-700 text-muted-foreground hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    <FileText className="h-4 w-4" />
                    Note
                  </button>
                  <button
                    onClick={() => setIsQuote(true)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-all ${
                      isQuote 
                        ? 'bg-primary text-primary-foreground' 
                        : 'bg-gray-100 dark:bg-gray-700 text-muted-foreground hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    <Quote className="h-4 w-4" />
                    Quote
                  </button>
                </div>
                
                <textarea
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  placeholder={isQuote ? 'Enter a memorable quote from the book...' : 'Write your thoughts, ideas, or notes...'}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 focus:ring-2 focus:ring-primary/20 focus:border-primary min-h-[100px] resize-none"
                  autoFocus
                />
                <label className="block text-sm">Tags<input aria-label="Note tags" value={tags} onChange={e=>setTags(e.target.value)} placeholder="ideas, leadership" className="w-full p-2 border rounded bg-background" /></label>
                {isQuote && <label className="flex gap-2 text-sm"><input type="checkbox" checked={isPublic} onChange={e=>setIsPublic(e.target.checked)} />Share this quote publicly</label>}
                <p className="text-xs text-muted-foreground">Notes are private. Quotes are private unless you choose to share them.</p>
                
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-muted-foreground" />
                    <input
                      type="number"
                      value={newPage}
                      onChange={(e) => setNewPage(e.target.value)}
                      placeholder="Page #"
                      className="w-20 px-2 py-1.5 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  </div>
                  
                  <div className="flex-1" />
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowAddForm(false);
                      setNewContent('');
                      setNewPage('');
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleAddNote}
                    disabled={!newContent.trim() || isSaving}
                    className="shadow-sm"
                  >
                    {isSaving ? (
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <Check className="h-4 w-4 mr-1" />
                        Save
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowAddForm(true)}
                className="flex-1 border-dashed border-2 hover:border-primary hover:bg-primary/5"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Note or Quote
              </Button>
              <Button
                variant="outline"
                onClick={() => photoInputRef.current?.click()}
                disabled={ocrLoading}
                className="border-dashed border-2 hover:border-primary hover:bg-primary/5"
                aria-label="Scan quote from photo"
                title="Scan quote from photo"
              >
                {ocrLoading ? (
                  <span className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                ) : (
                  <Camera className="h-4 w-4" />
                )}
              </Button>
            </div>
          )}
          <input
            ref={photoInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handlePhotoSelect}
            className="hidden"
            data-testid="ocr-photo-input"
          />
          {ocrLoading && (
            <p className="text-sm text-muted-foreground mt-2">Reading text from photo…</p>
          )}
          {ocrError && (
            <p className="text-sm text-red-600 dark:text-red-400 mt-2">{ocrError}</p>
          )}
        </div>
      )}

      {/* Notes List */}
      {notes.length === 0 && !showAddForm ? (
        <div className="text-center py-8 text-muted-foreground">
          <Quote className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>No notes yet</p>
          {isAuthenticated && (
            <p className="text-sm mt-1">Add your first note or quote above</p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {notes.map((note) => {
            const isQuoteNote = note.isQuote ?? isQuoteContent(note.content);
            const isEditing = editingId === note.id;

            return (
              <Card 
                key={note.id} 
                className={`border-0 shadow-sm dark:bg-gray-800 ${
                  isQuoteNote ? 'bg-amber-50/50 dark:bg-amber-950/20 border-l-4 border-l-amber-400' : ''
                }`}
              >
                <CardContent className="p-4">
                  {isEditing ? (
                    <div className="space-y-3">
                      <label className="block text-sm">Tags<input value={editTags} onChange={e=>setEditTags(e.target.value)} className="w-full p-2 border rounded bg-background" /></label>
                      <label className="flex gap-2 text-sm"><input type="checkbox" checked={editQuote} onChange={e=>setEditQuote(e.target.checked)} />This is a quote</label>
                      {editQuote && <label className="flex gap-2 text-sm"><input type="checkbox" checked={editPublic} onChange={e=>setEditPublic(e.target.checked)} />Share this quote publicly</label>}
                      <textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 focus:ring-2 focus:ring-primary/20 focus:border-primary min-h-[80px] resize-none"
                        autoFocus
                      />
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          <BookOpen className="h-4 w-4 text-muted-foreground" />
                          <input
                            type="number"
                            value={editPage}
                            onChange={(e) => setEditPage(e.target.value)}
                            placeholder="Page"
                            className="w-20 px-2 py-1.5 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm"
                          />
                        </div>
                        <div className="flex-1" />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingId(null)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleUpdateNote(note.id)}
                          disabled={isSaving}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
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
                            {showBookInfo && note.book && (
                              <span className="truncate">
                                from <span className="font-medium">{note.book.title}</span>
                              </span>
                            )}
                          </div>
                        </div>
                        
                        {isAuthenticated && (
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => startEditing(note)}
                              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-muted-foreground hover:text-foreground transition-colors"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteNote(note.id)}
                              className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-muted-foreground hover:text-red-600 transition-colors"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
