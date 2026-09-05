"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";

type Session = {
  id: string;
  status: string;
  dateStarted: Date | string | null;
  dateFinished: Date | string | null;
  rating: number | null;
};
export function ReadingControls({
  book,
}: {
  book: {
    id: string;
    status: string;
    mediaTypes: string;
    audioMinutes: number | null;
    totalAudioMinutes: number | null;
    progressPercent: number | null;
    readingSessions?: Session[];
  };
}) {
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function save(data: object, reread = false) {
    setBusy(true);
    setMessage("");
    try {
      const res = await fetch(
        `/api/books/${book.id}${reread ? "/reread" : ""}`,
        {
          method: reread ? "POST" : "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        },
      );
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Could not save");
      setMessage("Saved");
      router.refresh();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Could not save");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="rounded-xl border bg-card p-4 space-y-4">
      <h3 className="font-semibold">Reading status</h3>
      {isAuthenticated && (
        <>
          <label className="block">
            Status{" "}
            <select
              aria-label="Reading status"
              value={book.status}
              disabled={busy}
              onChange={(e) => save({ status: e.target.value })}
              className="w-full border rounded-lg bg-background p-2"
            >
              {Object.entries({
                TO_READ: "To Read",
                NEXT_UP: "Next Up",
                READING: "Reading",
                PAUSED: "Paused",
                FINISHED: "Finished",
                DNF: "Did not finish",
              }).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          {["FINISHED", "DNF"].includes(book.status) && (
            <Button disabled={busy} onClick={() => save({}, true)}>
              Start a reread
            </Button>
          )}
          <p className="text-xs text-muted-foreground">
            Starting a reread preserves the previous dates and rating below.
          </p>
          <form
            key={`${book.audioMinutes}-${book.totalAudioMinutes}-${book.progressPercent}`}
            className="space-y-2"
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              const data: Record<string, number | null> = {};
              for (const [k, v] of f) data[k] = v === "" ? null : Number(v);
              save(data);
            }}
          >
            {book.mediaTypes.includes("AUDIOBOOK") && (
              <>
                <label className="block text-sm">
                  Minutes listened
                  <input
                    aria-label="Minutes listened"
                    name="audioMinutes"
                    type="number"
                    min="0"
                    defaultValue={book.audioMinutes ?? ""}
                    className="w-full border rounded p-2 bg-background"
                  />
                </label>
                <label className="block text-sm">
                  Total audio minutes
                  <input
                    aria-label="Total audio minutes"
                    name="totalAudioMinutes"
                    type="number"
                    min="1"
                    defaultValue={book.totalAudioMinutes ?? ""}
                    className="w-full border rounded p-2 bg-background"
                  />
                </label>
              </>
            )}
            <label className="block text-sm">
              Progress (%)
              <input
                aria-label="Progress percent"
                name="progressPercent"
                type="number"
                min="0"
                max="100"
                defaultValue={book.progressPercent ?? ""}
                className="w-full border rounded p-2 bg-background"
              />
            </label>
            <Button type="submit" disabled={busy} variant="outline">
              Save progress
            </Button>
          </form>
        </>
      )}
      {book.audioMinutes !== null && (
        <p>
          {book.audioMinutes} / {book.totalAudioMinutes ?? "?"} minutes listened
        </p>
      )}
      {book.progressPercent !== null && <p>{book.progressPercent}% complete</p>}
      {message && <p role="status">{message}</p>}
      {!!book.readingSessions?.length && (
        <div>
          <h4 className="font-semibold">Previous readings</h4>
          <ul className="space-y-2 mt-2">
            {book.readingSessions.map((s) => (
              <li key={s.id} className="text-sm">
                {s.status === "FINISHED" ? "Finished" : "Did not finish"} ·{" "}
                {s.dateStarted
                  ? new Date(s.dateStarted).toLocaleDateString()
                  : "Unknown start"}{" "}
                –{" "}
                {s.dateFinished
                  ? new Date(s.dateFinished).toLocaleDateString()
                  : "No finish date"}
                {s.rating ? ` · ${s.rating}/5` : ""}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
