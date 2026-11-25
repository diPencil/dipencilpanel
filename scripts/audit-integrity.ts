/**
 * Read-only integrity audit against the live MySQL/MariaDB database.
 *
 * Checks the invariants from CONSTITUTION.md (Articles I, II and III) that can
 * be verified from stored data:
 *   - invoice totals satisfy total = subtotal - discount + vat
 *   - money values are rounded to two decimals
 *   - payments never exceed the invoice total
 *   - invoice paymentStatus matches the sum of completed payments
 *   - invoice numbers are unique per company
 *   - password hashes look like bcrypt
 *   - migration passwords are stored encrypted
 *
 * Run: pnpm db:audit
 */

import 'dotenv/config';
import { prisma } from '../lib/db/prisma';

const EPSILON = 0.011;

function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function isTwoDecimals(value: number): boolean {
  return Math.abs(value - round2(value)) < 0.0001;
}

async function main() {
  const problems: string[] = [];
  const notes: string[] = [];

  const [companies, users, clients, invoices, payments, migrations] =
    await Promise.all([
      prisma.company.count(),
      prisma.user.count(),
      prisma.client.count(),
      prisma.invoice.count(),
      prisma.payment.count(),
      prisma.websiteMigration.count(),
    ]);

  notes.push(
    `rows: companies=${companies} users=${users} clients=${clients} invoices=${invoices} payments=${payments} migrations=${migrations}`,
  );

  // 1. Invoice totals must reconcile.
  const allInvoices = await prisma.invoice.findMany({
    select: {
      id: true,
      number: true,
      companyId: true,
      subtotal: true,
      discountAmount: true,
      vatAmount: true,
      total: true,
      paymentStatus: true,
      status: true,
    },
  });

  for (const invoice of allInvoices) {
    const expected = round2(
      invoice.subtotal - invoice.discountAmount + invoice.vatAmount,
    );
    if (Math.abs(expected - invoice.total) > EPSILON) {
      problems.push(
        `invoice ${invoice.number}: total ${invoice.total} != derived ${expected}`,
      );
    }
    for (const [field, value] of [
      ['subtotal', invoice.subtotal],
      ['discountAmount', invoice.discountAmount],
      ['vatAmount', invoice.vatAmount],
      ['total', invoice.total],
    ] as const) {
      if (!isTwoDecimals(value)) {
        problems.push(`invoice ${invoice.number}: ${field}=${value} has >2 decimals`);
      }
    }
  }

  // 2. Duplicate invoice numbers inside a company.
  const numberCounts = new Map<string, number>();
  for (const invoice of allInvoices) {
    const key = `${invoice.companyId}::${invoice.number}`;
    numberCounts.set(key, (numberCounts.get(key) ?? 0) + 1);
  }
  for (const [key, count] of numberCounts) {
    if (count > 1) problems.push(`duplicate invoice number ${key} (${count} rows)`);
  }

  // 3. Payments must not exceed the invoice total, and status must reconcile.
  const paidByInvoice = new Map<string, number>();
  const allPayments = await prisma.payment.findMany({
    select: { invoiceId: true, amount: true, status: true },
  });
  for (const payment of allPayments) {
    if (!isTwoDecimals(payment.amount)) {
      problems.push(`payment ${payment.invoiceId}: amount=${payment.amount} has >2 decimals`);
    }
    if (payment.status !== 'completed') continue;
    paidByInvoice.set(
      payment.invoiceId,
      round2((paidByInvoice.get(payment.invoiceId) ?? 0) + payment.amount),
    );
  }

  for (const invoice of allInvoices) {
    const paid = paidByInvoice.get(invoice.id) ?? 0;
    if (paid > invoice.total + EPSILON) {
      problems.push(
        `invoice ${invoice.number}: paid ${paid} exceeds total ${invoice.total}`,
      );
    }
    const expectedStatus =
      paid <= 0 ? 'unpaid' : paid + EPSILON >= invoice.total ? 'paid' : 'partial';
    if (invoice.paymentStatus !== expectedStatus) {
      problems.push(
        `invoice ${invoice.number}: paymentStatus=${invoice.paymentStatus} but payments imply ${expectedStatus}`,
      );
    }
  }

  // 4. Password hashes must be bcrypt, never plain text.
  const userRows = await prisma.user.findMany({
    select: { username: true, password: true, status: true },
  });
  for (const user of userRows) {
    if (!user.password) {
      notes.push(`user ${user.username}: no password set`);
      continue;
    }
    if (!/^\$2[aby]\$\d{2}\$/.test(user.password)) {
      problems.push(`user ${user.username}: password is not a bcrypt hash`);
    }
  }

  // 5. Migration credentials must be encrypted as iv:ciphertext.
  const migrationRows = await prisma.websiteMigration.findMany({
    select: { id: true, password: true },
  });
  for (const migration of migrationRows) {
    if (!/^[0-9a-f]{32}:[0-9a-f]+$/.test(migration.password)) {
      problems.push(`migration ${migration.id}: password is not stored encrypted`);
    }
  }

  console.log(notes.join('\n'));
  if (problems.length === 0) {
    console.log('integrity: ok (no invariant violations found)');
    return;
  }

  console.error(`integrity: ${problems.length} problem(s)`);
  for (const problem of problems) console.error(`- ${problem}`);
  process.exitCode = 1;
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
