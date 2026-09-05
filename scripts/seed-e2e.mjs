import { createClient } from "@libsql/client";
const client = createClient({ url: "file:./.e2e.db" });
await client.execute(
  "DELETE FROM Book WHERE id IN ('e2e-reading','e2e-queued','e2e-next','e2e-finished')",
);
// Fixed disposable fixture IDs. Never connects to a remote database.
for (const [id, title, status, category, pages] of [
  ["e2e-reading", "Current Voyage", "READING", "FICTION", 200],
  ["e2e-queued", "The Next Adventure", "TO_READ", "NON_FICTION", 160],
  ["e2e-next", "A Quiet Reflection", "NEXT_UP", "FICTION", 320],
  ["e2e-finished", "A Completed Journey", "FINISHED", "FICTION", 200],
]) {
  await client.execute({
    sql: "INSERT OR IGNORE INTO Book (id,title,author,status,category,mediaTypes,totalPages,summary,thoughts,dateStarted,dateFinished,createdAt,updatedAt) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)",
    args: [
      id,
      title,
      "Test Author",
      status,
      category,
      "PAPER,AUDIOBOOK",
      pages,
      "An adventure novel for reflection",
      "Private test thoughts",
      "2026-01-01T00:00:00.000Z",
      status === "FINISHED" ? "2026-02-01T00:00:00.000Z" : null,
      new Date().toISOString(),
      new Date().toISOString(),
    ],
  });
}
client.close();
