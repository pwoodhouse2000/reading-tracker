import { InputError } from "./book-validation";
export function validateNote(body: Record<string, unknown>, creating = false) {
  if (!body || typeof body !== "object" || Array.isArray(body))
    throw new InputError("Expected a note");
  const data: {
    content?: string;
    page?: number | null;
    isQuote?: boolean;
    isPublic?: boolean;
    tags?: string;
  } = {};
  if (creating || body.content !== undefined) {
    if (
      typeof body.content !== "string" ||
      !body.content.trim() ||
      body.content.length > 50000
    )
      throw new InputError("Note text is required (up to 50,000 characters)");
    data.content = body.content.trim();
  }
  if (body.page !== undefined) {
    const page =
      body.page === null || body.page === "" ? null : Number(body.page);
    if (
      page !== null &&
      (!Number.isInteger(page) || page < 0 || page > 1000000)
    )
      throw new InputError("Page must be a non-negative whole number");
    data.page = page;
  }
  for (const field of ["isQuote", "isPublic"] as const) {
    if (body[field] !== undefined) {
      if (typeof body[field] !== "boolean")
        throw new InputError(`${field} must be true or false`);
      data[field] = body[field];
    }
  }
  if (body.tags !== undefined) {
    if (typeof body.tags !== "string" || body.tags.length > 500)
      throw new InputError(
        "Tags must be comma-separated text (up to 500 characters)",
      );
    data.tags = [
      ...new Set(
        body.tags
          .split(",")
          .map((t) => t.trim().toLowerCase())
          .filter(Boolean),
      ),
    ].join(", ");
  }
  if (data.isQuote === false) data.isPublic = false;
  return data;
}
