import { render, screen } from '@testing-library/react';
import { StatusBadge } from '@/components/books/status-badge';

describe('StatusBadge', () => {
  it('renders TO_READ status correctly', () => {
    render(<StatusBadge status="TO_READ" />);
    expect(screen.getByText('To Read')).toBeInTheDocument();
  });

  it('renders READING status correctly', () => {
    render(<StatusBadge status="READING" />);
    expect(screen.getByText('Reading')).toBeInTheDocument();
  });

  it('renders FINISHED status correctly', () => {
    render(<StatusBadge status="FINISHED" />);
    expect(screen.getByText('Finished')).toBeInTheDocument();
  });

  it('renders NEXT_UP status correctly', () => {
    render(<StatusBadge status="NEXT_UP" />);
    expect(screen.getByText('Next Up')).toBeInTheDocument();
  });

  it('renders PAUSED status correctly', () => {
    render(<StatusBadge status="PAUSED" />);
    expect(screen.getByText('Paused')).toBeInTheDocument();
  });

  it('applies correct color classes for each status', () => {
    const { container, rerender } = render(<StatusBadge status="READING" />);
    // The Badge component renders a span with the classes
    expect(container.querySelector('.bg-blue-100\\/90')).toBeInTheDocument();

    rerender(<StatusBadge status="FINISHED" />);
    expect(container.querySelector('.bg-emerald-100\\/90')).toBeInTheDocument();

    rerender(<StatusBadge status="PAUSED" />);
    expect(container.querySelector('.bg-orange-100\\/90')).toBeInTheDocument();

    rerender(<StatusBadge status="NEXT_UP" />);
    expect(container.querySelector('.bg-amber-100\\/90')).toBeInTheDocument();

    rerender(<StatusBadge status="TO_READ" />);
    expect(container.querySelector('.bg-slate-100\\/90')).toBeInTheDocument();
  });
});
