import { BookForm } from '@/components/books/book-form';

export default function NewBookPage() {
  return (
    <div className="max-w-2xl mx-auto">
      <BookForm mode="create" />
    </div>
  );
}
