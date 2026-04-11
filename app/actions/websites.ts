'use server';

import { prisma } from '@/lib/prisma';
import { computeEndDate } from '@/lib/billing-utils';

type CreateWebsiteInput = {
  name: string;
  domain: string;
  type: string;
  storage?: number;
  bandwidth?: number;
  linkedDomain?: string;
  clientId: string;
  companyId: string;
  planName: string;
  planPrice: number;
  billingCycle: string;
  currency?: string;
  taxRate?: number;
};

// ─── Queries ──────────────────────────────────────────────────────────────────

export async function getAllWebsites(companyId: string, page = 1, limit = 100) {
  try {
    const data = await prisma.website.findMany({
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

export async function getWebsiteById(id: string, companyId: string) {
  try {
    const data = await prisma.website.findFirst({
      where: { id, companyId },
      include: { client: true, subscription: true },
    });
    if (!data) return { success: false as const, error: 'Website not found' };
    return { success: true as const, data };
  } catch (error) {
    return { success: false as const, error: String(error) };
  }
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export async function createWebsite(input: CreateWebsiteInput) {
  try {
    const startDate = new Date();
    const renewalDate =
      input.billingCycle === 'onetime'
        ? null
        : computeEndDate(startDate, input.billingCycle);

    const website = await prisma.website.create({
      data: {
        name: input.name,
        domain: input.domain,
        type: input.type,
        storage: input.storage ?? 0,
        bandwidth: input.bandwidth ?? 0,
        linkedDomain: input.linkedDomain,
        planName: input.planName,
        planPrice: input.planPrice,
        billingCycle: input.billingCycle,
        renewalDate,
        clientId: input.clientId,
        companyId: input.companyId,
      },
    });

    return { success: true as const, data: { website } };
  } catch (error) {
    return { success: false as const, error: String(error) };
  }
}

export async function updateWebsite(
  id: string,
  companyId: string,
  input: Partial<{
    name: string;
    domain: string;
    type: string;
    storage: number;
    bandwidth: number;
    status: string;
    linkedDomain: string;
    planName: string;
    planPrice: number;
    billingCycle: string;
    renewalDate: Date | string | null;
  }>,
) {
  try {
    const existing = await prisma.website.findFirst({ where: { id, companyId } });
    if (!existing) return { success: false as const, error: 'Website not found' };

    const { renewalDate: rdIn, ...rest } = input;
    let nextRenewal: Date | null | undefined;
    if (rdIn !== undefined) {
      nextRenewal = rdIn === null ? null : new Date(rdIn);
    } else if (input.billingCycle === 'onetime') {
      nextRenewal = null;
    }

    const data = await prisma.website.update({
      where: { id },
      data: {
        ...rest,
        ...(nextRenewal !== undefined ? { renewalDate: nextRenewal } : {}),
      },
    });
    return { success: true as const, data };
  } catch (error) {
    return { success: false as const, error: String(error) };
  }
}

export async function deleteWebsite(id: string, companyId: string) {
  try {
    const existing = await prisma.website.findFirst({ where: { id, companyId } });
    if (!existing) return { success: false as const, error: 'Website not found' };
    await prisma.website.delete({ where: { id } });
    return { success: true as const };
  } catch (error) {
    return { success: false as const, error: String(error) };
  }
}
