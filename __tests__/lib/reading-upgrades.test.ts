import { validateBook, validateProgress } from "@/lib/book-validation";
import { bookForViewer } from "@/lib/privacy";
import { chooseNext, cleanupSuggestions, ShelfBook } from "@/lib/library-tools";
import { validateNote } from "@/lib/note-validation";
import { notesMarkdown } from "@/lib/markdown-export";
const book: ShelfBook = {
  id: "a",
  title: "Dune",
  author: "Frank Herbert",
  status: "TO_READ",
  category: "FICTION",
  subCategory: "Science Fiction",
  summary: "An adventure novel",
  isbn: "123",
  mediaTypes: "PAPER",
  totalPages: 160,
  priority: 1,
  rating: null,
};
test("book validation rejects arbitrary mutations and impossible progress", () => {
  for (const input of [
    { id: "x" },
    { rating: 6 },
    { title: " " },
    { status: "INVALID" },
    { currentPage: -1 },
    { dateStarted: "nope" },
    { mediaTypes: "DVD" },
  ])
    expect(() => validateBook(input)).toThrow();
  expect(() =>
    validateProgress({ currentPage: 201, totalPages: 200 }),
  ).toThrow();
  expect(() =>
    validateProgress({ audioMinutes: 5, totalAudioMinutes: 4 }),
  ).toThrow();
  expect(validateBook({ status: "DNF", progressPercent: 50 })).toEqual({
    status: "DNF",
    progressPercent: 50,
  });
});
test("public serialization never includes private notes or thoughts", () => {
  const b = {
    thoughts: "secret",
    notes: [
      { isQuote: true, isPublic: false, content: "secret" },
      { isQuote: true, isPublic: true, content: "shared" },
      { isQuote: false, isPublic: true, content: "not a quote" },
    ],
  };
  expect(bookForViewer(b)).toEqual({ thoughts: null, notes: [b.notes[1]] });
  expect(bookForViewer(b, true)).toBe(b);
});
test("backlog picks exclude finished and unmatched format/length, with transparent reasons", () => {
  const picks = chooseNext(
    [
      book,
      { ...book, id: "b", status: "FINISHED" },
      { ...book, id: "c", totalPages: null },
      { ...book, id: "d", mediaTypes: "EBOOK" },
    ],
    { mood: "escape", hours: 5, format: "PAPER" },
  );
  expect(picks.map((p) => p.book.id)).toEqual(["a"]);
  expect(picks[0].estimatedHours).toBe(4);
  expect(picks[0].reasons.join(" ")).toContain("escape");
});
test("cleanup flags possible duplicates and category mismatches without mutating", () => {
  const result = cleanupSuggestions([
    book,
    { ...book, id: "b", category: "NON_FICTION" },
  ]);
  expect(result.duplicatePairs).toHaveLength(1);
  expect(result.metadata[0].book.id).toBe("b");
});
test("notes retain explicit type and normalize tags; ordinary notes cannot stay public", () => {
  expect(
    validateNote(
      {
        content: "quote without quotation marks",
        isQuote: true,
        tags: " Ideas, ideas, Book Club ",
      },
      true,
    ),
  ).toEqual({
    content: "quote without quotation marks",
    isQuote: true,
    tags: "ideas, book club",
  });
  expect(validateNote({ isQuote: false, isPublic: true })).toEqual({
    isQuote: false,
    isPublic: false,
  });
  expect(() => validateNote({ content: "", page: -1 }, true)).toThrow();
});
test("Markdown export preserves multiline quotes, page and Obsidian tags", () => {
  expect(
    notesMarkdown([
      {
        book,
        content: "one\ntwo",
        page: 4,
        tags: "ideas, book club",
        isQuote: true,
      },
    ]),
  ).toContain("> one\n> two\n\nPage 4\n\n#ideas #book-club");
});
