'use server';

import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { requireSession, requireTenantAccess } from '@/lib/auth/auth-guard';
import { roundMoney } from '@/lib/billing/money';

type CreatePaymentInput = {
  amount: number;
  method: string;
  currency?: string;
  date?: Date | string;
  notes?: string;
  invoiceId: string;
  clientId: string;
  companyId: string;
};

const createPaymentSchema = z.object({
  amount: z.number().finite().positive('Amount must be greater than zero').max(1_000_000_000),
  method: z.string().trim().min(1, 'Method is required').max(64),
  currency: z.string().trim().length(3).optional(),
  date: z.union([z.string(), z.date()]).optional(),
  notes: z.string().trim().max(2000).optional(),
  invoiceId: z.string().min(1).max(64),
  clientId: z.string().min(1).max(64),
  companyId: z.string().min(1).max(64),
});

const idSchema = z.string().min(1).max(64);

// ─── Queries ──────────────────────────────────────────────────────────────────

export async function getAllPayments(companyId: string, page = 1, limit = 100) {
  await requireTenantAccess(companyId);
  try {
    const data = await prisma.payment.findMany({
      where: { companyId },
      include: {
        client: { select: { id: true, name: true } },
        invoice: { select: { id: true, number: true, total: true } },
      },
      orderBy: { date: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { success: true as const, data };
  } catch (error) {
    return { success: false as const, error: String(error) };
  }
}

export async function getPaymentById(id: string, companyId: string) {
  await requireTenantAccess(companyId);
  try {
    const data = await prisma.payment.findFirst({
      where: { id, companyId },
      include: { client: true, invoice: { include: { items: true } } },
    });
    if (!data) return { success: false as const, error: 'Payment not found' };
    return { success: true as const, data };
  } catch (error) {
    return { success: false as const, error: String(error) };
  }
}

export async function getPaymentsByClient(clientId: string, companyId: string) {
  await requireTenantAccess(companyId);
  try {
    const data = await prisma.payment.findMany({
      where: { clientId, companyId },
      include: { invoice: { select: { id: true, number: true } } },
      orderBy: { date: 'desc' },
    });
    return { success: true as const, data };
  } catch (error) {
    return { success: false as const, error: String(error) };
  }
}

export async function getPaymentsByInvoice(invoiceId: string, companyId: string) {
  await requireTenantAccess(companyId);
  try {
    const data = await prisma.payment.findMany({
      where: { invoiceId, companyId },
      orderBy: { date: 'desc' },
    });
    return { success: true as const, data };
  } catch (error) {
    return { success: false as const, error: String(error) };
  }
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export async function createPayment(input: CreatePaymentInput) {
  await requireTenantAccess(input.companyId);

  const parsed = createPaymentSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false as const,
      error: parsed.error.issues[0]?.message ?? 'Invalid payment',
    };
  }

  const { amount, method, currency, date, notes, invoiceId, clientId, companyId } = parsed.data;
  const roundedAmount = roundMoney(amount);

  try {
    const invoice = await prisma.invoice.findFirst({
      where: { id: invoiceId, companyId },
    });
    if (!invoice) return { success: false as const, error: 'Invoice not found' };

    if (invoice.clientId !== clientId) {
      return { success: false as const, error: 'Payment client does not match the invoice' };
    }

    const client = await prisma.client.findFirst({
      where: { id: clientId, companyId },
      select: { id: true },
    });
    if (!client) return { success: false as const, error: 'Client not found' };

    const company = await prisma.company.findUnique({ where: { id: companyId } });
    const resolvedCurrency = currency ?? company?.currency ?? invoice.currency ?? 'USD';

    const result = await prisma.$transaction(async (tx) => {
      const alreadyPaid = await tx.payment.aggregate({
        where: { invoiceId, companyId, status: 'completed' },
        _sum: { amount: true },
      });

      const paidBefore = roundMoney(alreadyPaid._sum.amount ?? 0);
      const remaining = roundMoney(invoice.total - paidBefore);

      // A payment can never take the invoice past its total (Article III.6).
      if (roundedAmount > remaining + 0.005) {
        throw new Error(
          `Payment exceeds the remaining balance of ${remaining.toFixed(2)} ${invoice.currency}`,
        );
      }

      const payment = await tx.payment.create({
        data: {
          amount: roundedAmount,
          method,
          currency: resolvedCurrency,
          date: date ? new Date(date) : new Date(),
          notes,
          status: 'completed',
          invoiceId,
          clientId,
          companyId,
        },
      });

      const totalPaid = await tx.payment.aggregate({
        where: { invoiceId, companyId, status: 'completed' },
        _sum: { amount: true },
      });

      const paid = roundMoney(totalPaid._sum.amount ?? 0);
      const paymentStatus =
        paid <= 0 ? 'unpaid' : paid + 0.005 >= roundMoney(invoice.total) ? 'paid' : 'partial';

      await tx.invoice.update({
        where: { id: invoiceId, companyId },
        data: {
          paymentStatus,
          ...(paymentStatus === 'paid' ? { status: 'paid' } : {}),
        },
      });

      return payment;
    });

    return { success: true as const, data: result };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function deletePayment(id: string, companyId: string) {
  await requireTenantAccess(companyId);

  const parsedId = idSchema.safeParse(id);
  const parsedCompany = idSchema.safeParse(companyId);
  if (!parsedId.success || !parsedCompany.success) {
    return { success: false as const, error: 'Invalid payment reference' };
  }

  try {
    const existing = await prisma.payment.findFirst({
      where: { id: parsedId.data, companyId: parsedCompany.data },
    });
    if (!existing) return { success: false as const, error: 'Payment not found' };

    await prisma.$transaction(async (tx) => {
      await tx.payment.delete({
        where: { id: parsedId.data, companyId: parsedCompany.data },
      });

      // Recompute the invoice status from the payments that remain (Article III.6).
      const invoice = await tx.invoice.findFirst({
        where: { id: existing.invoiceId, companyId: parsedCompany.data },
        select: { id: true, total: true },
      });
      if (!invoice) return;

      const remaining = await tx.payment.aggregate({
        where: { invoiceId: invoice.id, companyId: parsedCompany.data, status: 'completed' },
        _sum: { amount: true },
      });

      const paid = roundMoney(remaining._sum.amount ?? 0);
      const paymentStatus =
        paid <= 0 ? 'unpaid' : paid + 0.005 >= roundMoney(invoice.total) ? 'paid' : 'partial';

      await tx.invoice.update({
        where: { id: invoice.id, companyId: parsedCompany.data },
        data: {
          paymentStatus,
          ...(paymentStatus !== 'paid' ? { status: 'pending' } : {}),
        },
      });
    });

    return { success: true as const };
  } catch (error) {
    return { success: false as const, error: String(error) };
  }
}
