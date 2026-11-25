'use server';

import { requireSession, requireTenantAccess } from '@/lib/auth/auth-guard';

import { prisma } from '@/lib/db/prisma';
import { computeEndDate } from '@/lib/billing/billing-utils';

type CreateTransferInput = {
  domainName: string;
  tld: string;
  previousProvider: string;
  transferDate: Date | string;
  expiryDate?: Date | string;
  autoRenew?: boolean;
  notes?: string;
  price?: number;
  clientId: string;
  companyId: string;
};

// ─── Queries ──────────────────────────────────────────────────────────────────

export async function getAllTransfers(companyId: string, page = 1, limit = 100) {
  await requireTenantAccess(companyId);
  try {
    const data = await prisma.domainTransfer.findMany({
      where: { companyId },
      include: { client: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { success: true as const, data };
  } catch (error) {
    return { success: false as const, error: String(error) };
  }
}

export async function getTransferById(id: string, companyId: string) {
  await requireTenantAccess(companyId);
  try {
    const data = await prisma.domainTransfer.findFirst({
      where: { id, companyId },
      include: { client: true },
    });
    if (!data) return { success: false as const, error: 'Transfer not found' };
    return { success: true as const, data };
  } catch (error) {
    return { success: false as const, error: String(error) };
  }
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export async function createTransfer(input: CreateTransferInput) {
  await requireTenantAccess(input.companyId);
  try {
    const data = await prisma.domainTransfer.create({
      data: {
        domainName: input.domainName,
        tld: input.tld,
        previousProvider: input.previousProvider,
        transferDate: new Date(input.transferDate),
        expiryDate: input.expiryDate ? new Date(input.expiryDate) : null,
        autoRenew: input.autoRenew ?? true,
        notes: input.notes,
        price: input.price ?? 0,
        status: 'pending',
        clientId: input.clientId,
        companyId: input.companyId,
      },
    });
    return { success: true as const, data };
  } catch (error) {
    return { success: false as const, error: String(error) };
  }
}

export async function updateTransfer(
  id: string,
  companyId: string,
  input: Partial<{
    status: string;
    notes: string;
    expiryDate: Date | string;
    autoRenew: boolean;
  }>,
) {
  await requireTenantAccess(companyId);
  try {
    const existing = await prisma.domainTransfer.findFirst({ where: { id, companyId } });
    if (!existing) return { success: false as const, error: 'Transfer not found' };

    const data = await prisma.domainTransfer.update({
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

export async function deleteTransfer(id: string, companyId: string) {
  await requireTenantAccess(companyId);
  try {
    const existing = await prisma.domainTransfer.findFirst({ where: { id, companyId } });
    if (!existing) return { success: false as const, error: 'Transfer not found' };
    await prisma.domainTransfer.delete({ where: { id } });
    return { success: true as const };
  } catch (error) {
    return { success: false as const, error: String(error) };
  }
}

/**
 * Completes a domain transfer:
 * 1. Marks transfer as "completed"
 * 2. Creates a Domain record
 * - All in a single transaction.
 *
 * NOTE: This action intentionally does NOT create subscriptions or invoices.
 * Subscription/invoice records are created manually from Billing screens.
 */
export async function completeDomainTransfer(
  transferId: string,
  companyId: string,
  registrar: string,
  nameservers?: string,
) {
  await requireTenantAccess(companyId);
  try {
    const transfer = await prisma.domainTransfer.findFirst({
      where: { id: transferId, companyId },
      include: { client: true },
    });
    if (!transfer) return { success: false as const, error: 'Transfer not found' };
    if (transfer.status === 'completed') {
      return { success: false as const, error: 'Transfer is already completed' };
    }

    const price = transfer.price ?? 0;

    const expiryDate = transfer.expiryDate ?? computeEndDate(new Date(), 'yearly');
    const company = await prisma.company.findUnique({ where: { id: companyId } });
    const currency = company?.currency ?? 'USD';

    const result = await prisma.$transaction(async (tx) => {
      // 1. Mark transfer as completed
      await tx.domainTransfer.update({
        where: { id: transferId },
        data: { status: 'completed' },
      });

      // 2. Create Domain
      const domain = await tx.domain.create({
        data: {
          name: transfer.domainName,
          tld: transfer.tld,
          registrar,
          expiryDate,
          autoRenew: transfer.autoRenew,
          nameservers,
          notes: `Transferred from ${transfer.previousProvider}`,
          price,
          currency,
          billingCycle: 'yearly',
          clientId: transfer.clientId,
          companyId,
        },
      });

      return { domain };
    });

    return { success: true as const, data: result };
  } catch (error) {
    return { success: false as const, error: String(error) };
  }
}
