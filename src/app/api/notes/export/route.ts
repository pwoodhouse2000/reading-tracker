import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { notesMarkdown } from "@/lib/markdown-export";
export async function GET(request: NextRequest) {
  const denied = await requireAuth();
  if (denied) return denied;
  const bookId = request.nextUrl.searchParams.get("bookId");
  const notes = await prisma.note.findMany({
    where: bookId ? { bookId } : undefined,
    include: { book: { select: { id: true, title: true, author: true } } },
    orderBy: { createdAt: "asc" },
  });
  return new NextResponse(notesMarkdown(notes), {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": 'attachment; filename="reading-notes.md"',
      "Cache-Control": "private, no-store",
    },
  });
}
