/**
 * One-off cleanup: remove the audit test fixtures (Money Test Client with its
 * invoices and payments, Test Tenant B company with its viewer user and role).
 * Run: npx tsx scripts/cleanup-test-data.ts
 */
import 'dotenv/config';
import { prisma } from '../lib/db/prisma';

async function main() {
  const client = await prisma.client.findFirst({ where: { email: 'money.test@example.test' } });
  if (client) {
    // Payment and Invoice are Restrict by design (financial records), so
    // remove items, invoices and payments first before deleting the client.
    const payments = await prisma.payment.deleteMany({ where: { clientId: client.id } });
    const logs = await prisma.reminderLog.deleteMany({ where: { clientId: client.id } });
    const invoices = await prisma.invoice.findMany({ where: { clientId: client.id }, select: { id: true } });
    const invoiceIds = invoices.map((i) => i.id);
    const items = await prisma.invoiceItem.deleteMany({ where: { invoiceId: { in: invoiceIds } } });
    const deletedInvoices = await prisma.invoice.deleteMany({ where: { id: { in: invoiceIds } } });
    console.log(
      'deleted payments:', payments.count,
      'reminderLogs:', logs.count,
      'items:', items.count,
      'invoices:', deletedInvoices.count,
    );
    await prisma.client.delete({ where: { id: client.id } });
    console.log('deleted client + cascades:', client.name);
  }

  const viewer = await prisma.user.findUnique({ where: { username: 'viewer_test' } });
  if (viewer) {
    await prisma.user.delete({ where: { id: viewer.id } });
    console.log('deleted user:', viewer.username);
  }

  const companyB = await prisma.company.findFirst({ where: { name: 'Test Tenant B' } });
  if (companyB) {
    await prisma.company.delete({ where: { id: companyB.id } });
    console.log('deleted company + cascades:', companyB.name);
  }

  const counts = {
    companies: await prisma.company.count(),
    users: await prisma.user.count(),
    clients: await prisma.client.count(),
    invoices: await prisma.invoice.count(),
    payments: await prisma.payment.count(),
  };
  console.log('remaining:', JSON.stringify(counts));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
