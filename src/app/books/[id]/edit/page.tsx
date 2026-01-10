import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { BookForm } from '@/components/books/book-form';

interface EditBookPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditBookPage({ params }: EditBookPageProps) {
  const { id } = await params;

  const book = await prisma.book.findUnique({
    where: { id },
  });

  if (!book) {
    notFound();
  }

  return (
    <div className="max-w-2xl mx-auto">
      <BookForm book={book} mode="edit" />
    </div>
  );
}
