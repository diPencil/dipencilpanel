'use server';

import { prisma } from '@/lib/prisma';
import { generateNextInvoiceNumber, computeEndDate } from '@/lib/billing-utils';

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
 * 3. Creates a Subscription
 * 4. Generates an Invoice
 * — All in a single transaction.
 */
export async function completeDomainTransfer(
  transferId: string,
  companyId: string,
  registrar: string,
  nameservers?: string,
) {
  try {
    const transfer = await prisma.domainTransfer.findFirst({
      where: { id: transferId, companyId },
      include: { client: true },
    });
    if (!transfer) return { success: false as const, error: 'Transfer not found' };
    if (transfer.status === 'completed') {
      return { success: false as const, error: 'Transfer is already completed' };
    }

    const company = await prisma.company.findUnique({ where: { id: companyId } });
    const taxRate = company?.taxRate ?? 0;
    const currency = company?.currency ?? 'USD';
    const price = transfer.price ?? 0;
    const invoiceNumber = await generateNextInvoiceNumber(companyId);

    const expiryDate = transfer.expiryDate ?? computeEndDate(new Date(), 'yearly');
    const vatAmount = price * (taxRate / 100);

    const result = await prisma.$transaction(async (tx) => {
      // 1. Mark transfer as completed
      await tx.domainTransfer.update({
        where: { id: transferId },
        data: { status: 'completed' },
      });

      // 2. Create Subscription
      const subscription = await tx.subscription.create({
        data: {
          serviceType: 'domain',
          serviceId: 'pending',
          serviceName: `${transfer.domainName}${transfer.tld}`,
          planName: 'Domain Transfer',
          price,
          currency,
          billingCycle: 'yearly',
          startDate: new Date(),
          endDate: expiryDate,
          autoRenew: transfer.autoRenew,
          status: 'active',
          clientId: transfer.clientId,
          companyId,
        },
      });

      // 3. Create Domain
      const domain = await tx.domain.create({
        data: {
          name: transfer.domainName,
          tld: transfer.tld,
          registrar,
          expiryDate,
          autoRenew: transfer.autoRenew,
          nameservers,
          notes: `Transferred from ${transfer.previousProvider}`,
          clientId: transfer.clientId,
          companyId,
          subscriptionId: subscription.id,
        },
      });

      // 4. Update subscription serviceId
      await tx.subscription.update({
        where: { id: subscription.id },
        data: { serviceId: domain.id },
      });

      // 5. Create Invoice
      const invoice = await tx.invoice.create({
        data: {
          number: invoiceNumber,
          issueDate: new Date(),
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          status: 'pending',
          paymentStatus: 'unpaid',
          currency,
          notes: `Domain transfer: ${transfer.domainName}${transfer.tld} from ${transfer.previousProvider}`,
          subtotal: price,
          discountAmount: 0,
          vatAmount,
          total: price + vatAmount,
          clientId: transfer.clientId,
          companyId,
          subscriptionId: subscription.id,
          items: {
            create: {
              description: `Domain Transfer — ${transfer.domainName}${transfer.tld}`,
              quantity: 1,
              price,
              discount: 0,
              vat: taxRate,
            },
          },
        },
      });

      return { domain, subscription, invoice };
    });

    return { success: true as const, data: result };
  } catch (error) {
    return { success: false as const, error: String(error) };
  }
}
