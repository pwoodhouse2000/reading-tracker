'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/components/auth/auth-provider';
import { Minus, Plus, Save, X } from 'lucide-react';

interface PageProgressProps {
  bookId: string;
  currentPage: number | null;
  totalPages: number | null;
}

export function PageProgress({ bookId, currentPage, totalPages }: PageProgressProps) {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const [page, setPage] = useState<number | ''>(currentPage ?? '');
  const [total, setTotal] = useState<number | ''>(totalPages ?? '');
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const percent =
    currentPage && totalPages && totalPages > 0
      ? Math.min(100, Math.round((currentPage / totalPages) * 100))
      : null;

  const adjustPage = (delta: number) => {
    setPage((prev) => {
      const next = (typeof prev === 'number' ? prev : 0) + delta;
      return Math.max(0, next);
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch(`/api/books/${bookId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPage: page === '' ? null : page,
          totalPages: total === '' ? null : total,
        }),
      });

      if (response.ok) {
        setIsEditing(false);
        router.refresh();
      }
    } catch (error) {
      console.error('Failed to update page progress:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleClear = async () => {
    setIsSaving(true);
    try {
      const response = await fetch(`/api/books/${bookId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPage: null }),
      });

      if (response.ok) {
        setPage('');
        setIsEditing(false);
        router.refresh();
      }
    } catch (error) {
      console.error('Failed to clear page progress:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Progress display */}
      {currentPage ? (
        <div className="space-y-2">
          <div className="flex items-baseline justify-between">
            <p className="text-2xl font-bold text-foreground">
              p. {currentPage}
              {totalPages ? (
                <span className="text-lg font-normal text-muted-foreground"> of {totalPages}</span>
              ) : null}
            </p>
            {percent !== null && (
              <p className="text-sm font-medium text-primary">{percent}%</p>
            )}
          </div>
          {percent !== null && (
            <div className="h-2.5 w-full rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all duration-500"
                style={{ width: `${percent}%` }}
              />
            </div>
          )}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          {totalPages ? `${totalPages} pages` : 'No page progress yet'}
        </p>
      )}

      {/* Quick update (admin only) */}
      {isAuthenticated && !isEditing && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setIsEditing(true)}
          className="w-full border-2 rounded-xl"
        >
          Update progress
        </Button>
      )}

      {isAuthenticated && isEditing && (
        <div className="space-y-4">
          {/* +/- quick buttons - thumb friendly */}
          <div className="grid grid-cols-4 gap-2">
            <Button type="button" variant="outline" onClick={() => adjustPage(-10)} className="rounded-xl border-2">
              -10
            </Button>
            <Button type="button" variant="outline" onClick={() => adjustPage(-1)} className="rounded-xl border-2">
              <Minus className="h-4 w-4" />
            </Button>
            <Button type="button" variant="outline" onClick={() => adjustPage(1)} className="rounded-xl border-2">
              <Plus className="h-4 w-4" />
            </Button>
            <Button type="button" variant="outline" onClick={() => adjustPage(10)} className="rounded-xl border-2">
              +10
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-muted-foreground mb-1">On page</label>
              <input
                type="number"
                inputMode="numeric"
                min="0"
                value={page}
                onChange={(e) =>
                  setPage(e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value) || 0))
                }
                placeholder="0"
                className="w-full px-4 py-3 border-2 border-input rounded-xl focus:border-primary focus:ring-0 transition-all bg-background text-foreground text-center text-lg font-semibold"
              />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Total pages</label>
              <input
                type="number"
                inputMode="numeric"
                min="1"
                value={total}
                onChange={(e) =>
                  setTotal(e.target.value === '' ? '' : Math.max(1, parseInt(e.target.value) || 1))
                }
                placeholder="?"
                className="w-full px-4 py-3 border-2 border-input rounded-xl focus:border-primary focus:ring-0 transition-all bg-background text-foreground text-center text-lg font-semibold"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="flex-1 rounded-xl shadow-lg shadow-primary/25"
            >
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
            {currentPage !== null && (
              <Button
                type="button"
                variant="outline"
                onClick={handleClear}
                disabled={isSaving}
                className="rounded-xl border-2"
              >
                Clear
              </Button>
            )}
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setPage(currentPage ?? '');
                setTotal(totalPages ?? '');
                setIsEditing(false);
              }}
              disabled={isSaving}
              className="rounded-xl"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
