-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

-- Create new Book table with mediaTypes instead of mediaType
CREATE TABLE "new_Book" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "mediaTypes" TEXT NOT NULL DEFAULT 'PAPER',
    "status" TEXT NOT NULL,
    "rating" INTEGER,
    "dateStarted" DATETIME,
    "dateFinished" DATETIME,
    "category" TEXT NOT NULL,
    "subCategory" TEXT,
    "summary" TEXT,
    "coverImageUrl" TEXT,
    "isbn" TEXT,
    "apiSource" TEXT,
    "thoughts" TEXT,
    "priority" INTEGER,
    "todoistTaskId" TEXT,
    "todoistSyncedAt" DATETIME,
    "notionPageId" TEXT,
    "importedFromNotion" BOOLEAN NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- Copy data from old table to new table, converting mediaType to mediaTypes
INSERT INTO "new_Book" SELECT 
    "id",
    "title",
    "author",
    "mediaType" as "mediaTypes",  -- Direct copy, single value becomes the new format
    "status",
    "rating",
    "dateStarted",
    "dateFinished",
    "category",
    "subCategory",
    "summary",
    "coverImageUrl",
    "isbn",
    "apiSource",
    "thoughts",
    "priority",
    "todoistTaskId",
    "todoistSyncedAt",
    "notionPageId",
    "importedFromNotion",
    "createdAt",
    "updatedAt"
FROM "Book";

-- Drop old table
DROP TABLE "Book";

-- Rename new table
ALTER TABLE "new_Book" RENAME TO "Book";

-- Recreate indexes
CREATE INDEX "Book_status_idx" ON "Book"("status");
CREATE INDEX "Book_category_idx" ON "Book"("category");
CREATE INDEX "Book_dateFinished_idx" ON "Book"("dateFinished");
CREATE INDEX "Book_priority_idx" ON "Book"("priority");

-- Recreate unique constraints
CREATE UNIQUE INDEX "Book_todoistTaskId_key" ON "Book"("todoistTaskId");
CREATE UNIQUE INDEX "Book_notionPageId_key" ON "Book"("notionPageId");

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
