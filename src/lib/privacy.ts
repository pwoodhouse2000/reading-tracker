// Never serialize private thoughts or notes into a public API or client component.
export function bookForViewer<
  T extends {
    thoughts?: string | null;
    notes?: Array<{ isPublic?: boolean; isQuote?: boolean }>;
  },
>(book: T, admin = false): T {
  if (admin) return book;
  return {
    ...book,
    ...("thoughts" in book ? { thoughts: null } : {}),
    ...(book.notes
      ? {
          notes: book.notes.filter(
            (n) => n.isPublic === true && n.isQuote === true,
          ),
        }
      : {}),
  };
}
export const privateHeaders = { "Cache-Control": "private, no-store" };
