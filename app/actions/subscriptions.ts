'use server';

import { prisma } from '@/lib/prisma';
import { generateNextInvoiceNumber, computeEndDate } from '@/lib/billing-utils';

type CreateSubscriptionInput = {
  serviceType: string;
  serviceId: string;
  serviceName?: string;
  planName?: string;
  price: number;
  /** Internal only — not used on invoices */
  providerPrice?: number | null;
  currency?: string;
  billingCycle: string;
  startDate?: Date | string;
  endDate: Date | string;
  autoRenew?: boolean;
  notes?: string;
  domainId?: string;
  clientId: string;
  companyId: string;
};

// ─── Queries ──────────────────────────────────────────────────────────────────

export async function getAllSubscriptions(companyId: string, page = 1, limit = 100) {
  try {
    const data = await prisma.subscription.findMany({
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

export async function getSubscriptionById(id: string, companyId: string) {
  try {
    const data = await prisma.subscription.findFirst({
      where: { id, companyId },
      include: {
        client: true,
        invoices: { orderBy: { issueDate: 'desc' }, take: 5 },
      },
    });
    if (!data) return { success: false as const, error: 'Subscription not found' };
    return { success: true as const, data };
  } catch (error) {
    return { success: false as const, error: String(error) };
  }
}

/**
 * Returns subscriptions expiring within `withinDays` days.
 */
export async function getExpiringSubscriptions(
  companyId: string,
  withinDays = 30,
) {
  try {
    const now = new Date();
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + withinDays);

    const data = await prisma.subscription.findMany({
      where: {
        companyId,
        status: 'active',
        endDate: { gte: now, lte: cutoff },
      },
      include: { client: { select: { id: true, name: true } } },
      orderBy: { endDate: 'asc' },
    });
    return { success: true as const, data };
  } catch (error) {
    return { success: false as const, error: String(error) };
  }
}

/**
 * Returns subscriptions that are past their end date but still marked active.
 */
export async function getOverdueSubscriptions(companyId: string) {
  try {
    const now = new Date();
    const data = await prisma.subscription.findMany({
      where: {
        companyId,
        status: 'active',
        endDate: { lt: now },
      },
      include: { client: { select: { id: true, name: true } } },
      orderBy: { endDate: 'asc' },
    });
    return { success: true as const, data };
  } catch (error) {
    return { success: false as const, error: String(error) };
  }
}

function subscriptionInvoiceLineName(sub: { serviceName?: string | null; planName?: string | null }): string {
  const n = sub.serviceName?.trim() || sub.planName?.trim();
  return n || 'Service';
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export async function createSubscription(input: CreateSubscriptionInput) {
  try {
    const company = await prisma.company.findUnique({ where: { id: input.companyId } });
    const currency = input.currency ?? company?.currency ?? 'USD';

    const data = await prisma.subscription.create({
      data: {
        serviceType: input.serviceType,
        serviceId: input.serviceId,
        serviceName: input.serviceName,
        planName: input.planName,
        price: input.price,
        providerPrice: input.providerPrice ?? null,
        currency,
        billingCycle: input.billingCycle,
        startDate: input.startDate ? new Date(input.startDate) : new Date(),
        endDate: new Date(input.endDate),
        autoRenew: input.autoRenew ?? true,
        notes: input.notes,
        domainId: input.domainId,
        status: 'active',
        clientId: input.clientId,
        companyId: input.companyId,
      },
    });
    return { success: true as const, data };
  } catch (error) {
    return { success: false as const, error: String(error) };
  }
}

export async function updateSubscription(
  id: string,
  companyId: string,
  input: Partial<{
    clientId: string;
    serviceType: string;
    serviceId: string;
    serviceName: string;
    planName: string;
    price: number;
    providerPrice: number | null;
    currency: string;
    billingCycle: string;
    startDate: Date | string;
    endDate: Date | string;
    autoRenew: boolean;
    status: string;
    notes: string;
  }>,
) {
  try {
    const existing = await prisma.subscription.findFirst({ where: { id, companyId } });
    if (!existing) return { success: false as const, error: 'Subscription not found' };

    const data = await prisma.subscription.update({
      where: { id },
      data: {
        clientId: input.clientId,
        serviceType: input.serviceType,
        serviceId: input.serviceId,
        serviceName: input.serviceName,
        planName: input.planName,
        price: input.price,
        providerPrice: input.providerPrice,
        currency: input.currency,
        billingCycle: input.billingCycle,
        startDate: input.startDate ? new Date(input.startDate) : undefined,
        endDate: input.endDate ? new Date(input.endDate) : undefined,
        autoRenew: input.autoRenew,
        status: input.status,
        notes: input.notes,
      },
    });
    return { success: true as const, data };
  } catch (error) {
    return { success: false as const, error: String(error) };
  }
}

export async function cancelSubscription(id: string, companyId: string) {
  try {
    const existing = await prisma.subscription.findFirst({ where: { id, companyId } });
    if (!existing) return { success: false as const, error: 'Subscription not found' };

    const data = await prisma.subscription.update({
      where: { id },
      data: { status: 'cancelled', autoRenew: false },
    });
    return { success: true as const, data };
  } catch (error) {
    return { success: false as const, error: String(error) };
  }
}

export async function deleteSubscription(id: string, companyId: string) {
  try {
    const existing = await prisma.subscription.findFirst({ where: { id, companyId } });
    if (!existing) return { success: false as const, error: 'Subscription not found' };
    await prisma.subscription.delete({ where: { id } });
    return { success: true as const };
  } catch (error) {
    return { success: false as const, error: String(error) };
  }
}

/**
 * Generates a renewal invoice for a subscription and extends its end date.
 */
export async function renewSubscription(id: string, companyId: string) {
  try {
    const subscription = await prisma.subscription.findFirst({
      where: { id, companyId },
      include: { client: true, invoices: { take: 1 } },
    });
    if (!subscription) return { success: false as const, error: 'Subscription not found' };

    // Look up linked domain name for the description
    let linkedDomainName: string | null = null;
    if (subscription.domainId) {
      const dom = await prisma.domain.findFirst({ where: { id: subscription.domainId }, select: { name: true, tld: true } });
      if (dom) linkedDomainName = `${dom.name}${dom.tld}`;
    } else {
      const dom = await prisma.domain.findFirst({ where: { subscriptionId: id }, select: { name: true, tld: true } });
      if (dom) linkedDomainName = `${dom.name}${dom.tld}`;
    }

    function buildDescription(prefix: string) {
      const base = subscriptionInvoiceLineName(subscription!);
      const label = prefix ? `${prefix} ${base}` : base;
      return linkedDomainName ? `${label}\n${linkedDomainName}` : label;
    }

    const company = await prisma.company.findUnique({ where: { id: companyId } });
    const taxRate = company?.taxRate ?? 0;
    const invoiceNumber = await generateNextInvoiceNumber(companyId);

    // If no invoices yet, we bill for the current period
    const isFirstInvoice = subscription.invoices.length === 0;
    
    let issueDate: Date;
    let nextBillingDate: Date;
    let updateEndDate: Date;

    if (isFirstInvoice) {
      issueDate = subscription.startDate;
      nextBillingDate = subscription.endDate;
      updateEndDate = subscription.endDate;
    } else {
      issueDate = subscription.endDate;
      nextBillingDate = computeEndDate(subscription.endDate, subscription.billingCycle);
      updateEndDate = nextBillingDate;
    }

    const vatAmount = subscription.price * (taxRate / 100);

    const result = await prisma.$transaction(async (tx) => {
      const updatedSubscription = await tx.subscription.update({
        where: { id },
        data: { endDate: updateEndDate, status: 'active' },
      });

      const invoice = await tx.invoice.create({
        data: {
          number: invoiceNumber,
          issueDate,
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Due in 7 days from TODAY
          nextBillingDate,
          status: 'pending',
          paymentStatus: 'unpaid',
          currency: subscription.currency,
          notes: null,
          subtotal: subscription.price,
          discountAmount: 0,
          vatAmount,
          total: subscription.price + vatAmount,
          clientId: subscription.clientId,
          companyId,
          subscriptionId: id,
          items: {
            create: {
              description: isFirstInvoice
                ? buildDescription('')
                : buildDescription('Renewal'),
              quantity: 1,
              price: subscription.price,
              discount: 0,
              vat: taxRate,
            },
          },
        },
        include: { items: true, subscription: true },
      });

      return { invoice, subscription: updatedSubscription };
    });

    return { success: true as const, data: result };
  } catch (error) {
    return { success: false as const, error: String(error) };
  }
}

export type RenewalScheduleInput = {
  billingCycle: 'monthly' | 'yearly';
  /** ISO date string (YYYY-MM-DD) */
  issueDate: string;
  dueDate: string;
  expiryDate: string;
};

function parseScheduleDate(s: string): Date | null {
  const d = new Date(s.trim());
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Renewal from reminders (or anywhere): custom issue / due / period end, optional billing cycle change,
 * creates the same style of invoice as {@link renewSubscription} and sets subscription active.
 */
export async function renewSubscriptionWithSchedule(
  id: string,
  companyId: string,
  input: RenewalScheduleInput,
) {
  try {
    const issueDate = parseScheduleDate(input.issueDate);
    const dueDate = parseScheduleDate(input.dueDate);
    const expiryDate = parseScheduleDate(input.expiryDate);
    if (!issueDate || !dueDate || !expiryDate) {
      return { success: false as const, error: 'Invalid date(s)' };
    }
    if (expiryDate.getTime() <= issueDate.getTime()) {
      return { success: false as const, error: 'Expiry date must be after issue date' };
    }

    const subscription = await prisma.subscription.findFirst({
      where: { id, companyId },
      include: { client: true },
    });
    if (!subscription) return { success: false as const, error: 'Subscription not found' };

    const cycle = input.billingCycle === 'yearly' ? 'yearly' : 'monthly';
    const company = await prisma.company.findUnique({ where: { id: companyId } });
    const taxRate = company?.taxRate ?? 0;
    const invoiceNumber = await generateNextInvoiceNumber(companyId);
    const vatAmount = subscription.price * (taxRate / 100);
    const issueStr = issueDate.toISOString().split('T')[0];
    const expiryStr = expiryDate.toISOString().split('T')[0];

    const result = await prisma.$transaction(async (tx) => {
      const updatedSubscription = await tx.subscription.update({
        where: { id },
        data: {
          endDate: expiryDate,
          billingCycle: cycle,
          status: 'active',
        },
      });

      const invoice = await tx.invoice.create({
        data: {
          number: invoiceNumber,
          issueDate,
          dueDate,
          nextBillingDate: expiryDate,
          status: 'pending',
          paymentStatus: 'unpaid',
          currency: subscription.currency,
          notes: null,
          subtotal: subscription.price,
          discountAmount: 0,
          vatAmount,
          total: subscription.price + vatAmount,
          clientId: subscription.clientId,
          companyId,
          subscriptionId: id,
          items: {
            create: {
              description: `Renewal ${subscriptionInvoiceLineName(subscription)}`,
              quantity: 1,
              price: subscription.price,
              discount: 0,
              vat: taxRate,
            },
          },
        },
        include: { items: true, subscription: true },
      });

      return { invoice, subscription: updatedSubscription };
    });

    return { success: true as const, data: result };
  } catch (error) {
    return { success: false as const, error: String(error) };
  }
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function utcDayStart(d: Date): number {
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

/**
 * For subscriptions with autoRenew + active: if end date is within 7 days (or already passed),
 * generates a renewal invoice via the same path as manual renew — unless an unpaid invoice
 * is already linked (avoids stacking / duplicate runs).
 */
export async function runSubscriptionAutoRenewals(companyId: string) {
  try {
    const subs = await prisma.subscription.findMany({
      where: {
        companyId,
        autoRenew: true,
        status: 'active',
      },
    });

    const renewedIds: string[] = [];
    const todayUtc = utcDayStart(new Date());

    for (const sub of subs) {
      const endUtc = utcDayStart(new Date(sub.endDate));
      const daysLeft = Math.round((endUtc - todayUtc) / MS_PER_DAY);
      if (daysLeft > 7) continue;

      const unpaid = await prisma.invoice.findFirst({
        where: {
          subscriptionId: sub.id,
          paymentStatus: 'unpaid',
        },
      });
      if (unpaid) continue;

      const res = await renewSubscription(sub.id, companyId);
      if (res.success) {
        renewedIds.push(sub.id);
      }
    }

    return { success: true as const, renewedCount: renewedIds.length, renewedIds };
  } catch (error) {
    return {
      success: false as const,
      error: String(error),
      renewedCount: 0,
      renewedIds: [] as string[],
    };
  }
}
