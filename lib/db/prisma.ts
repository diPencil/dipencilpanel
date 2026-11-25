import { PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import type { PoolConfig } from 'mariadb';

type PrismaClientWithAdapter = PrismaClient;

/**
 * Parse a `mysql://` / `mariadb://` connection string into a mariadb PoolConfig.
 * Keeping the parsing local means special characters in the password are handled
 * correctly and we can set sane pool defaults in one place.
 */
function parseDatabaseUrl(databaseUrl: string): PoolConfig {
  const url = new URL(databaseUrl);
  const database = decodeURIComponent(url.pathname.replace(/^\//, ''));

  if (!database) {
    throw new Error(
      'DATABASE_URL must include a database name, e.g. mysql://root@127.0.0.1:3306/dipencil_panel',
    );
  }

  return {
    host: url.hostname || '127.0.0.1',
    port: url.port ? Number(url.port) : 3306,
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database,
    connectionLimit: 10,
    // Required for MySQL 8+ accounts using caching_sha2_password over plain TCP.
    allowPublicKeyRetrieval: true,
  };
}

function createPrismaClient() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error(
      'DATABASE_URL is required for MySQL/MariaDB (e.g. mysql://root@127.0.0.1:3306/dipencil_panel).',
    );
  }

  const adapter = new PrismaMariaDb(parseDatabaseUrl(databaseUrl));
  return new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === 'development'
        ? ['error', 'warn']
        : ['error'],
  });
}

function getPrismaClient(): PrismaClientWithAdapter {
  if (process.env.NODE_ENV !== 'production' && globalThis.prismaGlobal) {
    return globalThis.prismaGlobal;
  }

  if (!globalThis.prismaGlobal) {
    globalThis.prismaGlobal = createPrismaClient();
  }

  return globalThis.prismaGlobal;
}

declare global {
  var prismaGlobal: undefined | PrismaClientWithAdapter;
}

export const prisma = new Proxy({} as PrismaClientWithAdapter, {
  get(_target, property) {
    const client = getPrismaClient();
    const value = (client as unknown as Record<string, unknown>)[
      property as string
    ];
    return typeof value === 'function' ? value.bind(client) : value;
  },
});
