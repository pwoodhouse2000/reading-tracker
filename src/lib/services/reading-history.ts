import { Book, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

// A reread moves the completed reading into ReadingSession. Reports combine
// those snapshots with the current Book so starting a reread never erases totals.
export function sessionWhere(
  where: Prisma.BookWhereInput = {},
): Prisma.ReadingSessionWhereInput {
  const result: Prisma.ReadingSessionWhereInput = {};
  const book: Prisma.BookWhereInput = {};
  for (const [key, value] of Object.entries(where)) {
    if (["AND", "OR", "NOT"].includes(key)) {
      Object.assign(result, {
        [key]: Array.isArray(value)
          ? value.map((v) => sessionWhere(v as Prisma.BookWhereInput))
          : sessionWhere(value as Prisma.BookWhereInput),
      });
    } else if (
      ["dateStarted", "dateFinished", "rating", "status"].includes(key)
    ) {
      Object.assign(result, { [key]: value });
    } else Object.assign(book, { [key]: value });
  }
  if (Object.keys(book).length) result.book = { is: book };
  return result;
}
export async function historyCount(where: Prisma.BookWhereInput) {
  const [current, archived] = await Promise.all([
    prisma.book.count({ where }),
    prisma.readingSession.count({ where: sessionWhere(where) }),
  ]);
  return current + archived;
}
export async function historyBooks(
  args: Prisma.BookFindManyArgs,
): Promise<Book[]> {
  const [current, archived] = await Promise.all([
    prisma.book.findMany(args),
    prisma.readingSession.findMany({
      where: sessionWhere(args.where),
      include: { book: true },
    }),
  ]);
  const books = [
    ...current,
    ...archived.map((s) => ({
      ...s.book,
      status: s.status as Book["status"],
      dateStarted: s.dateStarted,
      dateFinished: s.dateFinished,
      rating: s.rating,
    })),
  ] as Book[];
  const order = args.orderBy
    ? Array.isArray(args.orderBy)
      ? args.orderBy
      : [args.orderBy]
    : [];
  books.sort((a, b) => {
    for (const rule of order)
      for (const [field, direction] of Object.entries(rule)) {
        const x = a[field as keyof Book],
          y = b[field as keyof Book];
        const diff =
          x == null
            ? y == null
              ? 0
              : -1
            : y == null
              ? 1
              : x < y
                ? -1
                : x > y
                  ? 1
                  : 0;
        if (diff) return direction === "desc" ? -diff : diff;
      }
    return 0;
  });
  return args.take ? books.slice(0, args.take) : books;
}
