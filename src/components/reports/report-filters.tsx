'use client';

interface ReportFiltersProps {
  year: number;
  category: string;
  onYearChange: (year: number) => void;
  onCategoryChange: (category: string) => void;
}

export function ReportFilters({
  year,
  category,
  onYearChange,
  onCategoryChange,
}: ReportFiltersProps) {
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 10 }, (_, i) => currentYear - i);

  return (
    <div className="flex gap-4 items-center flex-wrap">
      <div>
        <label className="block text-sm font-medium mb-1">Year</label>
        <select
          value={year}
          onChange={(e) => onYearChange(parseInt(e.target.value))}
          className="px-3 py-2 border rounded-md bg-background"
        >
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Category</label>
        <select
          value={category}
          onChange={(e) => onCategoryChange(e.target.value)}
          className="px-3 py-2 border rounded-md bg-background"
        >
          <option value="all">All Categories</option>
          <option value="FICTION">Fiction</option>
          <option value="NON_FICTION">Non-Fiction</option>
        </select>
      </div>
    </div>
  );
}
