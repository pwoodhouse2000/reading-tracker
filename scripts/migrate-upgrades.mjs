import { createClient } from "@libsql/client";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const gcp = process.argv.includes("--gcp");
function secret(name) {
  return execFileSync(
    "gcloud",
    [
      "secrets",
      "versions",
      "access",
      "latest",
      "--secret",
      name,
      "--project",
      "notion-todoist-sync-464419",
    ],
    { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
  ).trim();
}
const url = gcp ? secret("TURSO_DATABASE_URL") : process.env.DATABASE_URL;
if (!url)
  throw new Error(
    "Set DATABASE_URL for a local database or pass --gcp for the Reading tracker deployment",
  );
const client = createClient({
  url,
  authToken: gcp ? secret("TURSO_AUTH_TOKEN") : undefined,
});
const tx = await client.transaction("write");
try {
  const columns = await tx.execute('PRAGMA table_info("Book")');
  if (columns.rows.some((r) => r.name === "audioMinutes")) {
    const noteColumns = await tx.execute('PRAGMA table_info("Note")');
    const history = await tx.execute(
      "SELECT name FROM sqlite_master WHERE name='ReadingSession'",
    );
    if (
      !noteColumns.rows.some((r) => r.name === "isPublic") ||
      !history.rows.length
    )
      throw new Error("Partial schema detected; refusing to continue");
    console.log("Reading upgrades schema already present");
    await tx.rollback();
  } else {
    if (!columns.rows.some((r) => r.name === "currentPage"))
      throw new Error(
        "Expected the page-progress schema before this migration",
      );
    const tables = await tx.execute(
      "SELECT name, sql FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'",
    );
    const snapshot = { createdAt: new Date().toISOString(), tables: [] };
    for (const table of tables.rows) {
      const name = String(table.name);
      const rows = await tx.execute(
        `SELECT * FROM "${name.replaceAll('"', '""')}"`,
      );
      snapshot.tables.push({ name, sql: table.sql, rows: rows.rows });
    }
    mkdirSync("backups", { recursive: true, mode: 0o700 });
    const path = resolve("backups", `reading-tracker-${Date.now()}.json`);
    writeFileSync(
      path,
      JSON.stringify(snapshot, (_k, v) =>
        typeof v === "bigint" ? v.toString() : v,
      ),
      { mode: 0o600, flag: "wx" },
    );
    const sql = readFileSync(
      new URL(
        "../prisma/migrations/202609050001_reading_upgrades/migration.sql",
        import.meta.url,
      ),
      "utf8",
    );
    await tx.executeMultiple(sql);
    const notes = await tx.execute('SELECT COUNT(*) AS count FROM "Note"');
    const books = await tx.execute('SELECT COUNT(*) AS count FROM "Book"');
    await tx.commit();
    console.log(
      JSON.stringify({
        migrated: true,
        books: books.rows[0].count,
        notes: notes.rows[0].count,
        backup: path,
      }),
    );
  }
} catch (error) {
  await tx.rollback();
  throw error;
} finally {
  tx.close();
  client.close();
}
