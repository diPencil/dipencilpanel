import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

type PrismaClientWithAdapter = PrismaClient;

function createPrismaClient() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required for PostgreSQL.');
  }

  const adapter = new PrismaPg({ connectionString: databaseUrl });
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
  // eslint-disable-next-line no-var
  var prismaGlobal: undefined | PrismaClientWithAdapter;
}

export const prisma = new Proxy({} as PrismaClientWithAdapter, {
  get(_target, property) {
    const client = getPrismaClient();
    const value = (client as Record<string, unknown>)[property as string];
    return typeof value === 'function' ? value.bind(client) : value;
  },
});
