-- CreateTable
CREATE TABLE "Book" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "mediaType" TEXT NOT NULL,
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
    "importedFromNotion" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Note" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bookId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "page" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Note_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TodoistSync" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "lastSyncedAt" DATETIME NOT NULL,
    "syncStatus" TEXT NOT NULL,
    "errorMessage" TEXT,
    "itemsSynced" INTEGER NOT NULL DEFAULT 0
);

-- CreateTable
CREATE TABLE "NotionImport" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "importedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "itemsImported" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "errorDetails" TEXT
);

-- CreateIndex
CREATE UNIQUE INDEX "Book_todoistTaskId_key" ON "Book"("todoistTaskId");

-- CreateIndex
CREATE UNIQUE INDEX "Book_notionPageId_key" ON "Book"("notionPageId");

-- CreateIndex
CREATE INDEX "Book_status_idx" ON "Book"("status");

-- CreateIndex
CREATE INDEX "Book_category_idx" ON "Book"("category");

-- CreateIndex
CREATE INDEX "Book_dateFinished_idx" ON "Book"("dateFinished");

-- CreateIndex
CREATE INDEX "Book_priority_idx" ON "Book"("priority");

-- CreateIndex
CREATE INDEX "Note_bookId_idx" ON "Note"("bookId");
