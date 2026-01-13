'use client';

import { AIRecommendations } from '@/components/ai/recommendations';
import { Sparkles, BookOpen, TrendingUp } from 'lucide-react';

export default function DiscoverPage() {
  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="inline-flex p-4 bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30 rounded-2xl">
          <Sparkles className="h-8 w-8 text-amber-600 dark:text-amber-400" />
        </div>
        <h1 className="text-4xl font-bold">Discover Your Next Read</h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          AI-powered book recommendations based on your reading history, ratings, and preferences
        </p>
      </div>

      {/* How it works */}
      <div className="grid md:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-white/60 dark:bg-gray-800/60 backdrop-blur text-center">
          <div className="inline-flex p-2 bg-violet-100 dark:bg-violet-900/30 rounded-lg mb-3">
            <BookOpen className="h-5 w-5 text-violet-600 dark:text-violet-400" />
          </div>
          <h3 className="font-semibold mb-1">Analyzes Your Books</h3>
          <p className="text-sm text-muted-foreground">
            Reviews your reading history and highly-rated books
          </p>
        </div>
        <div className="p-4 rounded-xl bg-white/60 dark:bg-gray-800/60 backdrop-blur text-center">
          <div className="inline-flex p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg mb-3">
            <TrendingUp className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          </div>
          <h3 className="font-semibold mb-1">Finds Patterns</h3>
          <p className="text-sm text-muted-foreground">
            Identifies your favorite authors, genres, and themes
          </p>
        </div>
        <div className="p-4 rounded-xl bg-white/60 dark:bg-gray-800/60 backdrop-blur text-center">
          <div className="inline-flex p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg mb-3">
            <Sparkles className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h3 className="font-semibold mb-1">Suggests Books</h3>
          <p className="text-sm text-muted-foreground">
            Recommends similar books you'll likely enjoy
          </p>
        </div>
      </div>

      {/* Recommendations Component */}
      <AIRecommendations />

      {/* Tips */}
      <div className="p-6 rounded-2xl bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-950/30 dark:to-purple-950/30 border border-violet-200/50 dark:border-violet-800/50">
        <h3 className="font-semibold mb-2 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-violet-500" />
          Pro Tips for Better Recommendations
        </h3>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>• Rate your finished books to help the AI understand your preferences</li>
          <li>• The more books you track, the better the recommendations become</li>
          <li>• Add sub-categories to your books for more genre-specific suggestions</li>
        </ul>
      </div>
    </div>
  );
}
