import 'dotenv/config';
import { prisma } from '../lib/db/prisma';

async function main() {
  const company = await prisma.company.findFirstOrThrow();
  const client = await prisma.client.create({
    data: {
      name: '__smoke_test__',
      email: 'smoke@example.test',
      companyId: company.id,
    },
  });
  const found = await prisma.client.findFirst({
    where: { id: client.id, companyId: company.id },
  });
  await prisma.client.delete({ where: { id: client.id } });

  console.log('company:', company.name);
  console.log('client roundtrip:', found?.name === '__smoke_test__' ? 'ok' : 'FAILED');
  console.log('counts:', {
    users: await prisma.user.count(),
    clients: await prisma.client.count(),
    invoices: await prisma.invoice.count(),
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
