import { PrismaClient } from '@prisma/client';
import { PrismaLibSql } from '@prisma/adapter-libsql';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

// Checking the one in prisma folder
const dbPath = path.join(process.cwd(), 'prisma', 'dev.db');
const adapter = new PrismaLibSql({
  url: pathToFileURL(dbPath).href,
});
const prisma = new PrismaClient({ adapter });

async function check() {
  console.log('Inspecting:', dbPath);
  try {
    const userCount = await prisma.user.count();
    const companyCount = await prisma.company.count();
    const clientCount = await prisma.client.count();
    const domainCount = await prisma.domain.count();
    
    console.log('--- DB SUMMARY ---');
    console.log('Users:', userCount);
    console.log('Companies:', companyCount);
    console.log('Clients:', clientCount);
    console.log('Domains:', domainCount);
    
    const companies = await prisma.company.findMany();
    console.log('Companies names:', companies.map((c: { name: string }) => c.name));
  } catch (e) {
    console.error('Error reading this DB:', e instanceof Error ? e.message : String(e));
  }
}

check().catch(console.error).finally(() => prisma.$disconnect());
