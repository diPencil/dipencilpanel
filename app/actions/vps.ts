'use server';

import { prisma } from '@/lib/prisma';
import { generateNextInvoiceNumber, computeEndDate } from '@/lib/billing-utils';

type CreateVPSInput = {
  name: string;
  planName: string;
  ram: number;
  storage: number;
  cpu: number;
  expiryDate?: Date | string;
  notes?: string;
  clientId: string;
  companyId: string;
  price: number;
  currency?: string;
  billingCycle: string;
  taxRate?: number;
};

// ─── Queries ──────────────────────────────────────────────────────────────────

export async function getAllVPS(companyId: string, page = 1, limit = 100) {
  try {
    const data = await prisma.vPS.findMany({
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

export async function getVPSById(id: string, companyId: string) {
  try {
    const data = await prisma.vPS.findFirst({
      where: { id, companyId },
      include: { client: true, subscription: true },
    });
    if (!data) return { success: false as const, error: 'VPS not found' };
    return { success: true as const, data };
  } catch (error) {
    return { success: false as const, error: String(error) };
  }
}

// ─── Mutations ────────────────────────────────────────────────────────────────

/**
 * Creates VPS + Subscription + Invoice atomically.
 */
export async function createVPS(input: CreateVPSInput) {
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
          serviceType: 'vps',
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

      const vps = await tx.vPS.create({
        data: {
          name: input.name,
          planName: input.planName,
          ram: input.ram,
          storage: input.storage,
          cpu: input.cpu,
          expiryDate: endDate,
          notes: input.notes,
          clientId: input.clientId,
          companyId: input.companyId,
          subscriptionId: subscription.id,
        },
      });

      await tx.subscription.update({
        where: { id: subscription.id },
        data: { serviceId: vps.id },
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
          notes: `VPS: ${input.planName} — ${input.name}`,
          subtotal: input.price,
          discountAmount: 0,
          vatAmount,
          total: input.price + vatAmount,
          clientId: input.clientId,
          companyId: input.companyId,
          subscriptionId: subscription.id,
          items: {
            create: {
              description: `${input.planName} VPS — ${input.name}`,
              quantity: 1,
              price: input.price,
              discount: 0,
              vat: taxRate,
            },
          },
        },
      });

      return { vps, subscription, invoice };
    });

    return { success: true as const, data: result };
  } catch (error) {
    return { success: false as const, error: String(error) };
  }
}

export async function updateVPS(
  id: string,
  companyId: string,
  input: Partial<{
    name: string;
    planName: string;
    ram: number;
    storage: number;
    cpu: number;
    status: string;
    expiryDate: Date | string;
    notes: string;
  }>,
) {
  try {
    const existing = await prisma.vPS.findFirst({ where: { id, companyId } });
    if (!existing) return { success: false as const, error: 'VPS not found' };

    const data = await prisma.vPS.update({
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

export async function deleteVPS(id: string, companyId: string) {
  try {
    const existing = await prisma.vPS.findFirst({ where: { id, companyId } });
    if (!existing) return { success: false as const, error: 'VPS not found' };
    await prisma.vPS.delete({ where: { id } });
    return { success: true as const };
  } catch (error) {
    return { success: false as const, error: String(error) };
  }
}
