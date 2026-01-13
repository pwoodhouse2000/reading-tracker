import { render, screen, fireEvent } from '@testing-library/react';
import { RatingStars } from '@/components/books/rating-stars';

describe('RatingStars', () => {
  it('renders 5 star buttons', () => {
    render(<RatingStars rating={3} />);
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(5);
  });

  it('renders correct number of filled stars for rating', () => {
    const { container } = render(<RatingStars rating={4} />);
    // Stars with fill-yellow-400 are filled
    const filledStars = container.querySelectorAll('.fill-yellow-400');
    expect(filledStars.length).toBe(4);
  });

  it('renders all empty stars when rating is null', () => {
    const { container } = render(<RatingStars rating={null} />);
    const filledStars = container.querySelectorAll('.fill-yellow-400');
    expect(filledStars.length).toBe(0);
  });

  it('calls onRatingChange when not readonly and star is clicked', () => {
    const handleChange = jest.fn();
    render(<RatingStars rating={2} onRatingChange={handleChange} />);
    
    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[3]); // Click 4th star
    
    expect(handleChange).toHaveBeenCalledWith(4);
  });

  it('does not call onRatingChange when readonly', () => {
    const handleChange = jest.fn();
    render(<RatingStars rating={2} onRatingChange={handleChange} readonly />);
    
    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[3]);
    
    expect(handleChange).not.toHaveBeenCalled();
  });

  it('has correct aria-labels', () => {
    render(<RatingStars rating={3} />);
    expect(screen.getByLabelText('1 star')).toBeInTheDocument();
    expect(screen.getByLabelText('2 stars')).toBeInTheDocument();
    expect(screen.getByLabelText('5 stars')).toBeInTheDocument();
  });

  it('applies size classes correctly', () => {
    const { container, rerender } = render(<RatingStars rating={3} size="sm" />);
    expect(container.querySelector('.h-4')).toBeInTheDocument();

    rerender(<RatingStars rating={3} size="lg" />);
    expect(container.querySelector('.h-6')).toBeInTheDocument();
  });
});
