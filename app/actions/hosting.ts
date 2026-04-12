'use server';

import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { computeEndDate, generateNextInvoiceNumber } from '@/lib/billing-utils';

type CreateHostingInput = {
  name: string;
  type: string;
  planName: string;
  expiryDate?: Date | string;
  resources?: string;
  clientId: string;
  companyId: string;
  price: number;
  currency?: string;
  billingCycle: string;
  taxRate?: number;
};

// ─── Queries ──────────────────────────────────────────────────────────────────

export async function getAllHosting(companyId: string, page = 1, limit = 100) {
  try {
    const data = await prisma.hosting.findMany({
      where: { companyId },
      include: { client: { select: { id: true, name: true } }, subscription: true },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { success: true as const, data };
  } catch (error) {
    return { success: false as const, error: String(error) };
  }
}

export async function getHostingById(id: string, companyId: string) {
  try {
    const data = await prisma.hosting.findFirst({
      where: { id, companyId },
      include: { client: true, subscription: true },
    });
    if (!data) return { success: false as const, error: 'Hosting not found' };
    return { success: true as const, data };
  } catch (error) {
    return { success: false as const, error: String(error) };
  }
}

// ─── Mutations ────────────────────────────────────────────────────────────────

/**
 * Creates a Hosting record. No subscription or invoice is created here;
 * those are managed separately from the Billing > Subscriptions page.
 */
export async function createHosting(input: CreateHostingInput) {
  try {
    const company = await prisma.company.findUnique({ where: { id: input.companyId } });
    const currency = input.currency ?? company?.currency ?? 'USD';

    const endDate = input.expiryDate
      ? new Date(input.expiryDate)
      : computeEndDate(new Date(), input.billingCycle);

    const hosting = await prisma.hosting.create({
      data: {
        name: input.name,
        type: input.type,
        planName: input.planName,
        expiryDate: endDate,
        resources: input.resources,
        price: input.price,
        currency,
        billingCycle: input.billingCycle,
        clientId: input.clientId,
        companyId: input.companyId,
      },
    });

    return { success: true as const, data: { hosting } };
  } catch (error) {
    return { success: false as const, error: String(error) };
  }
}

export async function updateHosting(
  id: string,
  companyId: string,
  input: Partial<{
    name: string;
    type: string;
    planName: string;
    status: string;
    expiryDate: Date | string;
    resources: string | Record<string, unknown>;
    price: number;
    billingCycle: string;
    currency: string;
  }>,
) {
  try {
    const existing = await prisma.hosting.findFirst({ where: { id, companyId } });
    if (!existing) return { success: false as const, error: 'Hosting not found' };

    const data: Prisma.HostingUpdateInput = {};
    if (input.name !== undefined) data.name = input.name;
    if (input.type !== undefined) data.type = input.type;
    if (input.planName !== undefined) data.planName = input.planName;
    if (input.status !== undefined) data.status = input.status;
    if (input.price !== undefined) data.price = input.price;
    if (input.billingCycle !== undefined) data.billingCycle = input.billingCycle;
    if (input.currency !== undefined) data.currency = input.currency;
    if (input.expiryDate !== undefined) data.expiryDate = new Date(input.expiryDate);
    if (input.resources !== undefined) {
      data.resources =
        typeof input.resources === 'string'
          ? input.resources
          : JSON.stringify(input.resources);
    }

    const updated = await prisma.hosting.update({
      where: { id },
      data,
    });
    return { success: true as const, data: updated };
  } catch (error) {
    return { success: false as const, error: String(error) };
  }
}

export async function deleteHosting(id: string, companyId: string) {
  try {
    const existing = await prisma.hosting.findFirst({ where: { id, companyId } });
    if (!existing) return { success: false as const, error: 'Hosting not found' };
    await prisma.hosting.delete({ where: { id } });
    return { success: true as const };
  } catch (error) {
    return { success: false as const, error: String(error) };
  }
}

export async function suspendHosting(id: string, companyId: string) {
  try {
    const hosting = await prisma.hosting.findFirst({ where: { id, companyId } });
    if (!hosting) return { success: false as const, error: 'Hosting not found' };

    await prisma.$transaction(async (tx) => {
      await tx.hosting.update({ where: { id }, data: { status: 'suspended' } });
      if (hosting.subscriptionId) {
        await tx.subscription.update({
          where: { id: hosting.subscriptionId },
          data: { status: 'suspended', autoRenew: false },
        });
      }
    });

    return { success: true as const };
  } catch (error) {
    return { success: false as const, error: String(error) };
  }
}

export async function renewHosting(id: string, companyId: string) {
  try {
    const hosting = await prisma.hosting.findFirst({
      where: { id, companyId },
      include: { subscription: true },
    });
    if (!hosting) return { success: false as const, error: 'Hosting not found' };

    const company = await prisma.company.findUnique({ where: { id: companyId } });
    const taxRate = company?.taxRate ?? 0;
    const currency = hosting.currency || company?.currency || 'USD';
    const price = hosting.price ?? 0;
    const billingCycle = hosting.billingCycle ?? 'monthly';
    const invoiceNumber = await generateNextInvoiceNumber(companyId);

    const currentExpiry = hosting.expiryDate ?? new Date();
    const newExpiry = computeEndDate(currentExpiry, billingCycle);
    const vatAmount = price * (taxRate / 100);

    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.hosting.update({
        where: { id },
        data: { expiryDate: newExpiry, status: 'active' },
      });

      if (hosting.subscriptionId) {
        await tx.subscription.update({
          where: { id: hosting.subscriptionId },
          data: { endDate: newExpiry, status: 'active' },
        });
      }

      const invoice = await tx.invoice.create({
        data: {
          number: invoiceNumber,
          issueDate: new Date(),
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          status: 'pending',
          paymentStatus: 'unpaid',
          currency,
          notes: `Hosting renewal: ${hosting.planName} — ${hosting.name}`,
          subtotal: price,
          discountAmount: 0,
          vatAmount,
          total: price + vatAmount,
          clientId: hosting.clientId,
          companyId,
          subscriptionId: hosting.subscriptionId,
          items: {
            create: {
              description: `Hosting Renewal — ${hosting.planName}`,
              quantity: 1,
              price,
              discount: 0,
              vat: taxRate,
            },
          },
        },
      });

      return { hosting: updated, invoice };
    });

    return { success: true as const, data: result };
  } catch (error) {
    return { success: false as const, error: String(error) };
  }
}
