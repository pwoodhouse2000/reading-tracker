'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Sparkles, 
  RefreshCw, 
  BookOpen, 
  ThumbsUp,
  AlertCircle,
  ExternalLink
} from 'lucide-react';

interface Recommendation {
  title: string;
  author: string;
  reason: string;
  confidence: 'high' | 'medium';
}

interface RecommendationsData {
  recommendations: Recommendation[];
  context: {
    booksAnalyzed: number;
    favoriteAuthors: string[];
    favoriteGenres: string[];
  };
}

export function AIRecommendations() {
  const [data, setData] = useState<RecommendationsData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);

  const fetchRecommendations = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/ai/recommendations');
      const json = await response.json();

      if (!response.ok) {
        throw new Error(json.error || 'Failed to get recommendations');
      }

      setData(json);
      setHasLoaded(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  const searchBook = (title: string, author: string) => {
    const query = encodeURIComponent(`${title} ${author}`);
    window.open(`https://www.goodreads.com/search?q=${query}`, '_blank');
  };

  // Initial state - show button to load
  if (!hasLoaded && !isLoading) {
    return (
      <Card className="shadow-xl bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 border-amber-200 dark:border-amber-900">
        <CardContent className="p-6">
          <div className="text-center space-y-4">
            <div className="inline-flex p-4 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl text-white shadow-lg">
              <Sparkles className="h-8 w-8" />
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-2 text-foreground">AI Book Recommendations</h3>
              <p className="text-muted-foreground mb-4">
                Get personalized book suggestions based on your reading history and preferences
              </p>
            </div>
            <Button 
              onClick={fetchRecommendations}
              className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Get Recommendations
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <Card className="border-0 shadow-xl">
        <CardContent className="p-6">
          <div className="flex items-center justify-center gap-3 py-8">
            <RefreshCw className="h-5 w-5 animate-spin text-amber-500" />
            <span className="text-muted-foreground">Analyzing your reading history...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error) {
    const isQuotaError = error.includes('quota') || error.includes('usage limit');
    const isKeyError = error.includes('Invalid API key');
    
    return (
      <Card className="shadow-xl border-red-200 dark:border-red-900/50">
        <CardContent className="p-6">
          <div className="flex items-start gap-3 text-red-600 dark:text-red-400">
            <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium">
                {isQuotaError ? 'OpenAI Quota Exceeded' : 
                 isKeyError ? 'Invalid API Key' : 
                 "Couldn't get recommendations"}
              </p>
              <p className="text-sm mt-1 opacity-80">{error}</p>
              {isQuotaError && (
                <a 
                  href="https://platform.openai.com/settings/organization/billing/overview"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm mt-2 text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Check OpenAI Billing →
                </a>
              )}
              {!isQuotaError && !isKeyError && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={fetchRecommendations}
                  className="mt-3"
                >
                  Try Again
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Results
  return (
    <Card className="shadow-xl">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-amber-500" />
            AI Recommendations
          </CardTitle>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={fetchRecommendations}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
        {data?.context && (
          <p className="text-sm text-muted-foreground">
            Based on {data.context.booksAnalyzed} books you've read
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {data?.recommendations.map((rec, index) => (
          <div 
            key={index}
            className="p-4 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors border border-border"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <BookOpen className="h-4 w-4 text-amber-500" />
                  <h4 className="font-semibold text-foreground">{rec.title}</h4>
                  {rec.confidence === 'high' && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-xs">
                      <ThumbsUp className="h-3 w-3" />
                      Great match
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mb-2">by {rec.author}</p>
                <p className="text-sm text-foreground">{rec.reason}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => searchBook(rec.title, rec.author)}
                className="flex-shrink-0"
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}

        {data?.context.favoriteAuthors && data.context.favoriteAuthors.length > 0 && (
          <div className="pt-4 border-t border-border">
            <p className="text-xs text-muted-foreground">
              <span className="font-medium">Your favorite authors:</span>{' '}
              {data.context.favoriteAuthors.join(', ')}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
