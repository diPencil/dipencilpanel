import { prisma } from './prisma';

/**
 * Generates the next unique invoice number for a company.
 * Format: INV-YYYYNNNN
 */
export async function generateNextInvoiceNumber(companyId: string): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `INV-${year}`;

  const existingInvoices = await prisma.invoice.findMany({
    where: {
      companyId,
      number: { startsWith: prefix },
    },
    select: { number: true },
  });

  const existingNumbers = new Set(existingInvoices.map((invoice) => invoice.number));

  for (let attempts = 0; attempts < 100; attempts += 1) {
    const suffix = Math.floor(1000 + Math.random() * 9000).toString();
    const candidate = `${prefix}${suffix}`;
    if (!existingNumbers.has(candidate)) {
      return candidate;
    }
  }

  return `${prefix}${Date.now().toString().slice(-4)}`;
}

/**
 * Calculates invoice totals from line items.
 */
export function calcTotals(
  items: { price: number; quantity: number; discount: number; vat: number }[],
) {
  let subtotal = 0;
  let discountAmount = 0;
  let vatAmount = 0;

  for (const item of items) {
    const base = item.price * item.quantity;
    const disc = base * (item.discount / 100);
    const sub = base - disc;
    const vat = sub * (item.vat / 100);
    subtotal += base;
    discountAmount += disc;
    vatAmount += vat;
  }

  return {
    subtotal,
    discountAmount,
    vatAmount,
    total: subtotal - discountAmount + vatAmount,
  };
}

/**
 * Computes the subscription end date based on billing cycle.
 */
export function computeEndDate(startDate: Date, billingCycle: string): Date {
  const end = new Date(startDate);
  if (billingCycle === 'yearly') {
    end.setFullYear(end.getFullYear() + 1);
  } else {
    end.setMonth(end.getMonth() + 1);
  }
  return end;
}

/**
 * Marks overdue invoices for a company (status: "pending" → "overdue").
 */
export async function markOverdueInvoices(companyId: string) {
  const now = new Date();
  const result = await prisma.invoice.updateMany({
    where: {
      companyId,
      status: 'pending',
      paymentStatus: 'unpaid',
      dueDate: { lt: now },
    },
    data: { status: 'overdue' },
  });
  return result.count;
}
