'use server';

import { prisma } from '@/lib/prisma';
import { generateNextInvoiceNumber } from '@/lib/billing-utils';

// ─── Types ────────────────────────────────────────────────────────────────────

type CreateDomainInput = {
  name: string;
  tld: string;
  registrar: string;
  expiryDate: Date | string;
  autoRenew?: boolean;
  nameservers?: string;
  notes?: string;
  reminderDays?: number;
  clientId: string;
  companyId: string;
  // Subscription fields
  price: number;
  currency?: string;
  planName?: string;
};

// ─── Queries ──────────────────────────────────────────────────────────────────

export async function getAllDomains(companyId: string, page = 1, limit = 100) {
  try {
    const data = await prisma.domain.findMany({
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

export async function getDomainById(id: string, companyId: string) {
  try {
    const data = await prisma.domain.findFirst({
      where: { id, companyId },
      include: { client: true, subscription: true },
    });
    if (!data) return { success: false as const, error: 'Domain not found' };
    return { success: true as const, data };
  } catch (error) {
    return { success: false as const, error: String(error) };
  }
}

export async function getExpiringDomains(companyId: string, withinDays = 30) {
  try {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + withinDays);
    const data = await prisma.domain.findMany({
      where: {
        companyId,
        expiryDate: { lte: cutoff },
        status: { not: 'expired' },
      },
      include: { client: { select: { id: true, name: true } } },
      orderBy: { expiryDate: 'asc' },
    });
    return { success: true as const, data };
  } catch (error) {
    return { success: false as const, error: String(error) };
  }
}

// ─── Mutations ────────────────────────────────────────────────────────────────

/**
 * Creates a Domain record. No subscription or invoice is created here;
 * those are managed separately from the Billing > Subscriptions page.
 */
export async function createDomain(input: CreateDomainInput) {
  try {
    const company = await prisma.company.findUnique({
      where: { id: input.companyId },
    });
    const currency = input.currency ?? company?.currency ?? 'USD';

    const domain = await prisma.domain.create({
      data: {
        name: input.name,
        tld: input.tld,
        registrar: input.registrar,
        expiryDate: new Date(input.expiryDate),
        autoRenew: input.autoRenew ?? true,
        nameservers: input.nameservers,
        notes: input.notes,
        reminderDays: input.reminderDays,
        price: input.price,
        currency,
        billingCycle: 'yearly',
        clientId: input.clientId,
        companyId: input.companyId,
      },
    });

    return { success: true as const, data: { domain } };
  } catch (error) {
    return { success: false as const, error: String(error) };
  }
}

export async function updateDomain(
  id: string,
  companyId: string,
  input: Partial<{
    name: string;
    tld: string;
    registrar: string;
    expiryDate: Date | string;
    autoRenew: boolean;
    status: string;
    /** Accept either a JSON string or a string array — both are handled. */
    nameservers: string | string[];
    notes: string;
    reminderDays: number;
    clientId: string;
  }>,
) {
  try {
    const existing = await prisma.domain.findFirst({ where: { id, companyId } });
    if (!existing) return { success: false as const, error: 'Domain not found' };

    // Normalise nameservers: always persist as JSON string
    let nameservers: string | undefined;
    if (input.nameservers !== undefined) {
      nameservers = Array.isArray(input.nameservers)
        ? JSON.stringify(input.nameservers)
        : input.nameservers;
    }

    const { nameservers: _ignored, expiryDate, ...rest } = input as Record<string, unknown>;
    void _ignored;

    // Only pass known DB fields to prisma (strip any client-side-only fields like planName, price)
    const safeFields: Record<string, unknown> = {};
    const allowedKeys = ['name', 'tld', 'registrar', 'autoRenew', 'status', 'notes', 'reminderDays', 'clientId'];
    for (const key of allowedKeys) {
      if (key in rest && rest[key] !== undefined) safeFields[key] = rest[key];
    }

    const data = await prisma.domain.update({
      where: { id },
      data: {
        ...safeFields,
        expiryDate: expiryDate ? new Date(expiryDate as string) : undefined,
        ...(nameservers !== undefined ? { nameservers } : {}),
      },
    });
    return { success: true as const, data };
  } catch (error) {
    return { success: false as const, error: String(error) };
  }
}

export async function deleteDomain(id: string, companyId: string) {
  try {
    const existing = await prisma.domain.findFirst({ where: { id, companyId } });
    if (!existing) return { success: false as const, error: 'Domain not found' };
    await prisma.domain.delete({ where: { id } });
    return { success: true as const };
  } catch (error) {
    return { success: false as const, error: String(error) };
  }
}

/**
 * Renews a domain: extends expiryDate by 1 year, resets status to active,
 * updates subscription endDate, and generates a renewal invoice.
 */
export async function renewDomain(id: string, companyId: string) {
  try {
    const domain = await prisma.domain.findFirst({
      where: { id, companyId },
      include: { subscription: true, client: true },
    });
    if (!domain) return { success: false as const, error: 'Domain not found' };

    const company = await prisma.company.findUnique({ where: { id: companyId } });
    const taxRate = company?.taxRate ?? 0;
    const currency = domain.currency || company?.currency || 'USD';
    const price = domain.price ?? 0;
    const invoiceNumber = await generateNextInvoiceNumber(companyId);

    const newExpiry = new Date(domain.expiryDate);
    newExpiry.setFullYear(newExpiry.getFullYear() + 1);
    const vatAmount = price * (taxRate / 100);

    const result = await prisma.$transaction(async (tx) => {
      const updatedDomain = await tx.domain.update({
        where: { id },
        data: { expiryDate: newExpiry, status: 'active' },
      });

      if (domain.subscriptionId) {
        await tx.subscription.update({
          where: { id: domain.subscriptionId },
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
          notes: `Domain renewal: ${domain.name}${domain.tld}`,
          subtotal: price,
          discountAmount: 0,
          vatAmount,
          total: price + vatAmount,
          clientId: domain.clientId,
          companyId,
          subscriptionId: domain.subscriptionId,
          items: {
            create: {
              description: `Domain Renewal — ${domain.name}${domain.tld}`,
              quantity: 1,
              price,
              discount: 0,
              vat: taxRate,
            },
          },
        },
      });

      return { domain: updatedDomain, invoice };
    });

    return { success: true as const, data: result };
  } catch (error) {
    return { success: false as const, error: String(error) };
  }
}

export interface DomainRenewalScheduleInput {
  billingCycle: 'monthly' | 'yearly';
  issueDate: string;
  dueDate: string;
  expiryDate: string;
}

export async function renewDomainWithSchedule(
  id: string,
  companyId: string,
  input: DomainRenewalScheduleInput,
) {
  try {
    const domain = await prisma.domain.findFirst({
      where: { id, companyId },
      include: { subscription: true, client: true },
    });
    if (!domain) return { success: false as const, error: 'Domain not found' };

    const company = await prisma.company.findUnique({ where: { id: companyId } });
    const taxRate = company?.taxRate ?? 0;
    const currency = domain.currency || company?.currency || 'USD';
    const price = domain.price ?? 0;
    const invoiceNumber = await generateNextInvoiceNumber(companyId);

    const newExpiry = new Date(input.expiryDate);
    const vatAmount = price * (taxRate / 100);

    const result = await prisma.$transaction(async (tx) => {
      const updatedDomain = await tx.domain.update({
        where: { id },
        data: { expiryDate: newExpiry, status: 'active' },
      });

      if (domain.subscriptionId) {
        await tx.subscription.update({
          where: { id: domain.subscriptionId },
          data: { endDate: newExpiry, status: 'active', billingCycle: input.billingCycle },
        });
      }

      const invoice = await tx.invoice.create({
        data: {
          number: invoiceNumber,
          issueDate: new Date(input.issueDate),
          dueDate: new Date(input.dueDate),
          status: 'pending',
          paymentStatus: 'unpaid',
          currency,
          notes: `Domain renewal: ${domain.name}${domain.tld}`,
          subtotal: price,
          discountAmount: 0,
          vatAmount,
          total: price + vatAmount,
          clientId: domain.clientId,
          companyId,
          subscriptionId: domain.subscriptionId,
          items: {
            create: {
              description: `Domain Renewal — ${domain.name}${domain.tld}`,
              quantity: 1,
              price,
              discount: 0,
              vat: taxRate,
            },
          },
        },
      });

      return { domain: updatedDomain, invoice };
    });

    return { success: true as const, data: result };
  } catch (error) {
    return { success: false as const, error: String(error) };
  }
}
