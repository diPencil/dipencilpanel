'use server';

import { prisma } from '@/lib/prisma';
import { generateNextInvoiceNumber, calcTotals, markOverdueInvoices, type InvoiceNumberKind } from '@/lib/billing-utils';

type InvoiceItemInput = {
  description: string;
  quantity: number;
  price: number;
  discount?: number;
  vat?: number;
};

type CreateInvoiceInput = {
  clientId: string;
  companyId: string;
  subscriptionId?: string;
  issueDate?: Date | string;
  dueDate: Date | string;
  nextBillingDate?: Date | string | null;
  currency?: string;
  notes?: string;
  items: InvoiceItemInput[];
  /** When dipencil, clientId from the client is ignored; internal system client is used. */
  invoiceKind?: 'client' | 'dipencil';
  counterpartyName?: string | null;
  counterpartyAddress?: string | null;
};

async function ensureDipencilInternalClient(companyId: string) {
  const existing = await prisma.client.findFirst({
    where: { companyId, isDipencilInternal: true },
  });
  if (existing) return existing;

  return prisma.client.create({
    data: {
      companyId,
      name: 'Pencil for E-Marketing Ltd.',
      email: `dipencil-invoice-${companyId.replace(/[^a-z0-9]/gi, '')}@internal.dipencil`,
      companyName: 'Pencil for E-Marketing Ltd.',
      address:
        'EGY: 10 A Hussein Wassef Street, Al-Masaha Square, Dokki\nKSA: Olaya, Akaria Plaza, Gate D – Level 6, Riyadh',
      isDipencilInternal: true,
    },
  });
}

export async function getOrCreateDipencilInternalClient(companyId: string) {
  try {
    const client = await ensureDipencilInternalClient(companyId);
    return {
      success: true as const,
      data: {
        id: client.id,
        name: client.name,
        email: client.email,
        phone: client.phone ?? '',
        address: client.address ?? '',
        companyName: client.companyName ?? '',
        companyId: client.companyId,
        createdAt: client.createdAt.toISOString(),
        isDipencilInternal: true as const,
      },
    };
  } catch (error) {
    return { success: false as const, error: String(error) };
  }
}

// ─── Queries ──────────────────────────────────────────────────────────────────

export async function getAllInvoices(companyId: string, page = 1, limit = 100) {
  try {
    // Auto-mark overdue on each fetch
    await markOverdueInvoices(companyId);

    const data = await prisma.invoice.findMany({
      where: { companyId },
      include: {
        client: { select: { id: true, name: true } },
        items: true,
        payments: true,
        subscription: { select: { id: true, serviceType: true, serviceName: true } },
      },
      orderBy: { issueDate: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { success: true as const, data };
  } catch (error) {
    return { success: false as const, error: String(error) };
  }
}

export async function getInvoiceById(id: string, companyId: string) {
  try {
    const data = await prisma.invoice.findFirst({
      where: { id, companyId },
      include: {
        client: true,
        items: true,
        payments: true,
        subscription: true,
      },
    });
    if (!data) return { success: false as const, error: 'Invoice not found' };
    return { success: true as const, data };
  } catch (error) {
    return { success: false as const, error: String(error) };
  }
}

export async function getInvoicesByClient(clientId: string, companyId: string) {
  try {
    const data = await prisma.invoice.findMany({
      where: { clientId, companyId },
      include: { items: true, payments: true },
      orderBy: { issueDate: 'desc' },
    });
    return { success: true as const, data };
  } catch (error) {
    return { success: false as const, error: String(error) };
  }
}

export async function getOverdueInvoices(companyId: string) {
  try {
    await markOverdueInvoices(companyId);
    const data = await prisma.invoice.findMany({
      where: { companyId, status: 'overdue' },
      include: { client: { select: { id: true, name: true } } },
      orderBy: { dueDate: 'asc' },
    });
    return { success: true as const, data };
  } catch (error) {
    return { success: false as const, error: String(error) };
  }
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export async function createInvoice(input: CreateInvoiceInput) {
  try {
    const company = await prisma.company.findUnique({ where: { id: input.companyId } });
    const currency = input.currency ?? company?.currency ?? 'USD';
    const kind: InvoiceNumberKind = input.invoiceKind === 'dipencil' ? 'dipencil' : 'client';
    const invoiceNumber = await generateNextInvoiceNumber(input.companyId, kind);

    let clientId = input.clientId;
    let counterpartyName: string | null = null;
    let counterpartyAddress: string | null = null;
    if (kind === 'dipencil') {
      const internal = await ensureDipencilInternalClient(input.companyId);
      clientId = internal.id;
      counterpartyName = input.counterpartyName?.trim() || null;
      counterpartyAddress = input.counterpartyAddress?.trim() || null;
    }

    const normalizedItems = input.items.map((item) => ({
      description: item.description,
      quantity: item.quantity,
      price: item.price,
      discount: item.discount ?? 0,
      vat: item.vat ?? 0,
    }));

    const totals = calcTotals(normalizedItems);
    const issueDate = input.issueDate ? new Date(input.issueDate) : new Date();

    const data = await prisma.invoice.create({
      data: {
        number: invoiceNumber,
        issueDate,
        dueDate: new Date(input.dueDate),
        nextBillingDate: input.nextBillingDate ? new Date(input.nextBillingDate) : null,
        status: 'pending',
        paymentStatus: 'unpaid',
        currency,
        notes: input.notes,
        ...totals,
        clientId,
        companyId: input.companyId,
        subscriptionId: input.subscriptionId,
        invoiceKind: kind,
        counterpartyName,
        counterpartyAddress,
        items: { create: normalizedItems },
      },
      include: { items: true },
    });
    return { success: true as const, data };
  } catch (error) {
    return { success: false as const, error: String(error) };
  }
}

export async function updateInvoice(
  id: string,
  companyId: string,
  /** Client may send full `Invoice` fields; only Prisma-safe keys are applied. */
  input: Record<string, unknown>,
) {
  try {
    const existing = await prisma.invoice.findFirst({ where: { id, companyId } });
    if (!existing) return { success: false as const, error: 'Invoice not found' };

    let normalizedItems:
      | Array<{ description: string; quantity: number; price: number; discount: number; vat: number }>
      | null = null;
    let totalsPatch: Partial<{
      subtotal: number;
      discountAmount: number;
      vatAmount: number;
      total: number;
    }> = {};

    const rawItems = input.items;
    if (Array.isArray(rawItems) && rawItems.length > 0) {
      normalizedItems = rawItems.map((row: Record<string, unknown>) => ({
        description: String(row.description ?? ''),
        quantity: Math.max(1, Math.round(Number(row.quantity) || 1)),
        price: Number(row.price) || 0,
        discount: Number(row.discount) || 0,
        vat: Number(row.vat) || 0,
      }));
      totalsPatch = calcTotals(normalizedItems);
    }

    // Never spread arbitrary client fields (e.g. serviceType / serviceId from subscription UI)
    // — Prisma Invoice has no such columns and would reject the update.
    const data: {
      clientId?: string;
      currency?: string;
      status?: string;
      paymentStatus?: string;
      notes?: string | null;
      issueDate?: Date;
      dueDate?: Date;
      nextBillingDate?: Date | null;
      subscriptionId?: string | null;
      subtotal?: number;
      discountAmount?: number;
      vatAmount?: number;
      total?: number;
      counterpartyName?: string | null;
      counterpartyAddress?: string | null;
    } = { ...totalsPatch };

    if (input.clientId != null && String(input.clientId).trim() !== '') {
      data.clientId = String(input.clientId);
    }
    if (input.counterpartyName !== undefined) {
      data.counterpartyName = input.counterpartyName ? String(input.counterpartyName).trim() : null;
    }
    if (input.counterpartyAddress !== undefined) {
      data.counterpartyAddress = input.counterpartyAddress ? String(input.counterpartyAddress).trim() : null;
    }
    if (input.currency !== undefined) data.currency = String(input.currency);
    if (input.status !== undefined) data.status = String(input.status);
    if (input.paymentStatus !== undefined) data.paymentStatus = String(input.paymentStatus);
    if (input.notes !== undefined) {
      data.notes = input.notes ? String(input.notes) : null;
    }

    if (input.issueDate) data.issueDate = new Date(String(input.issueDate));
    if (input.dueDate) data.dueDate = new Date(String(input.dueDate));
    if ('nextBillingDate' in input) {
      data.nextBillingDate = input.nextBillingDate
        ? new Date(String(input.nextBillingDate))
        : null;
    }

    if (input.subscriptionId !== undefined) {
      data.subscriptionId =
        input.subscriptionId === null || input.subscriptionId === ''
          ? null
          : String(input.subscriptionId);
    }

    const updated = await prisma.$transaction(async (tx) => {
      if (normalizedItems) {
        await tx.invoiceItem.deleteMany({ where: { invoiceId: id } });
        await tx.invoiceItem.createMany({
          data: normalizedItems.map((item) => ({ ...item, invoiceId: id })),
        });
      }

      const updatedInvoice = await tx.invoice.update({
        where: { id },
        data,
        include: {
          items: true,
          subscription: { select: { id: true, serviceType: true, serviceName: true } },
        },
      });

      // If this invoice belongs to a subscription and items were edited,
      // sync subscription recurring price with invoice net subtotal (before VAT).
      if (normalizedItems && updatedInvoice.subscriptionId) {
        const recurringPrice = Math.max(
          0,
          (updatedInvoice.subtotal ?? 0) - (updatedInvoice.discountAmount ?? 0),
        );
        await tx.subscription.updateMany({
          where: { id: updatedInvoice.subscriptionId, companyId },
          data: { price: recurringPrice },
        });
      }

      return updatedInvoice;
    });
    return { success: true as const, data: updated };
  } catch (error) {
    return { success: false as const, error: String(error) };
  }
}

export async function deleteInvoice(id: string, companyId: string) {
  try {
    const existing = await prisma.invoice.findFirst({ where: { id, companyId } });
    if (!existing) return { success: false as const, error: 'Invoice not found' };
    await prisma.invoice.delete({ where: { id } });
    return { success: true as const };
  } catch (error) {
    return { success: false as const, error: String(error) };
  }
}

/**
 * Marks an invoice as paid and records a Payment in a single transaction.
 */
export async function markInvoiceAsPaid(
  id: string,
  companyId: string,
  method: string,
  notes?: string,
) {
  try {
    const invoice = await prisma.invoice.findFirst({
      where: { id, companyId },
      include: { client: true },
    });
    if (!invoice) return { success: false as const, error: 'Invoice not found' };
    if (invoice.paymentStatus === 'paid') {
      return { success: false as const, error: 'Invoice is already paid' };
    }

    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.invoice.update({
        where: { id },
        data: { status: 'paid', paymentStatus: 'paid' },
      });

      const payment = await tx.payment.create({
        data: {
          amount: invoice.total,
          method,
          currency: invoice.currency,
          date: new Date(),
          notes,
          status: 'completed',
          invoiceId: id,
          clientId: invoice.clientId,
          companyId,
        },
      });

      return { invoice: updated, payment };
    });

    return { success: true as const, data: result };
  } catch (error) {
    return { success: false as const, error: String(error) };
  }
}

/**
 * Duplicates an invoice as a new pending invoice.
 */
export async function duplicateInvoice(id: string, companyId: string) {
  try {
    const original = await prisma.invoice.findFirst({
      where: { id, companyId },
      include: { items: true },
    });
    if (!original) return { success: false as const, error: 'Invoice not found' };

    const numberKind: InvoiceNumberKind =
      original.invoiceKind === 'dipencil' ? 'dipencil' : 'client';
    const invoiceNumber = await generateNextInvoiceNumber(companyId, numberKind);
    const now = new Date();

    const data = await prisma.invoice.create({
      data: {
        number: invoiceNumber,
        issueDate: now,
        dueDate: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
        status: 'pending',
        paymentStatus: 'unpaid',
        currency: original.currency,
        notes: original.notes,
        subtotal: original.subtotal,
        discountAmount: original.discountAmount,
        vatAmount: original.vatAmount,
        total: original.total,
        clientId: original.clientId,
        companyId,
        subscriptionId: original.subscriptionId,
        invoiceKind: original.invoiceKind ?? 'client',
        counterpartyName: original.counterpartyName,
        counterpartyAddress: original.counterpartyAddress,
        items: {
          create: original.items.map((item) => ({
            description: item.description,
            quantity: item.quantity,
            price: item.price,
            discount: item.discount,
            vat: item.vat,
          })),
        },
      },
      include: { items: true },
    });
    return { success: true as const, data };
  } catch (error) {
    return { success: false as const, error: String(error) };
  }
}

/**
 * Generates a new invoice from a subscription (used for auto-billing).
 */
export async function generateInvoiceFromSubscription(
  subscriptionId: string,
  companyId: string,
) {
  try {
    const subscription = await prisma.subscription.findFirst({
      where: { id: subscriptionId, companyId },
      include: { client: true },
    });
    if (!subscription) return { success: false as const, error: 'Subscription not found' };

    const company = await prisma.company.findUnique({ where: { id: companyId } });
    const taxRate = company?.taxRate ?? 0;
    const invoiceNumber = await generateNextInvoiceNumber(companyId);
    const vatAmount = subscription.price * (taxRate / 100);
    const now = new Date();

    const data = await prisma.invoice.create({
      data: {
        number: invoiceNumber,
        issueDate: now,
        dueDate: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
        status: 'pending',
        paymentStatus: 'unpaid',
        currency: subscription.currency,
        notes: null,
        subtotal: subscription.price,
        discountAmount: 0,
        vatAmount,
        total: subscription.price + vatAmount,
        clientId: subscription.clientId,
        companyId,
        subscriptionId: subscription.id,
        items: {
          create: {
            description: `${subscription.billingCycle === 'yearly' ? 'Annual' : 'Monthly'} — ${subscription.serviceName ?? subscription.planName}`,
            quantity: 1,
            price: subscription.price,
            discount: 0,
            vat: taxRate,
          },
        },
      },
      include: { items: true },
    });
    return { success: true as const, data };
  } catch (error) {
    return { success: false as const, error: String(error) };
  }
}
