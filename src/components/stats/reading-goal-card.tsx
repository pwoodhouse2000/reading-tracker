'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ProgressRing } from './progress-ring';
import { useAuth } from '@/components/auth/auth-provider';
import { Target, TrendingUp, TrendingDown, Minus, Settings, X, Check } from 'lucide-react';

interface GoalProgress {
  year: number;
  target: number;
  current: number;
  percentage: number;
  onTrack: boolean;
  projectedTotal: number;
  booksNeededPerMonth: number;
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

interface GoalData {
  goal: { year: number; targetBooks: number } | null;
  progress: GoalProgress | null;
}

export function ReadingGoalCard() {
  const { isAuthenticated } = useAuth();
  const [goalData, setGoalData] = useState<GoalData | null>(null);
  const [velocity, setVelocity] = useState<ReadingVelocity | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showSetGoal, setShowSetGoal] = useState(false);
  const [newTarget, setNewTarget] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const currentYear = new Date().getFullYear();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [goalRes, statsRes] = await Promise.all([
        fetch(`/api/goals?year=${currentYear}`),
        fetch(`/api/stats?year=${currentYear}`),
      ]);
      
      const goalJson = await goalRes.json();
      const statsJson = await statsRes.json();
      
      setGoalData(goalJson);
      setVelocity(statsJson.velocity);
      
      if (goalJson.goal) {
        setNewTarget(goalJson.goal.targetBooks.toString());
      }
    } catch (error) {
      console.error('Failed to fetch goal data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetGoal = async () => {
    const target = parseInt(newTarget);
    if (isNaN(target) || target < 1 || target > 365) {
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch('/api/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ year: currentYear, targetBooks: target }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Goal set response:', data);
        setGoalData(data);
        setShowSetGoal(false);
        // Re-fetch to ensure we have the latest data
        fetchData();
      } else {
        console.error('Failed to set goal:', response.status, await response.text());
      }
    } catch (error) {
      console.error('Failed to set goal:', error);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Card className="border-0 shadow-xl bg-gradient-to-br from-violet-500 to-purple-600 text-white">
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-32">
            <span className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const progress = goalData?.progress;
  const hasGoal = !!goalData?.goal;

  // No goal set - show prompt to set one
  if (!hasGoal) {
    return (
      <Card className="border-0 shadow-xl bg-gradient-to-br from-violet-500 to-purple-600 text-white overflow-hidden relative group">
        <CardContent className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-white/20 p-2.5 rounded-xl">
              <Target className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold">{currentYear} Reading Goal</h3>
              <p className="text-sm text-violet-100">Set your target</p>
            </div>
          </div>

          {showSetGoal ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={newTarget}
                  onChange={(e) => setNewTarget(e.target.value)}
                  placeholder="e.g., 24"
                  min="1"
                  max="365"
                  className="flex-1 px-3 py-2 rounded-lg bg-white/20 border border-white/30 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/50"
                  autoFocus
                />
                <span className="text-sm text-violet-100">books</span>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleSetGoal}
                  disabled={isSaving || !newTarget}
                  className="flex-1 bg-white text-violet-600 hover:bg-white/90"
                >
                  <Check className="h-4 w-4 mr-1" />
                  Set Goal
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowSetGoal(false)}
                  className="text-white hover:bg-white/20"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : (
            <>
              <p className="text-violet-100 mb-4">
                How many books do you want to read this year?
              </p>
              {isAuthenticated && (
                <Button
                  onClick={() => setShowSetGoal(true)}
                  className="w-full bg-white text-violet-600 hover:bg-white/90"
                >
                  <Target className="h-4 w-4 mr-2" />
                  Set {currentYear} Goal
                </Button>
              )}
            </>
          )}

          {/* Velocity info if available */}
          {velocity && velocity.currentYear.totalBooks > 0 && (
            <div className="mt-4 pt-4 border-t border-white/20">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-violet-100">Current pace:</span>
                <span className="font-semibold">{velocity.currentYear.booksPerMonth} books/month</span>
              </div>
            </div>
          )}
        </CardContent>
        <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-white/10 rounded-full" />
      </Card>
    );
  }

  // Has goal - show progress
  const TrendIcon = velocity?.trend === 'up' ? TrendingUp : velocity?.trend === 'down' ? TrendingDown : Minus;

  return (
    <Card className="border-0 shadow-xl bg-gradient-to-br from-violet-500 to-purple-600 text-white overflow-hidden relative">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2.5 rounded-xl">
              <Target className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold">{currentYear} Reading Goal</h3>
              <p className="text-sm text-violet-100">
                {progress?.current} of {progress?.target} books
              </p>
            </div>
          </div>
          {isAuthenticated && (
            <button
              onClick={() => setShowSetGoal(!showSetGoal)}
              className="p-1.5 rounded-lg hover:bg-white/20 transition-colors"
            >
              <Settings className="h-4 w-4" />
            </button>
          )}
        </div>

        {showSetGoal ? (
          <div className="space-y-3 mb-4">
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={newTarget}
                onChange={(e) => setNewTarget(e.target.value)}
                min="1"
                max="365"
                className="flex-1 px-3 py-2 rounded-lg bg-white/20 border border-white/30 text-white focus:outline-none focus:ring-2 focus:ring-white/50"
              />
              <span className="text-sm text-violet-100">books</span>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleSetGoal}
                disabled={isSaving}
                className="flex-1 bg-white text-violet-600 hover:bg-white/90"
              >
                Update
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowSetGoal(false)}
                className="text-white hover:bg-white/20"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-6">
            {/* Progress Ring */}
            <ProgressRing progress={progress?.percentage || 0} size={100} strokeWidth={8}>
              <div className="text-center">
                <span className="text-2xl font-bold">{progress?.percentage}%</span>
              </div>
            </ProgressRing>

            {/* Stats */}
            <div className="flex-1 space-y-2">
              <div className={`flex items-center gap-2 text-sm ${progress?.onTrack ? 'text-green-200' : 'text-amber-200'}`}>
                {progress?.onTrack ? (
                  <>
                    <TrendingUp className="h-4 w-4" />
                    <span>On track! Projected: {progress?.projectedTotal} books</span>
                  </>
                ) : (
                  <>
                    <TrendingDown className="h-4 w-4" />
                    <span>Need {progress?.booksNeededPerMonth}/month to reach goal</span>
                  </>
                )}
              </div>

              {velocity && (
                <div className="flex items-center gap-2 text-sm text-violet-100">
                  <TrendIcon className="h-4 w-4" />
                  <span>
                    {velocity.currentYear.booksPerMonth} books/month
                    {velocity.previousYear && velocity.trendPercentage !== null && (
                      <span className={velocity.trend === 'up' ? 'text-green-200' : velocity.trend === 'down' ? 'text-amber-200' : ''}>
                        {' '}({velocity.trendPercentage > 0 ? '+' : ''}{velocity.trendPercentage}% vs last year)
                      </span>
                    )}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
      <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-white/10 rounded-full" />
    </Card>
  );
}
