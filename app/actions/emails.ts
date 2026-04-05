'use server';

import { prisma } from '@/lib/prisma';
import { computeEndDate } from '@/lib/billing-utils';

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
 * Creates Email + Subscription atomically.
 */
export async function createEmail(input: CreateEmailInput) {
  try {
    const company = await prisma.company.findUnique({ where: { id: input.companyId } });
    const currency = input.currency ?? company?.currency ?? 'USD';
    const planName = input.planName ?? 'Email Hosting';

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

      return { email, subscription };
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
