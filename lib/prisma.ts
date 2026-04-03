import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { PrismaClient } from '@prisma/client';
import { PrismaLibSql } from '@prisma/adapter-libsql';

const getAdapterConfig = () => {
  // Production: Turso cloud database
  if (process.env.TURSO_DATABASE_URL) {
    return {
      url: process.env.TURSO_DATABASE_URL,
      authToken: process.env.TURSO_AUTH_TOKEN,
    };
  }
  // Development: local SQLite file — use DATABASE_URL if available
  const envUrl = process.env.DATABASE_URL;
  if (envUrl && envUrl.startsWith('file:')) {
    // Already in correct format for LibSQL adapter
    return { url: envUrl };
  }
  
  const dbPath = path.join(process.cwd(), 'dev.db');
  return {
    url: pathToFileURL(dbPath).href,
  };
};

const prismaClientSingleton = () => {
  const adapter = new PrismaLibSql(getAdapterConfig());
  return new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === 'development'
        ? ['error', 'warn']
        : ['error'],
  });
};

declare global {
  // eslint-disable-next-line no-var
  var prismaGlobal: undefined | ReturnType<typeof prismaClientSingleton>;
}

export const prisma = globalThis.prismaGlobal ?? prismaClientSingleton();

if (process.env.NODE_ENV !== 'production') globalThis.prismaGlobal = prisma;
