"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { ShelfBook } from "@/lib/library-tools";
export function NextBook() {
  const [mood, setMood] = useState("");
  const [format, setFormat] = useState("");
  const [hours, setHours] = useState("");
  const [picks, setPicks] = useState<
    Array<{ book: ShelfBook; reasons: string[]; estimatedHours: number | null }>
  >([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const abort = new AbortController();
    setLoading(true);
    setError("");
    fetch(`/api/library?${new URLSearchParams({ mood, format, hours })}`, {
      signal: abort.signal,
    })
      .then(async (res) => {
        if (!res.ok) throw new Error("Could not load your shelf");
        return res.json();
      })
      .then((data) => setPicks(data.picks))
      .catch((e) => {
        if (e.name !== "AbortError") setError(e.message);
      })
      .finally(() => {
        if (!abort.signal.aborted) setLoading(false);
      });
    return () => abort.abort();
  }, [mood, format, hours, retry]);
  return (
    <section className="rounded-2xl border bg-card p-6 space-y-5">
      <div>
        <h2 className="text-2xl font-semibold">Choose my next book</h2>
        <p className="text-muted-foreground">
          Three possibilities from books you already want to read.
        </p>
      </div>
      <div className="flex flex-wrap gap-4">
        <label>
          Mood
          <select
            aria-label="Reading mood"
            value={mood}
            onChange={(e) => setMood(e.target.value)}
            className="block border rounded-lg bg-background p-2"
          >
            <option value="">Any mood</option>
            <option value="escape">Escape</option>
            <option value="reflect">Reflect</option>
            <option value="learn">Learn</option>
          </select>
        </label>
        <label>
          Format
          <select
            aria-label="Reading format"
            value={format}
            onChange={(e) => setFormat(e.target.value)}
            className="block border rounded-lg bg-background p-2"
          >
            <option value="">Any format</option>
            <option value="PAPER">Paper</option>
            <option value="EBOOK">E-book</option>
            <option value="AUDIOBOOK">Audiobook</option>
          </select>
        </label>
        <label>
          Time for a book
          <select
            aria-label="Reading time"
            value={hours}
            onChange={(e) => setHours(e.target.value)}
            className="block border rounded-lg bg-background p-2"
          >
            <option value="">Any length</option>
            <option value="5">Up to 5 hours</option>
            <option value="10">Up to 10 hours</option>
            <option value="20">Up to 20 hours</option>
          </select>
        </label>
      </div>
      <p className="text-xs text-muted-foreground">
        Time estimates use 40 pages/hour, not audiobook duration. A time limit
        excludes books with unknown page counts. Mood prioritizes matching
        themes.
      </p>
      {loading ? (
        <p role="status">Looking through your shelf…</p>
      ) : error ? (
        <p role="alert">
          {error} <Button onClick={() => setRetry(retry + 1)}>Retry</Button>
        </p>
      ) : !picks.length ? (
        <p>No books match these filters. Try another format or any length.</p>
      ) : (
        <div className="grid md:grid-cols-3 gap-4">
          {picks.map(({ book, reasons, estimatedHours }) => (
            <article key={book.id} className="rounded-xl border p-4 space-y-3">
              <Link
                href={`/books/${book.id}`}
                className="font-semibold text-lg hover:underline"
              >
                {book.title}
              </Link>
              <p className="text-sm">{book.author}</p>
              <p className="text-sm text-muted-foreground">
                {reasons.join(" · ")}
              </p>
              <p className="text-xs">
                {estimatedHours
                  ? `About ${estimatedHours} hours · ${book.totalPages} pages`
                  : "Length unknown"}
              </p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
