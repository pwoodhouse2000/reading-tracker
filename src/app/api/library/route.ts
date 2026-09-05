import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-guard";
import { chooseNext, cleanupSuggestions } from "@/lib/library-tools";
import { privateHeaders } from "@/lib/privacy";
export async function GET(request: NextRequest) {
  const denied = await requireAuth();
  if (denied) return denied;
  const p = request.nextUrl.searchParams;
  const books = await prisma.book.findMany({
    select: {
      id: true,
      title: true,
      author: true,
      status: true,
      category: true,
      subCategory: true,
      summary: true,
      isbn: true,
      mediaTypes: true,
      totalPages: true,
      priority: true,
      rating: true,
    },
    orderBy: { title: "asc" },
  });
  if (p.get("mode") === "cleanup")
    return NextResponse.json(
      { books, ...cleanupSuggestions(books) },
      { headers: privateHeaders },
    );
  const hours = Number(p.get("hours") || 0);
  if (!Number.isFinite(hours) || hours < 0 || hours > 1000)
    return NextResponse.json(
      { error: "Invalid reading time" },
      { status: 400 },
    );
  return NextResponse.json(
    {
      picks: chooseNext(books, {
        mood: p.get("mood") || "",
        format: p.get("format") || "",
        hours,
      }),
    },
    { headers: privateHeaders },
  );
}
export async function PATCH(request: NextRequest) {
  const denied = await requireAuth();
  if (denied) return denied;
  try {
    const { ids, category, subCategory } = await request.json();
    if (
      !Array.isArray(ids) ||
      !ids.length ||
      ids.length > 500 ||
      ids.some((id) => typeof id !== "string") ||
      !["FICTION", "NON_FICTION"].includes(category) ||
      (subCategory !== undefined &&
        (typeof subCategory !== "string" || subCategory.length > 200))
    )
      return NextResponse.json(
        { error: "Select books and a valid category" },
        { status: 400 },
      );
    const result = await prisma.book.updateMany({
      where: { id: { in: ids } },
      data: {
        category,
        subCategory:
          subCategory === undefined ? undefined : subCategory || null,
      },
    });
    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { error: "Could not update selected books" },
      { status: 400 },
    );
  }
}
