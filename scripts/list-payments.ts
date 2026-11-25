import 'dotenv/config';
import { prisma } from '../lib/db/prisma';

async function main() {
  const payments = await prisma.payment.findMany({
    orderBy: { date: 'desc' },
    take: 5,
    select: {
      id: true,
      amount: true,
      currency: true,
      method: true,
      status: true,
      invoiceId: true,
      clientId: true,
      companyId: true,
    },
  });
  console.log(JSON.stringify(payments, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
