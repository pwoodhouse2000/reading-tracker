'use client';

import { useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { BookCard } from './book-card';
import { RatingStars } from './rating-stars';
import { useAuth } from '@/components/auth/auth-provider';
import { Check, Pencil, X } from 'lucide-react';

interface Book {
  id: string;
  title: string;
  author: string;
  status: 'TO_READ' | 'NEXT_UP' | 'READING' | 'PAUSED' | 'FINISHED' | 'DNF';
  mediaTypes: string;
  category: 'FICTION' | 'NON_FICTION';
  subCategory?: string | null;
  rating: number | null;
  coverImageUrl: string | null;
  summary: string | null;
  createdAt: Date | string;
  priority: number | null;
}

interface SwipeableBookCardProps {
  book: Book;
}

const SWIPE_THRESHOLD = 80;
const DIRECTION_LOCK_THRESHOLD = 10;
const MAX_OFFSET = 140;

// Next status when swiping right to advance one step
const nextStatus: Partial<Record<Book['status'], Book['status']>> = {
  TO_READ: 'NEXT_UP',
  NEXT_UP: 'READING',
  READING: 'FINISHED',
  PAUSED: 'READING',
};

function vibrate() {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate(10);
  }
}

export function SwipeableBookCard({ book }: SwipeableBookCardProps) {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const [offset, setOffset] = useState(0);
  const [error, setError] = useState('');
  const busy = useRef(false);
  const [isSwiping, setIsSwiping] = useState(false);
  const [showRatingPrompt, setShowRatingPrompt] = useState(false);
  const [currentRating, setCurrentRating] = useState(book.rating);
  const touchState = useRef<{
    startX: number;
    startY: number;
    direction: 'horizontal' | 'vertical' | null;
  } | null>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!isAuthenticated) return;
    const touch = e.touches[0];
    touchState.current = {
      startX: touch.clientX,
      startY: touch.clientY,
      direction: null,
    };
  }, [isAuthenticated]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const state = touchState.current;
    if (!state) return;

    const touch = e.touches[0];
    const dx = touch.clientX - state.startX;
    const dy = touch.clientY - state.startY;

    // Decide direction once movement is clear; vertical wins so scrolling still works
    if (!state.direction) {
      if (Math.abs(dx) < DIRECTION_LOCK_THRESHOLD && Math.abs(dy) < DIRECTION_LOCK_THRESHOLD) {
        return;
      }
      state.direction = Math.abs(dx) > Math.abs(dy) ? 'horizontal' : 'vertical';
      if (state.direction === 'horizontal') {
        setIsSwiping(true);
      }
    }

    if (state.direction !== 'horizontal') return;

    const clamped = Math.max(-MAX_OFFSET, Math.min(MAX_OFFSET, dx));
    setOffset(clamped);
  }, []);

  const advanceStatus = useCallback(async () => {
    const target = nextStatus[book.status];
    if (!target) return;
    if (busy.current) return;
    busy.current = true;
    setError('');

    try {
      const response = await fetch(`/api/books/${book.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: target }),
      });

      if (!response.ok) throw new Error('Could not save status. Please try again.');
      if (response.ok) {
        if (target === 'FINISHED') {
          setShowRatingPrompt(true);
        }
        router.refresh();
      }
    } catch (error) {
      console.error('Failed to advance status:', error);
      setError('Could not save status. Please try again.');
    } finally {
      busy.current = false;
    }
  }, [book.id, book.status, router]);

  const handleTouchEnd = useCallback(() => {
    const state = touchState.current;
    touchState.current = null;

    if (!state || state.direction !== 'horizontal') {
      setOffset(0);
      setIsSwiping(false);
      return;
    }

    if (offset >= SWIPE_THRESHOLD && nextStatus[book.status]) {
      vibrate();
      advanceStatus();
    } else if (offset <= -SWIPE_THRESHOLD) {
      vibrate();
      router.push(`/books/${book.id}#notes`);
    }

    setOffset(0);
    setIsSwiping(false);
  }, [offset, book.id, book.status, advanceStatus, router]);

  const handleRatingChange = useCallback(async (rating: number) => {
    setError('');
    try {
      const response = await fetch(`/api/books/${book.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating }),
      });
      if (!response.ok) throw new Error('Rating was not saved');
      setCurrentRating(rating);
      setShowRatingPrompt(false);
    } catch (error) {
      console.error('Failed to update rating:', error);
      setError('Rating was not saved. Please try again.');
    }
    router.refresh();
  }, [book.id, router]);

  // Not authenticated: no swipe behavior, just render the card
  if (!isAuthenticated) {
    return <BookCard book={book} compact />;
  }

  const canAdvance = !!nextStatus[book.status];
  const advanceProgress = canAdvance ? Math.min(1, offset / SWIPE_THRESHOLD) : 0;
  const noteProgress = Math.min(1, -offset / SWIPE_THRESHOLD);

  return (
    <div className="relative overflow-hidden rounded-xl">
      {error && <p role="alert" className="p-3 text-red-600">{error}</p>}
      {/* Swipe-right background: advance status */}
      {offset > 0 && (
        <div
          className="absolute inset-0 flex items-center pl-5 bg-green-500 rounded-xl"
          style={{ opacity: 0.4 + advanceProgress * 0.6 }}
        >
          <Check
            className={`h-6 w-6 text-white transition-transform ${
              advanceProgress >= 1 ? 'scale-125' : ''
            }`}
          />
          {advanceProgress >= 1 && (
            <span className="ml-2 text-sm font-semibold text-white">
              Advance to {nextStatus[book.status]?.replace('_', ' ')}
            </span>
          )}
        </div>
      )}

      {/* Swipe-left background: add note */}
      {offset < 0 && (
        <div
          className="absolute inset-0 flex items-center justify-end pr-5 bg-blue-500 rounded-xl"
          style={{ opacity: 0.4 + noteProgress * 0.6 }}
        >
          {noteProgress >= 1 && (
            <span className="mr-2 text-sm font-semibold text-white">Add Note</span>
          )}
          <Pencil
            className={`h-6 w-6 text-white transition-transform ${
              noteProgress >= 1 ? 'scale-125' : ''
            }`}
          />
        </div>
      )}

      {/* Foreground row */}
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={() => { touchState.current = null; setOffset(0); setIsSwiping(false); }}
        style={{
          transform: offset ? `translateX(${offset}px)` : undefined,
          transition: isSwiping ? 'none' : 'transform 0.2s ease-out',
        }}
      >
        <BookCard book={book} compact />
      </div>

      {/* Inline rating prompt after marking finished */}
      {showRatingPrompt && (
        <div className="mt-2 flex items-center justify-between gap-3 px-4 py-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-sm font-medium text-amber-900 dark:text-amber-100 whitespace-nowrap">
              Finished! Rate it:
            </span>
            <RatingStars rating={currentRating} onRatingChange={handleRatingChange} size="md" />
          </div>
          <button
            onClick={() => setShowRatingPrompt(false)}
            className="p-1 rounded-lg text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors"
            aria-label="Dismiss rating prompt"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
