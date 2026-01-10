import { PrismaClient } from '@prisma/client';
import { PrismaLibSql } from '@prisma/adapter-libsql';

// Create Prisma client with libsql adapter
// Works with both local SQLite and Turso (production)
const globalForPrisma = global as unknown as { prisma: PrismaClient };

const createPrismaClient = () => {
  const dbUrl = process.env.TURSO_DATABASE_URL || process.env.DATABASE_URL || 'file:./dev.db';

  const adapter = new PrismaLibSql({
    url: dbUrl,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });
};

export const prisma = globalForPrisma.prisma || createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
