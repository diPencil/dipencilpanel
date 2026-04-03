import { PrismaClient } from '@prisma/client';
import { PrismaLibSql } from '@prisma/adapter-libsql';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const dbPath = path.join(process.cwd(), 'dev.db');
const adapter = new PrismaLibSql({
  url: pathToFileURL(dbPath).href,
});
const prisma = new PrismaClient({ adapter });

async function rescue() {
  console.log('Checking database at:', dbPath);
  const users = await prisma.user.findMany();
  if (users.length === 0) {
    console.log('--- ERROR: No users found in database! ---');
  } else {
    console.log('--- SUCCESS: Users exist ---');
    console.log('Users list:', users.map((u: { username: string }) => u.username));
  }
  
  const companies = await prisma.company.findMany();
  console.log('Companies found:', companies.length);
  if (companies.length > 0) {
     console.log('Company names:', companies.map((c: { name: string }) => c.name));
  }
}

rescue().catch(console.error).finally(() => prisma.$disconnect());
