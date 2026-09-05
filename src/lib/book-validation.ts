import { Prisma } from "@prisma/client";

export const statuses = [
  "TO_READ",
  "NEXT_UP",
  "READING",
  "PAUSED",
  "FINISHED",
  "DNF",
] as const;
export class InputError extends Error {}
export function validateBook(
  input: unknown,
  create = false,
): Partial<Prisma.BookUncheckedCreateInput> {
  if (!input || typeof input !== "object" || Array.isArray(input))
    throw new InputError("Expected a book object");
  const body = input as Record<string, unknown>;
  const data: Record<string, unknown> = {};
  const strings = [
    "title",
    "author",
    "subCategory",
    "summary",
    "coverImageUrl",
    "isbn",
    "apiSource",
    "thoughts",
  ];
  const numbers: Record<string, [number, number]> = {
    rating: [1, 5],
    priority: [0, 1000000],
    currentPage: [0, 1000000],
    totalPages: [1, 1000000],
    audioMinutes: [0, 1000000],
    totalAudioMinutes: [1, 1000000],
    progressPercent: [0, 100],
  };
  for (const [key, value] of Object.entries(body)) {
    if (strings.includes(key)) {
      if (value !== null && typeof value !== "string")
        throw new InputError(`${key} must be text`);
      if (
        (key === "title" || key === "author") &&
        (!value || !String(value).trim())
      )
        throw new InputError(`${key} is required`);
      if (
        typeof value === "string" &&
        value.length > (["summary", "thoughts"].includes(key) ? 50000 : 2000)
      )
        throw new InputError(`${key} is too long`);
      data[key] = typeof value === "string" ? value.trim() : value;
    } else if (key in numbers) {
      const [min, max] = numbers[key];
      if (
        value !== null &&
        (!Number.isInteger(value) || Number(value) < min || Number(value) > max)
      )
        throw new InputError(
          `${key} must be a whole number between ${min} and ${max}`,
        );
      data[key] = value;
    } else if (key === "status") {
      if (!statuses.includes(value as (typeof statuses)[number]))
        throw new InputError("Invalid reading status");
      data[key] = value;
    } else if (key === "category") {
      if (!["FICTION", "NON_FICTION"].includes(String(value)))
        throw new InputError("Invalid category");
      data[key] = value;
    } else if (key === "mediaTypes") {
      if (
        typeof value !== "string" ||
        !value ||
        value
          .split(",")
          .some((v) => !["PAPER", "AUDIOBOOK", "EBOOK"].includes(v))
      )
        throw new InputError("Select a valid format");
      data[key] = [...new Set(value.split(","))].join(",");
    } else if (key === "dateStarted" || key === "dateFinished") {
      if (value === null || value === "") data[key] = null;
      else {
        if (typeof value !== "string" || !Number.isFinite(Date.parse(value)))
          throw new InputError(`${key} must be a valid date`);
        data[key] = new Date(value);
      }
    } else throw new InputError(`Cannot update ${key}`);
  }
  if (create && (!data.title || !data.author))
    throw new InputError("Title and author are required");
  return data as Partial<Prisma.BookUncheckedCreateInput>;
}

export function validateProgress(book: {
  currentPage?: unknown;
  totalPages?: unknown;
  audioMinutes?: unknown;
  totalAudioMinutes?: unknown;
  dateStarted?: unknown;
  dateFinished?: unknown;
}) {
  if (
    book.currentPage != null &&
    book.totalPages != null &&
    Number(book.currentPage) > Number(book.totalPages)
  )
    throw new InputError("Current page cannot exceed total pages");
  if (
    book.audioMinutes != null &&
    book.totalAudioMinutes != null &&
    Number(book.audioMinutes) > Number(book.totalAudioMinutes)
  )
    throw new InputError("Listening progress cannot exceed total minutes");
  if (
    book.dateStarted &&
    book.dateFinished &&
    new Date(String(book.dateStarted)) > new Date(String(book.dateFinished))
  )
    throw new InputError("Finish date cannot be before start date");
}
