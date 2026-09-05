export function notesMarkdown(
  notes: Array<{
    content: string;
    page: number | null;
    tags: string;
    isQuote: boolean;
    book: { id: string; title: string; author: string };
  }>,
) {
  const lines = [
    "# Reading notes",
    "",
    "Exported from Pete’s Reading Tracker. Includes private notes; share thoughtfully.",
    "",
  ];
  const books = new Map<string, typeof notes>();
  for (const n of notes)
    books.set(n.book.id, [...(books.get(n.book.id) || []), n]);
  for (const group of books.values()) {
    const book = group[0].book;
    lines.push(
      `## ${book.title.replace(/[\r\n]/g, " ")} — ${book.author.replace(/[\r\n]/g, " ")}`,
      "",
    );
    for (const n of group) {
      lines.push(
        n.isQuote
          ? n.content
              .split("\n")
              .map((line) => `> ${line}`)
              .join("\n")
          : n.content,
        "",
      );
      if (n.page !== null) lines.push(`Page ${n.page}`, "");
      if (n.tags)
        lines.push(
          n.tags
            .split(",")
            .map((t) => "#" + t.trim().replace(/[^\p{L}\p{N}_/-]/gu, "-"))
            .join(" "),
          "",
        );
      lines.push("---", "");
    }
  }
  return lines.join("\n");
}
