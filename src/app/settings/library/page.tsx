"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { ShelfBook } from "@/lib/library-tools";
type Data = {
  books: ShelfBook[];
  duplicatePairs: Array<{
    first: ShelfBook;
    second: ShelfBook;
    reason: string;
  }>;
  metadata: Array<{ book: ShelfBook; category: string; reason: string }>;
};
export default function LibraryMaintenance() {
  const [data, setData] = useState<Data | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [category, setCategory] = useState("FICTION");
  const [subCategory, setSubCategory] = useState("");
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function load() {
    try {
      const res = await fetch("/api/library?mode=cleanup");
      if (!res.ok) throw new Error("Sign in to manage your library");
      setData(await res.json());
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Could not load library");
    }
  }
  useEffect(() => {
    load();
  }, []);
  async function update(ids: string[], value: string, bulk = false) {
    setBusy(true);
    setMessage("");
    try {
      const res = await fetch("/api/library", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ids,
          category: value,
          ...(bulk && subCategory ? { subCategory } : {}),
        }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      setMessage(`Updated ${result.count} books`);
      setSelected([]);
      await load();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Could not save");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold">Library cleanup</h1>
      <p>
        Review possible duplicates and metadata suggestions. Different editions
        may be intentional.
      </p>
      {message && <p role="status">{message}</p>}
      {!data ? (
        <Button onClick={load}>Load library</Button>
      ) : (
        <>
          <section className="border rounded-xl p-5 space-y-3">
            <h2 className="text-xl font-semibold">
              Possible duplicates ({data.duplicatePairs.length})
            </h2>
            {!data.duplicatePairs.length ? (
              <p>No matching titles/authors or ISBNs found.</p>
            ) : (
              data.duplicatePairs.map(({ first, second, reason }) => (
                <div className="border-b py-3" key={`${first.id}-${second.id}`}>
                  <p>{reason}</p>
                  <Link className="underline" href={`/books/${first.id}`}>
                    {first.title} — {first.author} ({first.status})
                  </Link>
                  <span> / </span>
                  <Link className="underline" href={`/books/${second.id}`}>
                    {second.title} — {second.author} ({second.status})
                  </Link>
                </div>
              ))
            )}
          </section>
          <section className="border rounded-xl p-5 space-y-3">
            <h2 className="text-xl font-semibold">
              Category suggestions ({data.metadata.length})
            </h2>
            {!data.metadata.length && <p>No category mismatches detected.</p>}
            {data.metadata.map((s) => (
              <div
                className="flex flex-wrap gap-3 items-center border-b py-3"
                key={s.book.id}
              >
                <div className="flex-1">
                  <Link
                    className="font-semibold underline"
                    href={`/books/${s.book.id}/edit`}
                  >
                    {s.book.title}
                  </Link>
                  <p className="text-sm text-muted-foreground">{s.reason}</p>
                </div>
                <Button
                  disabled={busy}
                  variant="outline"
                  onClick={() => update([s.book.id], s.category)}
                >
                  Change to Fiction
                </Button>
              </div>
            ))}
          </section>
          <section className="border rounded-xl p-5 space-y-4">
            <h2 className="text-xl font-semibold">Bulk categories</h2>
            <input
              aria-label="Find books to edit"
              placeholder="Search title or author"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full border rounded-lg p-3 bg-background"
            />
            <div className="flex flex-wrap gap-3">
              <label>
                Category
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="block border rounded p-2 bg-background"
                >
                  <option value="FICTION">Fiction</option>
                  <option value="NON_FICTION">Non-Fiction</option>
                </select>
              </label>
              <label>
                Sub-category (optional)
                <input
                  value={subCategory}
                  onChange={(e) => setSubCategory(e.target.value)}
                  placeholder="Keep existing if blank"
                  className="block border rounded p-2 bg-background"
                />
              </label>
              <Button
                disabled={busy || !selected.length}
                onClick={() => update(selected, category, true)}
              >
                Update {selected.length} selected
              </Button>
            </div>
            <div className="max-h-96 overflow-auto">
              {data.books
                .filter((b) =>
                  `${b.title} ${b.author}`
                    .toLowerCase()
                    .includes(search.toLowerCase()),
                )
                .map((b) => (
                  <label key={b.id} className="flex gap-3 border-b py-3">
                    <input
                      type="checkbox"
                      checked={selected.includes(b.id)}
                      onChange={(e) =>
                        setSelected(
                          e.target.checked
                            ? [...selected, b.id]
                            : selected.filter((id) => id !== b.id),
                        )
                      }
                    />
                    <span>
                      {b.title}{" "}
                      <span className="text-sm text-muted-foreground">
                        — {b.author} ·{" "}
                        {b.category === "FICTION" ? "Fiction" : "Non-Fiction"}
                      </span>
                    </span>
                  </label>
                ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
