'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ReportFilters } from '@/components/reports/report-filters';
import { MonthlyChart } from '@/components/reports/monthly-chart';
import { BookCard } from '@/components/books/book-card';

interface ReportData {
  year: number;
  category: string;
  bestBooks: any[];
  stats: {
    total: number;
    byCategory: {
      fiction: number;
      nonFiction: number;
    };
    byMedia: {
      paper: number;
      audiobook: number;
      ebook: number;
    };
    byStatus: {
      toRead: number;
      nextUp: number;
      reading: number;
      paused: number;
      finished: number;
    };
    averageRating: number;
  };
  monthlyCounts: Array<{ month: string; count: number }>;
  topAuthors: Array<{ author: string; count: number }>;
}

export default function ReportsPage() {
  const currentYear = new Date().getFullYear();
  const [dateRange, setDateRange] = useState<'year' | 'allTime' | 'custom'>('year');
  const [year, setYear] = useState(currentYear);
  const [category, setCategory] = useState('all');
  const [subCategory, setSubCategory] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchReports() {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        
        // Add date range params based on selection
        if (dateRange === 'allTime') {
          params.set('allTime', 'true');
        } else if (dateRange === 'custom') {
          if (startDate) params.set('startDate', startDate);
          if (endDate) params.set('endDate', endDate);
        } else {
          params.set('year', year.toString());
        }

        // Add category if not 'all'
        if (category && category !== 'all') {
          params.set('category', category);
        }

        // Add sub-category if selected
        if (subCategory) {
          params.set('subCategory', subCategory);
        }

        const response = await fetch(`/api/reports?${params.toString()}`);
        const reportData = await response.json();
        setData(reportData);
      } catch (error) {
        console.error('Error fetching reports:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchReports();
  }, [dateRange, year, category, subCategory, startDate, endDate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Loading reports...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Failed to load reports</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Reading Reports</h1>
        <p className="text-muted-foreground mt-1">
          Analyze your reading habits and discover insights
        </p>
      </div>

      <ReportFilters
        dateRange={dateRange}
        year={year}
        category={category}
        subCategory={subCategory}
        startDate={startDate}
        endDate={endDate}
        onDateRangeChange={setDateRange}
        onYearChange={setYear}
        onCategoryChange={setCategory}
        onSubCategoryChange={setSubCategory}
        onStartDateChange={setStartDate}
        onEndDateChange={setEndDate}
      />

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Books Finished
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.stats.total}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {dateRange === 'allTime' && 'all time'}
              {dateRange === 'year' && `in ${year}`}
              {dateRange === 'custom' && 'in date range'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Average Rating
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.stats.averageRating.toFixed(1)} ⭐
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              out of 5 stars
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Fiction vs Non-Fiction
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.stats.byCategory.fiction} / {data.stats.byCategory.nonFiction}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              fiction / non-fiction
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Currently Reading
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.stats.byStatus.reading}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {data.stats.byStatus.toRead} books to read
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Reading Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Monthly Reading Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <MonthlyChart data={data.monthlyCounts} />
        </CardContent>
      </Card>

      {/* Media Type Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Reading by Media Type</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-primary">
                {data.stats.byMedia.paper}
              </div>
              <p className="text-sm text-muted-foreground mt-1">Paper Books</p>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-primary">
                {data.stats.byMedia.audiobook}
              </div>
              <p className="text-sm text-muted-foreground mt-1">Audiobooks</p>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-primary">
                {data.stats.byMedia.ebook}
              </div>
              <p className="text-sm text-muted-foreground mt-1">E-books</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Top Authors */}
      {data.topAuthors.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Top Authors</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.topAuthors.map((author, index) => (
                <div key={author.author} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="text-lg font-semibold text-muted-foreground w-6">
                      #{index + 1}
                    </div>
                    <div className="font-medium">{author.author}</div>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {author.count} {author.count === 1 ? 'book' : 'books'}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Best Books */}
      {data.bestBooks.length > 0 && (
        <div>
          <h2 className="text-2xl font-bold mb-4">
            Best Books
            {dateRange === 'allTime' && ' of All Time'}
            {dateRange === 'year' && ` of ${year}`}
            {dateRange === 'custom' && ' (Custom Range)'}
            {category !== 'all' && ` - ${category === 'FICTION' ? 'Fiction' : 'Non-Fiction'}`}
            {subCategory && ` - ${subCategory}`}
          </h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {data.bestBooks.map((book) => (
              <BookCard key={book.id} book={book} />
            ))}
          </div>
        </div>
      )}

      {data.bestBooks.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              No books with 4+ stars found for the selected filters.
              Start rating your finished books to see them here!
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
