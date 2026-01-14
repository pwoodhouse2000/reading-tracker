'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RatingStars } from '@/components/books/rating-stars';
import { StatusBadge } from '@/components/books/status-badge';
import { 
  ArrowLeft, 
  ExternalLink, 
  BookOpen, 
  Star,
  Quote,
  Calendar,
  Search,
  Headphones,
  Newspaper,
  ShoppingBag,
  Globe,
  Play,
  Clock,
  Mic
} from 'lucide-react';

interface AuthorData {
  name: string;
  bio?: string;
  photoUrl?: string;
  birthDate?: string;
  deathDate?: string;
  alternateNames?: string[];
  topSubjects?: string[];
  wikipedia?: {
    url: string;
    extract: string;
  };
  otherWorks: Array<{
    title: string;
    firstPublishYear?: number;
    coverUrl?: string;
  }>;
  userBooks: Array<{
    id: string;
    title: string;
    status: string;
    rating: number | null;
    dateFinished: string | null;
    coverImageUrl: string | null;
    thoughts: string | null;
  }>;
  userStats: {
    totalBooks: number;
    booksFinished: number;
    averageRating: number | null;
  };
  userNotes: Array<{
    id: string;
    content: string;
    page: number | null;
    bookTitle: string;
    bookId: string;
  }>;
  externalLinks: {
    goodreads: string;
    amazon: string;
    google: string;
    googleBooks: string;
    interviews: string;
    podcasts: string;
  };
  podcasts: {
    episodes: Array<{
      id: string;
      title: string;
      description: string;
      podcastTitle: string;
      podcastImage: string;
      audioUrl: string;
      listennotesUrl: string;
      publishDate: string;
      durationSeconds: number;
    }>;
    totalFound: number;
    enabled: boolean;
  };
}

interface PageProps {
  params: Promise<{ name: string }>;
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes} min`;
}

export default function AuthorPage({ params }: PageProps) {
  const { name } = use(params);
  const authorName = decodeURIComponent(name);
  
  const [data, setData] = useState<AuthorData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAuthor() {
      try {
        const response = await fetch(`/api/authors/${encodeURIComponent(authorName)}`);
        if (!response.ok) throw new Error('Failed to fetch author data');
        const json = await response.json();
        setData(json);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong');
      } finally {
        setIsLoading(false);
      }
    }
    fetchAuthor();
  }, [authorName]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <span className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin inline-block" />
          <p className="mt-4 text-muted-foreground">Loading author info...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-4xl mx-auto">
        <Link href="/books">
          <Button variant="ghost" className="gap-2 mb-6">
            <ArrowLeft className="h-4 w-4" />
            Back to Library
          </Button>
        </Link>
        <Card className="border-red-200 dark:border-red-900">
          <CardContent className="py-12 text-center">
            <p className="text-red-600 dark:text-red-400">{error || 'Author not found'}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const bio = data.bio || data.wikipedia?.extract;

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Back Button */}
      <Link href="/books">
        <Button variant="ghost" className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to Library
        </Button>
      </Link>

      {/* Author Header */}
      <div className="grid lg:grid-cols-[200px_1fr] gap-8">
        {/* Photo */}
        <div className="space-y-4">
          <div className="relative aspect-square w-48 lg:w-full rounded-2xl overflow-hidden shadow-xl bg-gradient-to-br from-violet-500 to-purple-600">
            {data.photoUrl ? (
              <Image
                src={data.photoUrl}
                alt={data.name}
                fill
                className="object-cover"
                sizes="200px"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-6xl text-white/80 font-serif">
                  {data.name.charAt(0)}
                </span>
              </div>
            )}
          </div>

          {/* Quick Stats */}
          {data.userStats.totalBooks > 0 && (
            <Card className="border-0 shadow-lg dark:bg-gray-800">
              <CardContent className="p-4 space-y-3">
                <div className="text-center">
                  <p className="text-3xl font-bold text-primary">{data.userStats.totalBooks}</p>
                  <p className="text-sm text-muted-foreground">books in your library</p>
                </div>
                {data.userStats.averageRating && (
                  <div className="text-center pt-2 border-t border-gray-100 dark:border-gray-700">
                    <div className="flex items-center justify-center gap-1">
                      <Star className="h-5 w-5 text-yellow-400 fill-yellow-400" />
                      <span className="text-xl font-bold">{data.userStats.averageRating}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">your avg rating</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Info */}
        <div className="space-y-6">
          <div>
            <h1 className="text-4xl lg:text-5xl font-bold">{data.name}</h1>
            {(data.birthDate || data.deathDate) && (
              <p className="text-lg text-muted-foreground mt-2 flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                {data.birthDate || '?'} – {data.deathDate || 'present'}
              </p>
            )}
            {data.alternateNames && data.alternateNames.length > 0 && (
              <p className="text-sm text-muted-foreground mt-2">
                Also known as: {data.alternateNames.slice(0, 3).join(', ')}
              </p>
            )}
          </div>

          {/* Subjects/Topics */}
          {data.topSubjects && data.topSubjects.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {data.topSubjects.map((subject) => (
                <Badge 
                  key={subject} 
                  variant="outline"
                  className="bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950 dark:text-violet-300 dark:border-violet-800"
                >
                  {subject}
                </Badge>
              ))}
            </div>
          )}

          {/* Bio */}
          {bio && (
            <Card className="border-0 shadow-lg dark:bg-gray-800">
              <CardContent className="p-6">
                <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
                  {bio.length > 800 ? bio.substring(0, 800) + '...' : bio}
                </p>
                {data.wikipedia && (
                  <a 
                    href={data.wikipedia.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 mt-4 text-sm text-primary hover:underline"
                  >
                    Read more on Wikipedia
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </CardContent>
            </Card>
          )}

          {/* External Links */}
          <Card className="border-0 shadow-lg dark:bg-gray-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Globe className="h-4 w-4 text-primary" />
                Explore More
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                <a 
                  href={data.externalLinks.goodreads}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 p-3 rounded-lg bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                >
                  <BookOpen className="h-4 w-4 text-amber-600" />
                  <span className="text-sm">Goodreads</span>
                </a>
                <a 
                  href={data.externalLinks.amazon}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 p-3 rounded-lg bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                >
                  <ShoppingBag className="h-4 w-4 text-orange-500" />
                  <span className="text-sm">Amazon</span>
                </a>
                <a 
                  href={data.externalLinks.interviews}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 p-3 rounded-lg bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                >
                  <Newspaper className="h-4 w-4 text-blue-500" />
                  <span className="text-sm">Interviews</span>
                </a>
                <a 
                  href={data.externalLinks.podcasts}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 p-3 rounded-lg bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                >
                  <Headphones className="h-4 w-4 text-purple-500" />
                  <span className="text-sm">Podcasts</span>
                </a>
                <a 
                  href={data.externalLinks.googleBooks}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 p-3 rounded-lg bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                >
                  <Search className="h-4 w-4 text-green-500" />
                  <span className="text-sm">Google Books</span>
                </a>
                {data.wikipedia && (
                  <a 
                    href={data.wikipedia.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 p-3 rounded-lg bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                  >
                    <ExternalLink className="h-4 w-4 text-gray-500" />
                    <span className="text-sm">Wikipedia</span>
                  </a>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Your Books by This Author */}
      {data.userBooks.length > 0 && (
        <section>
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            Your Books by {data.name.split(' ').pop()}
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            {data.userBooks.map((book) => (
              <Link key={book.id} href={`/books/${book.id}`}>
                <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow dark:bg-gray-800 h-full">
                  <CardContent className="p-4 flex gap-4">
                    <div className="relative w-16 h-24 flex-shrink-0 rounded-lg overflow-hidden shadow-md">
                      {book.coverImageUrl ? (
                        <Image
                          src={book.coverImageUrl}
                          alt={book.title}
                          fill
                          className="object-cover"
                          sizes="64px"
                        />
                      ) : (
                        <div className="absolute inset-0 bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                          <BookOpen className="h-6 w-6 text-white/80" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold line-clamp-2">{book.title}</h3>
                      <div className="flex items-center gap-2 mt-2">
                        <StatusBadge status={book.status as any} />
                        {book.rating && (
                          <RatingStars rating={book.rating} readonly size="sm" />
                        )}
                      </div>
                      {book.thoughts && (
                        <p className="text-sm text-muted-foreground mt-2 line-clamp-2 italic">
                          "{book.thoughts}"
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Your Notes from This Author's Books */}
      {data.userNotes.length > 0 && (
        <section>
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
            <Quote className="h-5 w-5 text-primary" />
            Your Notes & Quotes
          </h2>
          <div className="space-y-3">
            {data.userNotes.map((note) => (
              <Link key={note.id} href={`/books/${note.bookId}`}>
                <Card className="border-0 shadow-lg dark:bg-gray-800 hover:shadow-xl transition-shadow">
                  <CardContent className="p-4">
                    <p>{note.content}</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      From <span className="font-medium">{note.bookTitle}</span>
                      {note.page && ` • Page ${note.page}`}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Podcast Episodes */}
      {data.podcasts.episodes.length > 0 && (
        <section>
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
            <Mic className="h-5 w-5 text-purple-500" />
            Podcast Appearances
            {data.podcasts.totalFound > data.podcasts.episodes.length && (
              <span className="text-sm font-normal text-muted-foreground">
                (showing {data.podcasts.episodes.length} of {data.podcasts.totalFound})
              </span>
            )}
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            {data.podcasts.episodes.map((episode) => (
              <a 
                key={episode.id}
                href={episode.listennotesUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block"
              >
                <Card className="border-0 shadow-lg dark:bg-gray-800 hover:shadow-xl transition-all hover:scale-[1.02] h-full">
                  <CardContent className="p-4 flex gap-4">
                    <div className="relative w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden shadow-md">
                      {episode.podcastImage ? (
                        <Image
                          src={episode.podcastImage}
                          alt={episode.podcastTitle}
                          fill
                          className="object-cover"
                          sizes="80px"
                        />
                      ) : (
                        <div className="absolute inset-0 bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center">
                          <Headphones className="h-8 w-8 text-white/80" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                        <Play className="h-8 w-8 text-white fill-white" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold line-clamp-2 text-sm">{episode.title}</h3>
                      <p className="text-xs text-muted-foreground mt-1">{episode.podcastTitle}</p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(episode.publishDate).toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDuration(episode.durationSeconds)}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                        {episode.description}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </a>
            ))}
          </div>
          {data.podcasts.totalFound > data.podcasts.episodes.length && (
            <div className="mt-4 text-center">
              <a
                href={data.externalLinks.podcasts}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
              >
                Search for more podcasts
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          )}
        </section>
      )}

      {/* Podcast search not enabled notice */}
      {!data.podcasts.enabled && (
        <Card className="border-0 shadow-lg dark:bg-gray-800">
          <CardContent className="p-6 text-center">
            <Headphones className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <h3 className="font-semibold mb-2">Podcast Search Available</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Find podcast interviews and appearances by {data.name.split(' ').pop()}
            </p>
            <a
              href={data.externalLinks.podcasts}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="outline" className="gap-2">
                <Search className="h-4 w-4" />
                Search Podcasts
              </Button>
            </a>
          </CardContent>
        </Card>
      )}

      {/* Other Works */}
      {data.otherWorks.length > 0 && (
        <section>
          <h2 className="text-2xl font-bold mb-4">Other Works by {data.name.split(' ').pop()}</h2>
          <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {data.otherWorks.map((work, index) => {
              // Check if user already has this book
              const userHasBook = data.userBooks.some(
                b => b.title.toLowerCase() === work.title.toLowerCase()
              );
              
              return (
                <div 
                  key={index} 
                  className={`relative group ${userHasBook ? 'opacity-50' : ''}`}
                  title={work.title}
                >
                  <div className="relative aspect-[2/3] rounded-lg overflow-hidden shadow-md bg-gray-100 dark:bg-gray-700">
                    {work.coverUrl ? (
                      <Image
                        src={work.coverUrl}
                        alt={work.title}
                        fill
                        className="object-cover"
                        sizes="120px"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center p-2">
                        <p className="text-xs text-center text-muted-foreground line-clamp-4">
                          {work.title}
                        </p>
                      </div>
                    )}
                    {userHasBook && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <Badge className="bg-green-500">In Library</Badge>
                      </div>
                    )}
                  </div>
                  <p className="text-xs mt-1 line-clamp-2 text-muted-foreground group-hover:text-foreground transition-colors">
                    {work.title}
                    {work.firstPublishYear && ` (${work.firstPublishYear})`}
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
