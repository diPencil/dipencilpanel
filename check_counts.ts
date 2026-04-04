import { prisma } from './lib/prisma';

async function check() {
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
