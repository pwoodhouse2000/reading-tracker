import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PageProgress } from '@/components/books/page-progress';
import { useAuth } from '@/components/auth/auth-provider';

jest.mock('@/components/auth/auth-provider', () => ({
  useAuth: jest.fn(),
}));

jest.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: jest.fn(), push: jest.fn() }),
}));

const mockUseAuth = useAuth as jest.Mock;

global.fetch = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
});

describe('PageProgress', () => {
  it('shows progress bar with percent when currentPage and totalPages are known', () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: false });
    render(<PageProgress bookId="b1" currentPage={160} totalPages={320} />);
    expect(screen.getByText(/p\. 160/)).toBeInTheDocument();
    expect(screen.getByText(/of 320/)).toBeInTheDocument();
    expect(screen.getByText('50%')).toBeInTheDocument();
  });

  it('shows "on page" text without bar when totalPages is unknown', () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: false });
    render(<PageProgress bookId="b1" currentPage={42} totalPages={null} />);
    expect(screen.getByText(/p\. 42/)).toBeInTheDocument();
    expect(screen.queryByText(/%/)).not.toBeInTheDocument();
  });

  it('shows empty state when no progress', () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: false });
    render(<PageProgress bookId="b1" currentPage={null} totalPages={320} />);
    expect(screen.getByText('320 pages')).toBeInTheDocument();
  });

  it('hides update controls when not authenticated', () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: false });
    render(<PageProgress bookId="b1" currentPage={10} totalPages={100} />);
    expect(screen.queryByText('Update progress')).not.toBeInTheDocument();
  });

  it('shows update panel when authenticated and saves via PATCH', async () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: true });
    (global.fetch as jest.Mock).mockResolvedValue({ ok: true, json: async () => ({}) });

    render(<PageProgress bookId="b1" currentPage={10} totalPages={100} />);
    fireEvent.click(screen.getByText('Update progress'));

    const input = screen.getByPlaceholderText('0');
    fireEvent.change(input, { target: { value: '25' } });
    fireEvent.click(screen.getByText('Save'));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/books/b1', expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ currentPage: 25, totalPages: 100 }),
      }));
    });
  });

  it('adjusts the page with +/- buttons', async () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: true });
    render(<PageProgress bookId="b1" currentPage={10} totalPages={100} />);
    fireEvent.click(screen.getByText('Update progress'));

    const input = screen.getByPlaceholderText('0') as HTMLInputElement;
    fireEvent.click(screen.getByText('+10'));
    expect(input.value).toBe('20');
    fireEvent.click(screen.getByText('-10'));
    expect(input.value).toBe('10');
  });

  it('clears progress via PATCH with null', async () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: true });
    (global.fetch as jest.Mock).mockResolvedValue({ ok: true, json: async () => ({}) });

    render(<PageProgress bookId="b1" currentPage={10} totalPages={100} />);
    fireEvent.click(screen.getByText('Update progress'));
    fireEvent.click(screen.getByText('Clear'));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/books/b1', expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ currentPage: null }),
      }));
    });
  });
});
