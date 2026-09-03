import { fireEvent, render, screen } from '@testing-library/react';
import { BookList } from '@/components/books/book-list';
import BooksPage from '@/app/books/page';
import { prisma } from '@/lib/prisma';
import { useAuth } from '@/components/auth/auth-provider';

jest.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(window.location.search),
}));
jest.mock('@/lib/prisma', () => ({ prisma: { book: { findMany: jest.fn() } } }));
jest.mock('@/components/auth/auth-provider', () => ({ useAuth: jest.fn() }));
jest.mock('@/components/books/admin-actions', () => ({
  BookAddButton: () => null,
  TodoistImportButton: () => null,
}));
jest.mock('@/components/books/book-card', () => ({
  BookCard: ({ book }: { book: { title: string } }) => <div>{book.title}</div>,
}));
jest.mock('@/components/books/swipeable-book-card', () => ({
  SwipeableBookCard: ({ book }: { book: { title: string } }) => <div>{book.title}</div>,
}));
jest.mock('@/components/books/sortable-book-list', () => ({
  SortableBookList: () => <div>Sortable queue</div>,
}));

const base = {
  author: 'An Author', mediaTypes: 'PAPER', category: 'FICTION' as const,
  rating: null, coverImageUrl: null, summary: null, priority: 1,
  createdAt: '2026-01-01T00:00:00Z', dateFinished: null,
};
const books = [
  { ...base, id: '1', title: 'Reading Book', status: 'READING' as const },
  { ...base, id: '2', title: 'Queued Book', status: 'TO_READ' as const, category: 'NON_FICTION' as const },
  { ...base, id: '3', title: 'Finished Book', status: 'FINISHED' as const, dateFinished: '2026-02-01T00:00:00Z' },
  { ...base, id: '4', title: 'Older Book', status: 'FINISHED' as const, dateFinished: '2025-12-31T23:30:00Z' },
];

beforeEach(() => {
  jest.clearAllMocks();
  window.history.replaceState(null, '', '/books');
  (useAuth as jest.Mock).mockReturnValue({ isAuthenticated: false });
  // Model the actual database filtering so the dashboard-link regression fails
  // if the server supplies only the initially selected status again.
  (prisma.book.findMany as jest.Mock).mockImplementation(async ({ where }) =>
    where?.status ? books.filter(book => book.status === where.status) : books);
});

it('can switch from a dashboard Reading link to To Read and All', async () => {
  window.history.replaceState(null, '', '/books?status=READING');
  const page = await BooksPage();
  const loadedBooks = await (prisma.book.findMany as jest.Mock).mock.results[0].value;
  const view = render(page);
  expect(screen.getByText('Reading Book')).toBeInTheDocument();
  expect(screen.queryByText('Queued Book')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /To Read/ }));
  // Rerender the same server-provided books when the URL subscription updates.
  view.rerender(<BookList books={loadedBooks} />);
  expect(window.location.search).toBe('?status=TO_READ');
  expect(screen.getByText('Queued Book')).toBeInTheDocument();
  expect(screen.queryByText('Reading Book')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /All$/ }));
  view.rerender(<BookList books={loadedBooks} />);
  expect(screen.getByRole('status')).toHaveTextContent('Showing 4 of 4 books');
});

it('restores category, year, search, sort, view and grouping from a URL', () => {
  window.history.replaceState(null, '', '/books?status=FINISHED&category=FICTION&year=2026&search=finished&sort=title&view=compact&group=false');
  render(<BookList books={books} />);
  expect(screen.getByText('Finished Book')).toBeInTheDocument();
  expect(screen.queryByText('Older Book')).not.toBeInTheDocument();
  expect(screen.getByLabelText('Category')).toHaveValue('FICTION');
  expect(screen.getByLabelText('Finished in')).toHaveValue('2026');
  expect(screen.getByLabelText('Sort by')).toHaveValue('title');
  expect(screen.getByRole('button', { name: 'Compact view' })).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'false');
  expect(screen.getByRole('status')).toHaveTextContent('Showing 1 of 4 books');
});

it('clears a finished-year restriction when switching to an active queue', () => {
  window.history.replaceState(null, '', '/books?status=FINISHED&year=2026');
  const view = render(<BookList books={books} />);
  fireEvent.click(screen.getByRole('button', { name: /Reading$/ }));
  view.rerender(<BookList books={books} />);
  expect(screen.getByText('Reading Book')).toBeInTheDocument();
  expect(new URLSearchParams(window.location.search).has('year')).toBe(false);
});

it('recovers from empty results while preserving the chosen layout and sort', () => {
  window.history.replaceState(null, '', '/books?category=FICTION&subCategory=missing&search=none&sort=author&view=compact');
  const view = render(<BookList books={books} />);
  fireEvent.click(screen.getByRole('button', { name: 'Show all books' }));
  view.rerender(<BookList books={books} />);
  expect(screen.getByRole('status')).toHaveTextContent('Showing 4 of 4 books');
  expect(window.location.search).toBe('?sort=author&view=compact');
});

it('reflects a restored earlier URL and replaces history while typing', () => {
  window.history.replaceState(null, '', '/books?status=TO_READ');
  const view = render(<BookList books={books} />);
  const replace = jest.spyOn(window.history, 'replaceState');
  fireEvent.change(screen.getByRole('searchbox'), { target: { value: '  queued  ' } });
  view.rerender(<BookList books={books} />);
  expect(replace).toHaveBeenCalled();
  expect(screen.getByText('Queued Book')).toBeInTheDocument();
  replace.mockRestore();
  window.history.replaceState(null, '', '/books?status=READING');
  view.rerender(<BookList books={books} />);
  expect(screen.getByText('Reading Book')).toBeInTheDocument();
  expect(screen.getByRole('searchbox')).toHaveValue('');
});

it('offers editing controls only to admins and reordering only for complete queues', () => {
  window.history.replaceState(null, '', '/books?status=TO_READ');
  const view = render(<BookList books={books} />);
  expect(screen.queryByRole('button', { name: 'Add Covers & Summaries' })).not.toBeInTheDocument();
  (useAuth as jest.Mock).mockReturnValue({ isAuthenticated: true });
  view.rerender(<BookList books={books} />);
  expect(screen.getByRole('button', { name: 'Reorder' })).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Category'), { target: { value: 'NON_FICTION' } });
  view.rerender(<BookList books={books} />);
  expect(screen.queryByRole('button', { name: 'Reorder' })).not.toBeInTheDocument();
});
