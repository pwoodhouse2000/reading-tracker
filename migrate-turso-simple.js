const { createClient } = require('@libsql/client');

const client = createClient({
  url: 'libsql://reading-tracker-pwoodhouse2000.aws-us-west-2.turso.io',
  authToken: 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NjgxMDU4NDYsImlkIjoiZmIzNmM3MjEtOTY4My00NDJjLThiNGMtZThlOGU5YjUxOGU1IiwicmlkIjoiMzVmNDc2N2ItZGFjMS00MmUxLWFiNjYtZDYwN2I1OTgwYWI4In0.bOaoDvqAugoNWwdMulecSLhByRE5nCPxdUIsQABnHf_yo5ShEVf91z_EspT8ad7BtSh8TSUqeGLt6evNjaceAQ'
});

async function migrate() {
  try {
    console.log('Checking current schema...');
    const result = await client.execute("PRAGMA table_info(Book);");
    console.log('Current columns:', result.rows.map(r => r.name).join(', '));
    
    // Check if mediaTypes column exists
    const hasMediaTypes = result.rows.some(r => r.name === 'mediaTypes');
    
    if (hasMediaTypes) {
      console.log('✓ Migration already applied! mediaTypes column exists.');
      client.close();
      return;
    }
    
    console.log('\nApplying migration (simplified approach)...');
    
    // Step 1: Disable foreign keys temporarily
    await client.execute("PRAGMA foreign_keys=OFF");
    console.log('✓ Disabled foreign keys');
    
    // Step 2: Create new table with mediaTypes column
    await client.execute(`
      CREATE TABLE "Book_new" (
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
      )
    `);
    console.log('✓ Created new table');
    
    // Step 3: Copy data, converting mediaType to mediaTypes
    await client.execute(`
      INSERT INTO "Book_new" 
      SELECT 
        "id",
        "title",
        "author",
        "mediaType" as "mediaTypes",
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
      FROM "Book"
    `);
    console.log('✓ Copied data');
    
    // Step 4: Drop old table
    await client.execute('DROP TABLE "Book"');
    console.log('✓ Dropped old table');
    
    // Step 5: Rename new table
    await client.execute('ALTER TABLE "Book_new" RENAME TO "Book"');
    console.log('✓ Renamed table');
    
    // Step 6: Recreate indexes (only if they don't exist)
    try {
      await client.execute('CREATE INDEX "Book_status_idx" ON "Book"("status")');
      console.log('✓ Created status index');
    } catch (e) {
      console.log('  (status index already exists)');
    }
    
    try {
      await client.execute('CREATE INDEX "Book_category_idx" ON "Book"("category")');
      console.log('✓ Created category index');
    } catch (e) {
      console.log('  (category index already exists)');
    }
    
    try {
      await client.execute('CREATE INDEX "Book_dateFinished_idx" ON "Book"("dateFinished")');
      console.log('✓ Created dateFinished index');
    } catch (e) {
      console.log('  (dateFinished index already exists)');
    }
    
    try {
      await client.execute('CREATE INDEX "Book_priority_idx" ON "Book"("priority")');
      console.log('✓ Created priority index');
    } catch (e) {
      console.log('  (priority index already exists)');
    }
    
    try {
      await client.execute('CREATE UNIQUE INDEX "Book_todoistTaskId_key" ON "Book"("todoistTaskId")');
      console.log('✓ Created todoistTaskId unique index');
    } catch (e) {
      console.log('  (todoistTaskId unique index already exists)');
    }
    
    try {
      await client.execute('CREATE UNIQUE INDEX "Book_notionPageId_key" ON "Book"("notionPageId")');
      console.log('✓ Created notionPageId unique index');
    } catch (e) {
      console.log('  (notionPageId unique index already exists)');
    }
    
    // Step 7: Re-enable foreign keys
    await client.execute("PRAGMA foreign_keys=ON");
    console.log('✓ Re-enabled foreign keys');
    
    console.log('\n✅ Migration completed successfully!');
    
    // Verify
    const verify = await client.execute("PRAGMA table_info(Book)");
    console.log('\nNew columns:', verify.rows.map(r => r.name).join(', '));
    
    // Count records
    const count = await client.execute("SELECT COUNT(*) as count FROM Book");
    console.log(`Total books: ${count.rows[0].count}`);
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  } finally {
    client.close();
  }
}

migrate();
