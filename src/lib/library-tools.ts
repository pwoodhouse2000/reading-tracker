export type ShelfBook = {
  id: string;
  title: string;
  author: string;
  status: string;
  category: string;
  subCategory: string | null;
  summary: string | null;
  isbn: string | null;
  mediaTypes: string;
  totalPages: number | null;
  priority: number | null;
  rating: number | null;
};
export const normalize = (s: string) =>
  s
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]/gu, "");
export function chooseNext(
  books: ShelfBook[],
  filters: { mood: string; format: string; hours: number },
) {
  const favorites = books.filter((b) => b.rating !== null && b.rating >= 4);
  const authors = new Set(favorites.map((b) => normalize(b.author)));
  const genres = new Set(favorites.map((b) => b.subCategory).filter(Boolean));
  const patterns: Record<string, RegExp> = {
    escape: /fantasy|adventure|science fiction|mystery|thriller/i,
    reflect: /philosophy|memoir|psychology|literary|reflection/i,
    learn: /history|science|business|technology|politics|biography/i,
  };
  return books
    .filter((b) => ["TO_READ", "NEXT_UP"].includes(b.status))
    .filter(
      (b) =>
        !filters.format || b.mediaTypes.split(",").includes(filters.format),
    )
    .filter(
      (b) =>
        !filters.hours ||
        (b.totalPages !== null && b.totalPages / 40 <= filters.hours),
    )
    .map((book) => {
      let score = book.status === "NEXT_UP" ? 10 : 0;
      const reasons: string[] = [];
      if (book.status === "NEXT_UP")
        reasons.push("Already on your Next Up shelf");
      if (authors.has(normalize(book.author))) {
        score += 8;
        reasons.push("An author you have rated highly");
      }
      if (book.subCategory && genres.has(book.subCategory)) {
        score += 5;
        reasons.push("Matches a genre you have enjoyed");
      }
      if (
        filters.mood &&
        patterns[filters.mood]?.test(`${book.subCategory} ${book.summary}`)
      ) {
        score += 12;
        reasons.push(
          `Themes match your ${filters.mood === "escape" ? "escape" : filters.mood === "reflect" ? "reflective" : "learning"} mood`,
        );
      }
      if (book.priority !== null) {
        score += 3 / (1 + Math.max(0, book.priority));
        reasons.push(`Shelf priority ${book.priority}`);
      }
      return {
        book,
        score,
        reasons: reasons.length
          ? reasons
          : ["Waiting on your shelf for a fresh look"],
        estimatedHours: book.totalPages
          ? Math.round((book.totalPages / 40) * 10) / 10
          : null,
      };
    })
    .sort(
      (a, b) => b.score - a.score || a.book.title.localeCompare(b.book.title),
    )
    .slice(0, 3);
}
export function cleanupSuggestions(books: ShelfBook[]) {
  const duplicatePairs: Array<{
    first: ShelfBook;
    second: ShelfBook;
    reason: string;
  }> = [];
  for (let i = 0; i < books.length; i++)
    for (let j = i + 1; j < books.length; j++) {
      const a = books[i],
        b = books[j];
      const isbn = a.isbn && b.isbn && normalize(a.isbn) === normalize(b.isbn);
      if (
        isbn ||
        (normalize(a.title) === normalize(b.title) &&
          normalize(a.author) === normalize(b.author))
      )
        duplicatePairs.push({
          first: a,
          second: b,
          reason: isbn ? "Same ISBN" : "Same title and author",
        });
    }
  const fictionGenres = [
    "Science Fiction",
    "Fantasy",
    "Mystery",
    "Thriller",
    "Romance",
    "Historical Fiction",
    "Literary Fiction",
    "Horror",
    "Adventure",
  ];
  const metadata = books
    .filter(
      (b) =>
        b.category === "NON_FICTION" &&
        (fictionGenres.includes(b.subCategory || "") ||
          /\b(novel|science fiction|fantasy novel)\b/i.test(b.summary || "")),
    )
    .map((book) => ({
      book,
      category: "FICTION",
      reason: fictionGenres.includes(book.subCategory || "")
        ? `Sub-category is ${book.subCategory}`
        : "Description mentions a novel or fiction; review before applying",
    }));
  return { duplicatePairs, metadata };
}
