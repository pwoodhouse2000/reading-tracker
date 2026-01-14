'use client';

import { getAllSubCategories } from '@/lib/constants';

interface ReportFiltersProps {
  dateRange: 'year' | 'allTime' | 'custom';
  year: number;
  category: string;
  subCategory: string;
  startDate: string;
  endDate: string;
  minRating: number;
  onDateRangeChange: (range: 'year' | 'allTime' | 'custom') => void;
  onYearChange: (year: number) => void;
  onCategoryChange: (category: string) => void;
  onSubCategoryChange: (subCategory: string) => void;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
  onMinRatingChange: (rating: number) => void;
}

export function ReportFilters({
  dateRange,
  year,
  category,
  subCategory,
  startDate,
  endDate,
  minRating,
  onDateRangeChange,
  onYearChange,
  onCategoryChange,
  onSubCategoryChange,
  onStartDateChange,
  onEndDateChange,
  onMinRatingChange,
}: ReportFiltersProps) {
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 10 }, (_, i) => currentYear - i);
  const allSubCategories = getAllSubCategories();

  return (
    <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm p-6 rounded-lg shadow-lg border border-gray-100 dark:border-gray-700">
      <h3 className="text-lg font-semibold mb-4 text-foreground">Report Filters</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Date Range Type */}
        <div>
          <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Time Period</label>
          <select
            value={dateRange}
            onChange={(e) => onDateRangeChange(e.target.value as 'year' | 'allTime' | 'custom')}
            className="w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary"
          >
            <option value="year">Specific Year</option>
            <option value="allTime">All Time</option>
            <option value="custom">Custom Range</option>
          </select>
        </div>

        {/* Year selector (only show if dateRange is 'year') */}
        {dateRange === 'year' && (
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Year</label>
            <select
              value={year}
              onChange={(e) => onYearChange(parseInt(e.target.value))}
              className="w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary"
            >
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Custom date range (only show if dateRange is 'custom') */}
        {dateRange === 'custom' && (
          <>
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => onStartDateChange(e.target.value)}
                className="w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => onEndDateChange(e.target.value)}
                className="w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary"
              />
            </div>
          </>
        )}

        {/* Category */}
        <div>
          <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Category</label>
          <select
            value={category}
            onChange={(e) => onCategoryChange(e.target.value)}
            className="w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary"
          >
            <option value="all">All Categories</option>
            <option value="FICTION">Fiction</option>
            <option value="NON_FICTION">Non-Fiction</option>
          </select>
        </div>

        {/* Sub-category */}
        <div>
          <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Sub-category</label>
          <select
            value={subCategory}
            onChange={(e) => onSubCategoryChange(e.target.value)}
            className="w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary"
          >
            <option value="">All Sub-categories</option>
            {allSubCategories.map((subCat) => (
              <option key={subCat.value} value={subCat.value}>
                {subCat.emoji} {subCat.value}
              </option>
            ))}
          </select>
        </div>

        {/* Minimum Rating */}
        <div>
          <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Minimum Rating</label>
          <select
            value={minRating}
            onChange={(e) => onMinRatingChange(parseInt(e.target.value))}
            className="w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary"
          >
            <option value={0}>All Ratings</option>
            <option value={1}>⭐ 1+ stars</option>
            <option value={2}>⭐⭐ 2+ stars</option>
            <option value={3}>⭐⭐⭐ 3+ stars</option>
            <option value={4}>⭐⭐⭐⭐ 4+ stars</option>
            <option value={5}>⭐⭐⭐⭐⭐ 5 stars only</option>
          </select>
        </div>
      </div>
    </div>
  );
}
