'use server';

import { prisma } from '@/lib/prisma';

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

// ─── Queries ──────────────────────────────────────────────────────────────────

export async function getAllPayments(companyId: string, page = 1, limit = 100) {
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
  try {
    const invoice = await prisma.invoice.findFirst({
      where: { id: input.invoiceId, companyId: input.companyId },
    });
    if (!invoice) return { success: false as const, error: 'Invoice not found' };

    const company = await prisma.company.findUnique({ where: { id: input.companyId } });
    const currency = input.currency ?? company?.currency ?? 'USD';

    const result = await prisma.$transaction(async (tx) => {
      const payment = await tx.payment.create({
        data: {
          amount: input.amount,
          method: input.method,
          currency,
          date: input.date ? new Date(input.date) : new Date(),
          notes: input.notes,
          status: 'completed',
          invoiceId: input.invoiceId,
          clientId: input.clientId,
          companyId: input.companyId,
        },
      });

      // Auto-mark invoice as paid if the payment covers the total
      const totalPaid = await tx.payment.aggregate({
        where: { invoiceId: input.invoiceId, status: 'completed' },
        _sum: { amount: true },
      });

      const paid = totalPaid._sum.amount ?? 0;
      if (paid >= invoice.total) {
        await tx.invoice.update({
          where: { id: input.invoiceId },
          data: { paymentStatus: 'paid', status: 'paid' },
        });
      } else if (paid > 0) {
        await tx.invoice.update({
          where: { id: input.invoiceId },
          data: { paymentStatus: 'partial' },
        });
      }

      return payment;
    });

    return { success: true as const, data: result };
  } catch (error) {
    return { success: false as const, error: String(error) };
  }
}

export async function deletePayment(id: string, companyId: string) {
  try {
    const existing = await prisma.payment.findFirst({ where: { id, companyId } });
    if (!existing) return { success: false as const, error: 'Payment not found' };
    await prisma.payment.delete({ where: { id } });
    return { success: true as const };
  } catch (error) {
    return { success: false as const, error: String(error) };
  }
}
