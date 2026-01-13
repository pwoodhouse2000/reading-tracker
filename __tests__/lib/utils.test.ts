import { cn, formatDate, pluralize } from '@/lib/utils';

describe('cn (classnames utility)', () => {
  it('merges class names correctly', () => {
    expect(cn('foo', 'bar')).toBe('foo bar');
  });

  it('handles conditional classes', () => {
    expect(cn('base', true && 'included', false && 'excluded')).toBe('base included');
  });

  it('handles undefined and null values', () => {
    expect(cn('base', undefined, null, 'end')).toBe('base end');
  });

  it('merges Tailwind classes correctly', () => {
    // tailwind-merge should handle conflicting classes
    expect(cn('px-2', 'px-4')).toBe('px-4');
    expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500');
  });
});

describe('formatDate', () => {
  it('formats date object correctly', () => {
    const date = new Date('2026-01-15T12:00:00Z');
    const formatted = formatDate(date);
    // Check that it contains the expected parts
    expect(formatted).toContain('15');
    expect(formatted).toContain('2026');
  });

  it('formats string dates', () => {
    const formatted = formatDate('2026-06-20');
    expect(formatted).toContain('20');
    expect(formatted).toContain('2026');
  });

  it('returns empty string for null', () => {
    expect(formatDate(null)).toBe('');
  });

  it('returns empty string for undefined', () => {
    expect(formatDate(undefined)).toBe('');
  });
});

describe('pluralize', () => {
  it('returns singular for count of 1', () => {
    expect(pluralize(1, 'book')).toBe('book');
    expect(pluralize(1, 'story', 'stories')).toBe('story');
  });

  it('returns plural for count > 1', () => {
    expect(pluralize(2, 'book')).toBe('books');
    expect(pluralize(5, 'book')).toBe('books');
  });

  it('returns plural for count of 0', () => {
    expect(pluralize(0, 'book')).toBe('books');
  });

  it('uses custom plural form when provided', () => {
    expect(pluralize(2, 'story', 'stories')).toBe('stories');
    expect(pluralize(3, 'person', 'people')).toBe('people');
  });
});
