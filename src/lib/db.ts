import { createClient } from '@libsql/client';

// Create libsql client for both local and production
// For local: uses file:./dev.db
// For production with Turso: uses libsql://... URL
export const libsqlClient = createClient({
  url: process.env.TURSO_DATABASE_URL || process.env.DATABASE_URL || 'file:./dev.db',
  authToken: process.env.TURSO_AUTH_TOKEN,
});
