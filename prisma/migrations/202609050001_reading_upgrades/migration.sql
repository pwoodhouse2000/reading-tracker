ALTER TABLE "Book" ADD COLUMN "audioMinutes" INTEGER;
ALTER TABLE "Book" ADD COLUMN "totalAudioMinutes" INTEGER;
ALTER TABLE "Book" ADD COLUMN "progressPercent" INTEGER;
ALTER TABLE "Note" ADD COLUMN "isQuote" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Note" ADD COLUMN "isPublic" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Note" ADD COLUMN "tags" TEXT NOT NULL DEFAULT '';
UPDATE "Note" SET "isQuote" = true WHERE substr(ltrim("content"), 1, 1) IN ('"', '“', '「');
CREATE TABLE "ReadingSession" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "bookId" TEXT NOT NULL,
  "dateStarted" DATETIME,
  "dateFinished" DATETIME,
  "status" TEXT NOT NULL,
  "rating" INTEGER,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ReadingSession_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "ReadingSession_bookId_idx" ON "ReadingSession"("bookId");
CREATE INDEX "ReadingSession_dateFinished_idx" ON "ReadingSession"("dateFinished");
