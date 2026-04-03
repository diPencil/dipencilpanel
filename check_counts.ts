import { PrismaClient } from '@prisma/client';
import { PrismaLibSql } from '@prisma/adapter-libsql';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const dbPath = path.join(process.cwd(), 'dev.db');
const adapter = new PrismaLibSql({
  url: pathToFileURL(dbPath).href,
});
const prisma = new PrismaClient({ adapter });

async function check() {
  console.log('Inspecting:', dbPath);
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
  console.log('Companies names:', companies.map(c => c.name));

  const clients = await prisma.client.findMany({ take: 5 });
  console.log('Clients names (sample):', clients.map(c => c.name));
}

check().catch(console.error).finally(() => prisma.$disconnect());
