# Reading maintenance and upgrades

## Behavior

- Library status, search, category, year, sort and view are saved in the URL. The client receives the full public library so changing status cannot filter an already restricted subset.
- Resuming preserves the original start date. Finish dates are not overwritten by repeated finish requests. The API validates fields, dates, ratings and progress bounds.
- The dashboard shows every current book with quick progress, the Next Up queue and an admin-only backlog picker.
- The picker ranks actual queued books using priorities, preferred authors/genres, and keyword matches for mood. Time is an estimate at 40 pages/hour, not listening duration. Unknown-length books remain available with Any length.
- Cleanup detects exact normalized title/author or ISBN pairs. Metadata suggestions use genre/description clues; each correction is reviewed in the UI. Bulk edits change selected categories without deleting books.
- ReadingSession archives dates, rating and outcome when starting a reread. Reports/goals count completed readings including archived readings. Current library status counts still count unique books. Prior notes remain attached to the book.
- Notes and thoughts are private, including pre-existing notes. Only quotes explicitly marked public are exposed to visitors. All note reads and personalized book responses use no-store headers. The service worker clears older cache versions and avoids book/detail pages.
- Quote type is saved explicitly. Notes support comma-separated tags, Markdown/Obsidian export and a daily quote chosen on the Notes page; no external notification subscription is created.
- AI discovery checks the entire library to remove existing titles and duplicate suggestions. Todoist uses the [current API v1](https://developer.todoist.com/api/v1/) with cursor pagination.

## Validation

Run `npm run lint`, `npm run typecheck`, `npm test -- --runInBand`, `npm audit --audit-level=high`, and `npm run build`.

`node scripts/check-migration.mjs` rehearses the production migration on a disposable old-schema SQLite database and checks count/content preservation and repeat runs.

For browser tests, set DATABASE_URL to an **absolute** file URL ending in `.e2e.db` in this checkout, run `npx prisma migrate deploy`, `node scripts/seed-e2e.mjs`, `npx playwright install chromium`, then `npm run test:e2e`. The seed script only resets its four fixed fixture IDs in this dedicated local database. Test credentials are only used for the local HTTP server; production cookies remain Secure.

## Release and recovery

Before the first deployment of this release, run `node scripts/migrate-upgrades.mjs --gcp` from the checkout. It reads the configured Reading tracker secrets in memory, takes a private JSON snapshot under `backups/` while holding the write transaction, then adds columns and the history table. It preserves all book/note records and does not invoke Todoist sync. Keep the printed backup path. Snapshots and test artifacts are excluded from Git, Cloud Build uploads and Docker.

The migration is additive. A code rollback can route traffic to the prior Cloud Run revision while retaining the new columns and table. Do not restore the full database snapshot over subsequent user edits; selective recovery should be reviewed against the current data first.

Pull requests run tests, lint, typechecking, audit, build, migration rehearsal and browser checks before merge. Pushing main deploys through the existing Cloud Build workflow. Runtime and CI use Node 24, following the [Node release schedule](https://nodejs.org/en/about/previous-releases). ESLint uses the [Next.js flat configuration](https://nextjs.org/docs/app/api-reference/config/eslint).

The transitive deepmerge-ts and mysql2 overrides remove audited vulnerable versions used by the Prisma CLI. Prisma generation, migration rehearsal, application build and real database browser tests validate the upgraded dependency graph.
