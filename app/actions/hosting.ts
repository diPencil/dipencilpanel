'use server';

import { prisma } from '@/lib/prisma';
import { generateNextInvoiceNumber, computeEndDate } from '@/lib/billing-utils';

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
 * Creates Hosting + Subscription + Invoice atomically.
 */
export async function createHosting(input: CreateHostingInput) {
  try {
    const company = await prisma.company.findUnique({ where: { id: input.companyId } });
    const taxRate = input.taxRate ?? company?.taxRate ?? 0;
    const currency = input.currency ?? company?.currency ?? 'USD';
    const invoiceNumber = await generateNextInvoiceNumber(input.companyId);

    const result = await prisma.$transaction(async (tx) => {
      const startDate = new Date();
      const endDate = input.expiryDate
        ? new Date(input.expiryDate)
        : computeEndDate(startDate, input.billingCycle);

      const subscription = await tx.subscription.create({
        data: {
          serviceType: 'hosting',
          serviceId: 'pending',
          serviceName: input.name,
          planName: input.planName,
          price: input.price,
          currency,
          billingCycle: input.billingCycle,
          startDate,
          endDate,
          autoRenew: true,
          status: 'active',
          clientId: input.clientId,
          companyId: input.companyId,
        },
      });

      const hosting = await tx.hosting.create({
        data: {
          name: input.name,
          type: input.type,
          planName: input.planName,
          expiryDate: endDate,
          resources: input.resources,
          clientId: input.clientId,
          companyId: input.companyId,
          subscriptionId: subscription.id,
        },
      });

      await tx.subscription.update({
        where: { id: subscription.id },
        data: { serviceId: hosting.id },
      });

      const vatAmount = input.price * (taxRate / 100);

      const invoice = await tx.invoice.create({
        data: {
          number: invoiceNumber,
          issueDate: startDate,
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          status: 'pending',
          paymentStatus: 'unpaid',
          currency,
          notes: `Hosting plan: ${input.planName} — ${input.name}`,
          subtotal: input.price,
          discountAmount: 0,
          vatAmount,
          total: input.price + vatAmount,
          clientId: input.clientId,
          companyId: input.companyId,
          subscriptionId: subscription.id,
          items: {
            create: {
              description: `${input.planName} Hosting — ${input.name}`,
              quantity: 1,
              price: input.price,
              discount: 0,
              vat: taxRate,
            },
          },
        },
      });

      return { hosting, subscription, invoice };
    });

    return { success: true as const, data: result };
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
    resources: string;
  }>,
) {
  try {
    const existing = await prisma.hosting.findFirst({ where: { id, companyId } });
    if (!existing) return { success: false as const, error: 'Hosting not found' };

    const data = await prisma.hosting.update({
      where: { id },
      data: {
        ...input,
        expiryDate: input.expiryDate ? new Date(input.expiryDate) : undefined,
      },
    });
    return { success: true as const, data };
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
    const currency = hosting.subscription?.currency ?? company?.currency ?? 'USD';
    const price = hosting.subscription?.price ?? 0;
    const billingCycle = hosting.subscription?.billingCycle ?? 'monthly';
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
