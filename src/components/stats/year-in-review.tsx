'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ProgressRing } from './progress-ring';
import { 
  BookOpen, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  Star,
  Calendar,
  Clock,
  Award,
  Sparkles
} from 'lucide-react';

interface YearlyStats {
  year: number;
  booksFinished: number;
  booksStarted: number;
  averageRating: number | null;
  totalRated: number;
  byCategory: {
    fiction: number;
    nonFiction: number;
  };
  byMonth: Array<{
    month: number;
    year: number;
    booksFinished: number;
    booksStarted: number;
  }>;
  topSubCategories: Array<{ name: string; count: number }>;
  averageDaysToFinish: number | null;
}

interface ReadingVelocity {
  currentYear: {
    booksPerMonth: number;
    totalBooks: number;
    monthsElapsed: number;
  };
  previousYear: {
    booksPerMonth: number;
    totalBooks: number;
  } | null;
  trend: 'up' | 'down' | 'same' | 'no_data';
  trendPercentage: number | null;
}

interface GoalProgress {
  year: number;
  target: number;
  current: number;
  percentage: number;
  onTrack: boolean;
  projectedTotal: number;
  booksNeededPerMonth: number;
}

interface StatsData {
  yearlyStats: YearlyStats;
  velocity: ReadingVelocity;
  goalProgress: GoalProgress | null;
  error?: string;
}

interface YearInReviewProps {
  year: number;
}

const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function YearInReview({ year }: YearInReviewProps) {
  const [data, setData] = useState<StatsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const response = await fetch(`/api/stats?year=${year}`);
        const json = await response.json();
        setData(json);
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchStats();
  }, [year]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <span className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!data || !data.yearlyStats || !data.velocity) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        {data?.error ? `Error: ${data.error}` : 'Failed to load stats'}
      </div>
    );
  }

  const { yearlyStats, velocity, goalProgress } = data;
  const TrendIcon = velocity?.trend === 'up' ? TrendingUp : velocity?.trend === 'down' ? TrendingDown : Minus;
  const trendColor = velocity?.trend === 'up' ? 'text-green-500' : velocity?.trend === 'down' ? 'text-red-500' : 'text-gray-500';

  // Find best month
  const byMonth = yearlyStats.byMonth || [];
  const bestMonth = [...byMonth].sort((a, b) => b.booksFinished - a.booksFinished)[0];
  const maxMonthlyBooks = bestMonth?.booksFinished || 0;

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Books Finished */}
        <Card className="border-0 shadow-lg dark:bg-gray-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Books Finished</p>
                <p className="text-4xl font-bold mt-1">{yearlyStats.booksFinished}</p>
              </div>
              <div className="p-3 bg-primary/10 rounded-xl">
                <BookOpen className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Reading Velocity */}
        <Card className="border-0 shadow-lg dark:bg-gray-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Books per Month</p>
                <p className="text-4xl font-bold mt-1">{velocity.currentYear.booksPerMonth}</p>
                {velocity.trendPercentage !== null && (
                  <p className={`text-xs mt-1 flex items-center gap-1 ${trendColor}`}>
                    <TrendIcon className="h-3 w-3" />
                    {velocity.trendPercentage > 0 ? '+' : ''}{velocity.trendPercentage}% vs last year
                  </p>
                )}
              </div>
              <div className={`p-3 rounded-xl ${velocity.trend === 'up' ? 'bg-green-100 dark:bg-green-900' : velocity.trend === 'down' ? 'bg-red-100 dark:bg-red-900' : 'bg-gray-100 dark:bg-gray-700'}`}>
                <TrendIcon className={`h-6 w-6 ${trendColor}`} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Average Rating */}
        <Card className="border-0 shadow-lg dark:bg-gray-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Average Rating</p>
                <p className="text-4xl font-bold mt-1">
                  {yearlyStats.averageRating ? yearlyStats.averageRating.toFixed(1) : '—'}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {yearlyStats.totalRated} books rated
                </p>
              </div>
              <div className="p-3 bg-yellow-100 dark:bg-yellow-900 rounded-xl">
                <Star className="h-6 w-6 text-yellow-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Days to Finish */}
        <Card className="border-0 shadow-lg dark:bg-gray-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg. Days to Finish</p>
                <p className="text-4xl font-bold mt-1">
                  {yearlyStats.averageDaysToFinish ?? '—'}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  days per book
                </p>
              </div>
              <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-xl">
                <Clock className="h-6 w-6 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Goal Progress (if set) */}
      {goalProgress && (
        <Card className="border-0 shadow-lg dark:bg-gray-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-primary" />
              {year} Reading Goal
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-8">
              <ProgressRing progress={goalProgress.percentage} size={120} strokeWidth={10}>
                <div className="text-center">
                  <span className="text-3xl font-bold">{goalProgress.percentage}%</span>
                </div>
              </ProgressRing>
              <div className="flex-1 space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="font-medium">{goalProgress.current} / {goalProgress.target} books</span>
                  </div>
                  <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all"
                      style={{ width: `${Math.min(goalProgress.percentage, 100)}%` }}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Projected Total</p>
                    <p className={`font-semibold ${goalProgress.onTrack ? 'text-green-500' : 'text-amber-500'}`}>
                      {goalProgress.projectedTotal} books
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">To Reach Goal</p>
                    <p className="font-semibold">
                      {goalProgress.booksNeededPerMonth} books/month
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Monthly Breakdown */}
      <Card className="border-0 shadow-lg dark:bg-gray-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Monthly Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-2 h-40">
            {byMonth.map((month) => {
              const height = maxMonthlyBooks > 0 ? (month.booksFinished / maxMonthlyBooks) * 100 : 0;
              const isBestMonth = month.booksFinished === maxMonthlyBooks && maxMonthlyBooks > 0;
              
              return (
                <div key={month.month} className="flex-1 flex flex-col items-center gap-1">
                  <div className="relative w-full flex justify-center">
                    {isBestMonth && month.booksFinished > 0 && (
                      <Sparkles className="h-4 w-4 text-yellow-500 absolute -top-5" />
                    )}
                    <div 
                      className={`w-full max-w-8 rounded-t-lg transition-all ${
                        month.booksFinished > 0 
                          ? 'bg-gradient-to-t from-primary to-accent' 
                          : 'bg-gray-200 dark:bg-gray-700'
                      }`}
                      style={{ height: `${Math.max(height, 4)}%` }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground">{monthNames[month.month - 1]}</span>
                  <span className="text-xs font-medium">{month.booksFinished}</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Category & Genre Breakdown */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Fiction vs Non-Fiction */}
        <Card className="border-0 shadow-lg dark:bg-gray-800">
          <CardHeader>
            <CardTitle>Category Split</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6">
              <div className="relative w-24 h-24">
                <svg viewBox="0 0 36 36" className="w-24 h-24 -rotate-90">
                  <circle
                    cx="18"
                    cy="18"
                    r="16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    className="text-emerald-200 dark:text-emerald-800"
                  />
                  <circle
                    cx="18"
                    cy="18"
                    r="16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeDasharray={`${(yearlyStats.byCategory.fiction / (yearlyStats.booksFinished || 1)) * 100} 100`}
                    className="text-violet-500"
                  />
                </svg>
              </div>
              <div className="flex-1 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-violet-500" />
                    <span>Fiction</span>
                  </div>
                  <span className="font-semibold">{yearlyStats.byCategory.fiction}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-emerald-500" />
                    <span>Non-Fiction</span>
                  </div>
                  <span className="font-semibold">{yearlyStats.byCategory.nonFiction}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Top Genres */}
        <Card className="border-0 shadow-lg dark:bg-gray-800">
          <CardHeader>
            <CardTitle>Top Genres</CardTitle>
          </CardHeader>
          <CardContent>
            {yearlyStats.topSubCategories.length > 0 ? (
              <div className="space-y-3">
                {yearlyStats.topSubCategories.map((cat, index) => (
                  <div key={cat.name} className="flex items-center gap-3">
                    <span className="text-lg font-bold text-muted-foreground w-6">
                      #{index + 1}
                    </span>
                    <div className="flex-1">
                      <div className="flex justify-between mb-1">
                        <span className="font-medium">{cat.name}</span>
                        <span className="text-muted-foreground">{cat.count} books</span>
                      </div>
                      <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-primary to-accent rounded-full"
                          style={{ width: `${(cat.count / (yearlyStats.topSubCategories[0]?.count || 1)) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-4">
                No genre data available yet
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Year Comparison */}
      {velocity.previousYear && (
        <Card className="border-0 shadow-lg dark:bg-gray-800">
          <CardHeader>
            <CardTitle>Year over Year</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-8">
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-2">{year - 1}</p>
                <p className="text-4xl font-bold text-muted-foreground">{velocity.previousYear.totalBooks}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {velocity.previousYear.booksPerMonth} books/month
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-2">{year}</p>
                <p className="text-4xl font-bold text-primary">{velocity.currentYear.totalBooks}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {velocity.currentYear.booksPerMonth} books/month
                </p>
              </div>
            </div>
            <div className="mt-4 text-center">
              <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${
                velocity.trend === 'up' 
                  ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                  : velocity.trend === 'down'
                  ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
                  : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
              }`}>
                <TrendIcon className="h-4 w-4" />
                {velocity.trendPercentage !== null && (
                  <span>{velocity.trendPercentage > 0 ? '+' : ''}{velocity.trendPercentage}%</span>
                )}
                {velocity.trend === 'same' && <span>Same pace</span>}
              </span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
