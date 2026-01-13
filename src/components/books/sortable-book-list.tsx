'use client';

import { useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { BookCard } from './book-card';
import { GripVertical } from 'lucide-react';
import { useAuth } from '@/components/auth/auth-provider';

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
  priority: number | null;
}

interface SortableBookItemProps {
  book: Book;
  compact: boolean;
  isDraggable: boolean;
}

function SortableBookItem({ book, compact, isDraggable }: SortableBookItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: book.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : 'auto',
  };

  if (!isDraggable) {
    return <BookCard book={book} compact={compact} />;
  }

  return (
    <div ref={setNodeRef} style={style} className="relative group/drag">
      {/* Drag Handle */}
      <div
        {...attributes}
        {...listeners}
        className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-full pr-2 cursor-grab active:cursor-grabbing opacity-0 group-hover/drag:opacity-100 transition-opacity z-10"
      >
        <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg p-1.5 border border-gray-200 dark:border-gray-700">
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>
      <BookCard book={book} compact={compact} />
    </div>
  );
}

interface SortableBookListProps {
  books: Book[];
  compact?: boolean;
  onReorder?: (books: Book[]) => void;
}

export function SortableBookList({ books, compact = false, onReorder }: SortableBookListProps) {
  const { isAuthenticated } = useAuth();
  const [items, setItems] = useState(books);
  const [isSaving, setIsSaving] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = items.findIndex((item) => item.id === active.id);
      const newIndex = items.findIndex((item) => item.id === over.id);

      const newItems = arrayMove(items, oldIndex, newIndex);
      setItems(newItems);

      if (onReorder) {
        onReorder(newItems);
      }

      // Save new priorities to the server
      setIsSaving(true);
      try {
        const updates = newItems.map((book, index) => ({
          id: book.id,
          priority: index + 1,
        }));

        await fetch('/api/books/reorder', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ updates }),
        });
      } catch (error) {
        console.error('Failed to save new order:', error);
      } finally {
        setIsSaving(false);
      }
    }
  };

  // Only enable drag for authenticated users
  if (!isAuthenticated) {
    return (
      <div className={
        compact
          ? 'space-y-3'
          : 'grid gap-6 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6'
      }>
        {items.map((book) => (
          <BookCard key={book.id} book={book} compact={compact} />
        ))}
      </div>
    );
  }

  return (
    <div className="relative">
      {isSaving && (
        <div className="absolute -top-8 right-0 text-sm text-muted-foreground flex items-center gap-2">
          <span className="w-3 h-3 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          Saving order...
        </div>
      )}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={items.map((b) => b.id)}
          strategy={compact ? verticalListSortingStrategy : rectSortingStrategy}
        >
          <div className={
            compact
              ? 'space-y-3 pl-8'
              : 'grid gap-6 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 pl-8'
          }>
            {items.map((book) => (
              <SortableBookItem
                key={book.id}
                book={book}
                compact={compact}
                isDraggable={true}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}
