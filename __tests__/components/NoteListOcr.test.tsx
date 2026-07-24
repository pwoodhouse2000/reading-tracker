import { render, screen, fireEvent } from '@testing-library/react';
import { NoteList } from '@/components/notes/note-list';

let mockIsAuthenticated = true;

jest.mock('@/components/auth/auth-provider', () => ({
  useAuth: () => ({ isAuthenticated: mockIsAuthenticated }),
}));

describe('NoteList photo OCR button', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsAuthenticated = true;
  });

  it('renders a camera button with a hidden photo file input when authenticated', () => {
    render(<NoteList notes={[]} bookId="book-1" />);

    const cameraButton = screen.getByLabelText('Scan quote from photo');
    expect(cameraButton).toBeInTheDocument();

    const input = screen.getByTestId('ocr-photo-input');
    expect(input).toHaveAttribute('accept', 'image/*');
    expect(input).toHaveAttribute('capture', 'environment');
  });

  it('opens the file picker when the camera button is clicked', () => {
    render(<NoteList notes={[]} bookId="book-1" />);

    const input = screen.getByTestId('ocr-photo-input') as HTMLInputElement;
    const clickSpy = jest.spyOn(input, 'click').mockImplementation(() => {});

    fireEvent.click(screen.getByLabelText('Scan quote from photo'));
    expect(clickSpy).toHaveBeenCalled();
  });

  it('does not render the camera button when unauthenticated', () => {
    mockIsAuthenticated = false;
    render(<NoteList notes={[]} bookId="book-1" />);
    expect(screen.queryByLabelText('Scan quote from photo')).not.toBeInTheDocument();
  });
});
