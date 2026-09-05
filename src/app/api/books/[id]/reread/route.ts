import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-guard";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const denied = await requireAuth();
  if (denied) return denied;
  const { id } = await params;
  try {
    const result = await prisma.$transaction(async (tx) => {
      const book = await tx.book.findUnique({ where: { id } });
      if (!book) return null;
      if (!["FINISHED", "DNF"].includes(book.status)) return false;
      await tx.readingSession.create({
        data: {
          bookId: id,
          status: book.status,
          dateStarted: book.dateStarted,
          dateFinished: book.dateFinished,
          rating: book.rating,
        },
      });
      return tx.book.update({
        where: { id },
        data: {
          status: "READING",
          dateStarted: new Date(),
          dateFinished: null,
          rating: null,
          currentPage: 0,
          audioMinutes: 0,
          progressPercent: 0,
        },
      });
    });
    if (result === null)
      return NextResponse.json({ error: "Book not found" }, { status: 404 });
    if (result === false)
      return NextResponse.json(
        {
          error: "Finish or stop the current reading before starting a reread",
        },
        { status: 409 },
      );
    return NextResponse.json(result);
  } catch (error) {
    console.error("Reread failed", error);
    return NextResponse.json(
      { error: "Could not start reread. Your existing history is unchanged." },
      { status: 500 },
    );
  }
}
