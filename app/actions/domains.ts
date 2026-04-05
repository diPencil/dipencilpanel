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
  // Invoice fields
  taxRate?: number;
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
 * Creates a Domain + Subscription + Invoice atomically in a single transaction.
 */
export async function createDomain(input: CreateDomainInput) {
  try {
    const company = await prisma.company.findUnique({
      where: { id: input.companyId },
    });
    const taxRate = input.taxRate ?? company?.taxRate ?? 0;
    const currency = input.currency ?? company?.currency ?? 'USD';
    const invoiceNumber = await generateNextInvoiceNumber(input.companyId);

    const result = await prisma.$transaction(async (tx) => {
      const startDate = new Date();
      const endDate = new Date(input.expiryDate);

      // 1. Create Subscription
      const subscription = await tx.subscription.create({
        data: {
          serviceType: 'domain',
          serviceId: 'pending', // updated after domain creation
          serviceName: `${input.name}${input.tld}`,
          planName: input.planName ?? 'Domain Registration',
          price: input.price,
          currency,
          billingCycle: 'yearly',
          startDate,
          endDate,
          autoRenew: input.autoRenew ?? true,
          status: 'active',
          clientId: input.clientId,
          companyId: input.companyId,
        },
      });

      // 2. Create Domain linked to Subscription
      const domain = await tx.domain.create({
        data: {
          name: input.name,
          tld: input.tld,
          registrar: input.registrar,
          expiryDate: new Date(input.expiryDate),
          autoRenew: input.autoRenew ?? true,
          nameservers: input.nameservers,
          notes: input.notes,
          reminderDays: input.reminderDays,
          clientId: input.clientId,
          companyId: input.companyId,
          subscriptionId: subscription.id,
        },
      });

      // 3. Update subscription with real serviceId
      await tx.subscription.update({
        where: { id: subscription.id },
        data: { serviceId: domain.id },
      });

      // 4. Calculate invoice totals
      const basePrice = input.price;
      const vatAmount = basePrice * (taxRate / 100);
      const total = basePrice + vatAmount;

      // 5. Create Invoice
      const invoice = await tx.invoice.create({
        data: {
          number: invoiceNumber,
          issueDate: startDate,
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          status: 'pending',
          paymentStatus: 'unpaid',
          currency,
          notes: `Domain registration: ${input.name}${input.tld}`,
          subtotal: basePrice,
          discountAmount: 0,
          vatAmount,
          total,
          clientId: input.clientId,
          companyId: input.companyId,
          subscriptionId: subscription.id,
          items: {
            create: {
              description: `${input.planName ?? 'Domain Registration'} — ${input.name}${input.tld}`,
              quantity: 1,
              price: input.price,
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
    nameservers: string;
    notes: string;
    reminderDays: number;
  }>,
) {
  try {
    const existing = await prisma.domain.findFirst({ where: { id, companyId } });
    if (!existing) return { success: false as const, error: 'Domain not found' };

    const data = await prisma.domain.update({
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
    const currency = domain.subscription?.currency ?? company?.currency ?? 'USD';
    const price = domain.subscription?.price ?? 0;
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
    const currency = domain.subscription?.currency ?? company?.currency ?? 'USD';
    const price = domain.subscription?.price ?? 0;
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
