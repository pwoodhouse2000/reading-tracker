import { createClient } from "@libsql/client";
import { mkdtempSync, readdirSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { execFileSync } from "node:child_process";
import assert from "node:assert/strict";
const dir = mkdtempSync(join(tmpdir(), "reading-migration-"));
const url = `file:${join(dir, "test.db")}`;
let client = createClient({ url });
for (const name of readdirSync("prisma/migrations")
  .filter((n) => /^\d/.test(n) && n < "202609")
  .sort())
  await client.executeMultiple(
    readFileSync(`prisma/migrations/${name}/migration.sql`, "utf8"),
  );
await client.execute(
  "INSERT INTO Book (id,title,author,status,category,updatedAt) VALUES ('migration-test','Example','Author','FINISHED','FICTION',CURRENT_TIMESTAMP)",
);
await client.execute(
  "INSERT INTO Note (id,bookId,content,updatedAt) VALUES ('note-test','migration-test','\"Preserved quote\"',CURRENT_TIMESTAMP)",
);
execFileSync(process.execPath, [resolve("scripts/migrate-upgrades.mjs")], {
  cwd: dir,
  env: { ...process.env, DATABASE_URL: url },
  stdio: "pipe",
});
// Reopen after another process changes the schema: libsql caches column metadata.
client.close();
client = createClient({ url });
const note = (await client.execute("SELECT * FROM Note")).rows[0];
assert.equal(note.content, '"Preserved quote"');
assert.equal(Number(note.isPublic), 0);
assert.equal(Number(note.isQuote), 1);
assert.equal(
  (await client.execute("SELECT COUNT(*) AS count FROM Book")).rows[0].count,
  1,
);
execFileSync(process.execPath, [resolve("scripts/migrate-upgrades.mjs")], {
  cwd: dir,
  env: { ...process.env, DATABASE_URL: url },
  stdio: "pipe",
});
client.close();
console.log(
  "Migration preserves books/notes, defaults to private, and safely skips repeat runs.",
);
