const { createClient } = require('@libsql/client');
const fs = require('fs');

const client = createClient({
  url: 'libsql://reading-tracker-pwoodhouse2000.aws-us-west-2.turso.io',
  authToken: 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NjgxMDU4NDYsImlkIjoiZmIzNmM3MjEtOTY4My00NDJjLThiNGMtZThlOGU5YjUxOGU1IiwicmlkIjoiMzVmNDc2N2ItZGFjMS00MmUxLWFiNjYtZDYwN2I1OTgwYWI4In0.bOaoDvqAugoNWwdMulecSLhByRE5nCPxdUIsQABnHf_yo5ShEVf91z_EspT8ad7BtSh8TSUqeGLt6evNjaceAQ'
});

async function migrate() {
  try {
    console.log('Checking current schema...');
    const result = await client.execute("PRAGMA table_info(Book);");
    console.log('Current Book table columns:', result.rows.map(r => r.name).join(', '));
    
    // Check if mediaTypes column exists
    const hasMediaTypes = result.rows.some(r => r.name === 'mediaTypes');
    const hasMediaType = result.rows.some(r => r.name === 'mediaType');
    
    if (hasMediaTypes) {
      console.log('✓ Migration already applied! mediaTypes column exists.');
      return;
    }
    
    if (!hasMediaType) {
      console.log('⚠ Warning: Neither mediaType nor mediaTypes column found!');
      return;
    }
    
    console.log('Applying migration...');
    
    const migration = fs.readFileSync('prisma/migrations/20260111081816_change_media_type_to_multiple/migration.sql', 'utf8');
    
    // Split by semicolon but be careful with PRAGMA statements
    const statements = migration
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    for (const stmt of statements) {
      if (stmt) {
        console.log(`Executing: ${stmt.substring(0, 50)}...`);
        await client.execute(stmt);
      }
    }
    
    console.log('✓ Migration completed successfully!');
    
    // Verify
    const verify = await client.execute("PRAGMA table_info(Book);");
    console.log('New Book table columns:', verify.rows.map(r => r.name).join(', '));
    
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    client.close();
  }
}

migrate();
