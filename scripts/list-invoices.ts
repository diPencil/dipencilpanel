import 'dotenv/config';
import { prisma } from '../lib/db/prisma';

async function main() {
  const invoices = await prisma.invoice.findMany({
    orderBy: { createdAt: 'desc' },
    take: 3,
    select: {
      id: true,
      number: true,
      clientId: true,
      companyId: true,
      currency: true,
      status: true,
      paymentStatus: true,
      subtotal: true,
      discountAmount: true,
      vatAmount: true,
      total: true,
      items: true,
    },
  });
  for (const inv of invoices) {
    const invariant = Math.abs(inv.total - (inv.subtotal - inv.discountAmount + inv.vatAmount)) < 0.005;
    const twoDec = (n: number) => Math.abs(n * 100 - Math.round(n * 100)) < 1e-9;
    console.log(JSON.stringify({
      ...inv,
      invariantOk: invariant,
      allTwoDecimals: [inv.subtotal, inv.discountAmount, inv.vatAmount, inv.total].every(twoDec),
    }, null, 2));
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
