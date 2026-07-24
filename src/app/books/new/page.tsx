import { BookForm } from '@/components/books/book-form';

interface NewBookPageProps {
  searchParams: Promise<{
    title?: string;
    text?: string;
    url?: string;
    author?: string;
    isbn?: string;
  }>;
}

export default async function NewBookPage({ searchParams }: NewBookPageProps) {
  const params = await searchParams;

  // PWA share target sends title/text/url. The shared text often contains
  // "Book Title by Author Name" plus the source URL — strip the URL out of
  // the text and keep it as the summary source if present.
  const sharedText = params.text?.replace(params.url || '', '').trim();
  const summaryParts = [sharedText, params.url].filter(Boolean);

  const prefill = {
    title: params.title || undefined,
    author: params.author || undefined,
    summary: summaryParts.length > 0 ? summaryParts.join('\n') : undefined,
    isbn: params.isbn || undefined,
  };

  const hasPrefill = Object.values(prefill).some(Boolean);

  return (
    <div className="max-w-2xl mx-auto">
      <BookForm mode="create" prefill={hasPrefill ? prefill : undefined} />
    </div>
  );
}
