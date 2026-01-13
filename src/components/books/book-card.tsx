'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { StatusBadge } from './status-badge';
import { RatingStars } from './rating-stars';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/components/auth/auth-provider';
import { BookOpen, Headphones, Tablet, ChevronDown, Check } from 'lucide-react';
import { parseMediaTypes } from '@/lib/constants';

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
}

interface BookCardProps {
  book: Book;
  compact?: boolean;
  onStatusChange?: (bookId: string, newStatus: Book['status']) => void;
}

const mediaTypeIcons: Record<string, any> = {
  PAPER: BookOpen,
  AUDIOBOOK: Headphones,
  EBOOK: Tablet,
};

const statusOptions: { value: Book['status']; label: string }[] = [
  { value: 'TO_READ', label: 'To Read' },
  { value: 'NEXT_UP', label: 'Next Up' },
  { value: 'READING', label: 'Reading' },
  { value: 'PAUSED', label: 'Paused' },
  { value: 'FINISHED', label: 'Finished' },
];

function getTitleGradient(title: string): string {
  const gradients = [
    'from-amber-600 via-orange-700 to-red-800',
    'from-emerald-600 via-teal-700 to-cyan-800',
    'from-violet-600 via-purple-700 to-indigo-800',
    'from-rose-600 via-pink-700 to-fuchsia-800',
    'from-sky-600 via-blue-700 to-indigo-800',
    'from-lime-600 via-green-700 to-emerald-800',
    'from-orange-600 via-amber-700 to-yellow-800',
    'from-cyan-600 via-sky-700 to-blue-800',
  ];
  const hash = title.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return gradients[hash % gradients.length];
}

export function BookCard({ book, compact = false, onStatusChange }: BookCardProps) {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const mediaTypesArray = parseMediaTypes(book.mediaTypes);

  const handleBadgeClick = (e: React.MouseEvent, filter: string) => {
    e.preventDefault();
    e.stopPropagation();
    router.push(`/books?${filter}`);
  };

  const handleStatusClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isAuthenticated) {
      setShowStatusMenu(!showStatusMenu);
    } else {
      router.push(`/books?status=${book.status}`);
    }
  };

  const handleStatusChange = async (e: React.MouseEvent, newStatus: Book['status']) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (newStatus === book.status) {
      setShowStatusMenu(false);
      return;
    }

    setIsUpdating(true);
    try {
      const response = await fetch(`/api/books/${book.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        if (onStatusChange) {
          onStatusChange(book.id, newStatus);
        }
        router.refresh();
      }
    } catch (error) {
      console.error('Failed to update status:', error);
    } finally {
      setIsUpdating(false);
      setShowStatusMenu(false);
    }
  };

  // Status dropdown component
  const StatusDropdown = ({ position = 'bottom' }: { position?: 'bottom' | 'top' }) => (
    <div 
      className={`absolute ${position === 'top' ? 'bottom-full mb-1' : 'top-full mt-1'} right-0 z-50 min-w-[140px] py-1 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700`}
      onClick={(e) => e.stopPropagation()}
    >
      {statusOptions.map((option) => (
        <button
          key={option.value}
          onClick={(e) => handleStatusChange(e, option.value)}
          disabled={isUpdating}
          className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors ${
            book.status === option.value
              ? 'text-primary bg-primary/10'
              : 'text-muted-foreground hover:text-foreground hover:bg-gray-100 dark:hover:bg-gray-700'
          }`}
        >
          {book.status === option.value && <Check className="h-3 w-3" />}
          <span className={book.status === option.value ? '' : 'ml-5'}>{option.label}</span>
        </button>
      ))}
    </div>
  );

  if (compact) {
    return (
      <Link href={`/books/${book.id}`}>
        <Card className="group overflow-hidden transition-all hover:shadow-lg hover:scale-[1.01] cursor-pointer border-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur">
          <CardContent className="p-0">
            <div className="flex items-center gap-4 p-4">
              <div className="relative w-12 h-16 flex-shrink-0 rounded-md overflow-hidden shadow-md">
                {book.coverImageUrl ? (
                  <Image
                    src={book.coverImageUrl}
                    alt={book.title}
                    fill
                    className="object-cover"
                    sizes="48px"
                  />
                ) : (
                  <div className={`absolute inset-0 bg-gradient-to-br ${getTitleGradient(book.title)} flex items-center justify-center`}>
                    <span className="text-white/90 text-xs font-bold px-1 text-center line-clamp-2">
                      {book.title.substring(0, 10)}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm line-clamp-1 group-hover:text-primary transition-colors">
                  {book.title}
                </h3>
                <p className="text-sm text-muted-foreground line-clamp-1">
                  {book.author}
                </p>
              </div>

              <div className="flex items-center gap-3 flex-shrink-0">
                {book.rating && <RatingStars rating={book.rating} readonly size="sm" />}
                <div className="flex items-center gap-1">
                  {mediaTypesArray.map((mt) => {
                    const Icon = mediaTypeIcons[mt];
                    return Icon ? <Icon key={mt} className="h-4 w-4 text-muted-foreground" /> : null;
                  })}
                </div>
                <div className="relative">
                  <button
                    onClick={handleStatusClick}
                    className={`flex items-center gap-1 ${isAuthenticated ? 'hover:scale-105' : ''} transition-transform`}
                  >
                    <StatusBadge status={book.status} />
                    {isAuthenticated && <ChevronDown className="h-3 w-3 text-muted-foreground" />}
                  </button>
                  {showStatusMenu && <StatusDropdown position="top" />}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </Link>
    );
  }

  return (
    <Link href={`/books/${book.id}`}>
      <Card className="group h-full overflow-hidden transition-all hover:shadow-2xl hover:scale-[1.03] cursor-pointer border-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur">
        <CardContent className="p-0">
          <div className="relative">
            <div className="relative aspect-[2/3] w-full overflow-hidden">
              {book.coverImageUrl ? (
                <>
                  <Image
                    src={book.coverImageUrl}
                    alt={book.title}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-110"
                    sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 20vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </>
              ) : (
                <div className={`absolute inset-0 bg-gradient-to-br ${getTitleGradient(book.title)} flex items-center justify-center p-6`}>
                  <div className="text-center">
                    <p className="font-serif text-lg font-semibold text-white/95 line-clamp-4 drop-shadow-lg">
                      {book.title}
                    </p>
                    <p className="text-sm text-white/70 mt-2 line-clamp-1">
                      {book.author}
                    </p>
                  </div>
                </div>
              )}
              
              {/* Status Badge with Quick Update */}
              <div className="absolute top-3 right-3 z-10 relative">
                <button 
                  onClick={handleStatusClick}
                  className={`flex items-center gap-1 ${isAuthenticated ? 'hover:scale-105' : ''} transition-transform`}
                >
                  <StatusBadge status={book.status} />
                  {isAuthenticated && (
                    <div className="bg-black/50 backdrop-blur-sm rounded-full p-0.5">
                      <ChevronDown className="h-3 w-3 text-white" />
                    </div>
                  )}
                </button>
                {showStatusMenu && <StatusDropdown />}
              </div>

              <div className="absolute bottom-3 left-3 z-10 flex gap-1">
                {mediaTypesArray.map((mt) => {
                  const Icon = mediaTypeIcons[mt];
                  return Icon ? (
                    <div key={mt} className="bg-black/50 backdrop-blur-sm text-white p-1.5 rounded-lg">
                      <Icon className="h-4 w-4" />
                    </div>
                  ) : null;
                })}
              </div>

              {book.rating && (
                <div className="absolute bottom-3 right-3 z-10">
                  <div className="bg-black/50 backdrop-blur-sm px-2 py-1 rounded-lg flex items-center gap-1">
                    <span className="text-yellow-400 text-sm">★</span>
                    <span className="text-white text-sm font-medium">{book.rating}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 space-y-2">
              <h3 className="font-semibold text-base line-clamp-2 leading-tight group-hover:text-primary transition-colors">
                {book.title}
              </h3>
              <p className="text-sm text-muted-foreground line-clamp-1">
                {book.author}
              </p>

              <div className="flex flex-wrap gap-1.5 pt-1">
                <button
                  onClick={(e) => handleBadgeClick(e, `category=${book.category}`)}
                  className="hover:scale-105 transition-transform"
                >
                  <Badge 
                    variant="outline" 
                    className={`text-xs cursor-pointer ${
                      book.category === 'FICTION' 
                        ? 'border-violet-300 text-violet-700 bg-violet-50 hover:bg-violet-100 dark:border-violet-700 dark:text-violet-300 dark:bg-violet-950 dark:hover:bg-violet-900' 
                        : 'border-emerald-300 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 dark:border-emerald-700 dark:text-emerald-300 dark:bg-emerald-950 dark:hover:bg-emerald-900'
                    }`}
                  >
                    {book.category === 'FICTION' ? 'Fiction' : 'Non-Fiction'}
                  </Badge>
                </button>

                {book.subCategory && (
                  <button
                    onClick={(e) => handleBadgeClick(e, `subCategory=${encodeURIComponent(book.subCategory!)}`)}
                    className="hover:scale-105 transition-transform"
                  >
                    <Badge 
                      variant="outline" 
                      className="text-xs cursor-pointer border-gray-300 text-gray-600 bg-gray-50 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-300 dark:bg-gray-800 dark:hover:bg-gray-700"
                    >
                      {book.subCategory}
                    </Badge>
                  </button>
                )}
              </div>

              {book.summary && (
                <p className="text-xs text-muted-foreground line-clamp-2 pt-1 leading-relaxed">
                  {book.summary}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
