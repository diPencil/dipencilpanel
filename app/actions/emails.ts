'use server';

import { prisma } from '@/lib/prisma';
import { generateNextInvoiceNumber, computeEndDate } from '@/lib/billing-utils';

type CreateEmailInput = {
  name: string;
  domain: string;
  storage: number;
  expiryDate?: Date | string;
  clientId: string;
  companyId: string;
  price: number;
  currency?: string;
  billingCycle: string;
  planName?: string;
  taxRate?: number;
};

// ─── Queries ──────────────────────────────────────────────────────────────────

export async function getAllEmails(companyId: string, page = 1, limit = 100) {
  try {
    const data = await prisma.email.findMany({
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

export async function getEmailById(id: string, companyId: string) {
  try {
    const data = await prisma.email.findFirst({
      where: { id, companyId },
      include: { client: true, subscription: true },
    });
    if (!data) return { success: false as const, error: 'Email not found' };
    return { success: true as const, data };
  } catch (error) {
    return { success: false as const, error: String(error) };
  }
}

// ─── Mutations ────────────────────────────────────────────────────────────────

/**
 * Creates Email + Subscription + Invoice atomically.
 */
export async function createEmail(input: CreateEmailInput) {
  try {
    const company = await prisma.company.findUnique({ where: { id: input.companyId } });
    const taxRate = input.taxRate ?? company?.taxRate ?? 0;
    const currency = input.currency ?? company?.currency ?? 'USD';
    const planName = input.planName ?? 'Email Hosting';
    const invoiceNumber = await generateNextInvoiceNumber(input.companyId);

    const result = await prisma.$transaction(async (tx) => {
      const startDate = new Date();
      const endDate = input.expiryDate
        ? new Date(input.expiryDate)
        : computeEndDate(startDate, input.billingCycle);

      const subscription = await tx.subscription.create({
        data: {
          serviceType: 'email',
          serviceId: 'pending',
          serviceName: `${input.name}@${input.domain}`,
          planName,
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

      const email = await tx.email.create({
        data: {
          name: input.name,
          domain: input.domain,
          storage: input.storage,
          expiryDate: endDate,
          clientId: input.clientId,
          companyId: input.companyId,
          subscriptionId: subscription.id,
        },
      });

      await tx.subscription.update({
        where: { id: subscription.id },
        data: { serviceId: email.id },
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
          notes: `Email: ${planName} — ${input.name}@${input.domain}`,
          subtotal: input.price,
          discountAmount: 0,
          vatAmount,
          total: input.price + vatAmount,
          clientId: input.clientId,
          companyId: input.companyId,
          subscriptionId: subscription.id,
          items: {
            create: {
              description: `${planName} — ${input.name}@${input.domain}`,
              quantity: 1,
              price: input.price,
              discount: 0,
              vat: taxRate,
            },
          },
        },
      });

      return { email, subscription, invoice };
    });

    return { success: true as const, data: result };
  } catch (error) {
    return { success: false as const, error: String(error) };
  }
}

export async function updateEmail(
  id: string,
  companyId: string,
  input: Partial<{
    name: string;
    domain: string;
    storage: number;
    status: string;
    expiryDate: Date | string;
  }>,
) {
  try {
    const existing = await prisma.email.findFirst({ where: { id, companyId } });
    if (!existing) return { success: false as const, error: 'Email not found' };

    const data = await prisma.email.update({
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

export async function deleteEmail(id: string, companyId: string) {
  try {
    const existing = await prisma.email.findFirst({ where: { id, companyId } });
    if (!existing) return { success: false as const, error: 'Email not found' };
    await prisma.email.delete({ where: { id } });
    return { success: true as const };
  } catch (error) {
    return { success: false as const, error: String(error) };
  }
}
