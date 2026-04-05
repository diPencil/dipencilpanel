'use server';

import { prisma } from '@/lib/prisma';
import { computeEndDate } from '@/lib/billing-utils';

// ─── Types ────────────────────────────────────────────────────────────────────

type CreateMobileAppInput = {
  name: string;
  appType: string;
  framework?: string;
  description?: string;
  plan: string;
  price: number;
  billingCycle: string;
  autoRenew?: boolean;
  expiryDate?: Date | string;
  // Linked services
  domainId?: string;
  hostingId?: string;
  vpsId?: string;
  emailIds?: string[];
  // Required
  clientId: string;
  companyId: string;
  currency?: string;
  taxRate?: number;
};

type UpdateMobileAppInput = Partial<{
  name: string;
  appType: string;
  framework: string;
  description: string;
  status: string;
  plan: string;
  price: number;
  billingCycle: string;
  autoRenew: boolean;
  expiryDate: Date | string;
  domainId: string;
  hostingId: string;
  vpsId: string;
  emailIds: string[];
}>;

// ─── Queries ──────────────────────────────────────────────────────────────────

export async function getAllMobileApps(companyId: string, page = 1, limit = 100) {
  try {
    const data = await prisma.mobileApp.findMany({
      where: { companyId },
      include: {
        client: { select: { id: true, name: true, email: true } },
        subscription: true,
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { success: true as const, data };
  } catch (error) {
    return { success: false as const, error: String(error) };
  }
}

export async function getMobileAppById(id: string, companyId: string) {
  try {
    const data = await prisma.mobileApp.findFirst({
      where: { id, companyId },
      include: {
        client: true,
        subscription: {
          include: {
            invoices: {
              orderBy: { issueDate: 'desc' },
              take: 5,
              include: { payments: true },
            },
          },
        },
      },
    });
    if (!data) return { success: false as const, error: 'Mobile app not found' };
    return { success: true as const, data };
  } catch (error) {
    return { success: false as const, error: String(error) };
  }
}

export async function getMobileAppsByClient(clientId: string, companyId: string) {
  try {
    const data = await prisma.mobileApp.findMany({
      where: { clientId, companyId },
      include: { subscription: true },
      orderBy: { createdAt: 'desc' },
    });
    return { success: true as const, data };
  } catch (error) {
    return { success: false as const, error: String(error) };
  }
}

export async function getMobileAppStats(companyId: string) {
  try {
    const [total, live, inDev, suspended, revenue] = await Promise.all([
      prisma.mobileApp.count({ where: { companyId } }),
      prisma.mobileApp.count({ where: { companyId, status: 'live' } }),
      prisma.mobileApp.count({ where: { companyId, status: 'development' } }),
      prisma.mobileApp.count({ where: { companyId, status: 'suspended' } }),
      prisma.payment.aggregate({
        where: {
          companyId,
          status: 'completed',
          invoice: {
            subscription: { serviceType: 'mobile_app' },
          },
        },
        _sum: { amount: true },
      }),
    ]);
    return {
      success: true as const,
      data: {
        total,
        live,
        inDevelopment: inDev,
        suspended,
        revenue: revenue._sum.amount ?? 0,
      },
    };
  } catch (error) {
    return { success: false as const, error: String(error) };
  }
}

// ─── Mutations ────────────────────────────────────────────────────────────────

/**
 * Creates a MobileApp record. No subscription or invoice is created here;
 * those are managed separately from the Billing > Subscriptions page.
 */
export async function createMobileApp(input: CreateMobileAppInput) {
  try {
    const endDate = input.expiryDate
      ? new Date(input.expiryDate)
      : computeEndDate(new Date(), input.billingCycle);

    const app = await prisma.mobileApp.create({
      data: {
        name: input.name,
        appType: input.appType,
        framework: input.framework ?? 'native',
        description: input.description,
        status: 'development',
        plan: input.plan,
        price: input.price,
        billingCycle: input.billingCycle,
        autoRenew: input.autoRenew ?? true,
        expiryDate: endDate,
        domainId: input.domainId,
        hostingId: input.hostingId,
        vpsId: input.vpsId,
        emailIds: JSON.stringify(input.emailIds ?? []),
        clientId: input.clientId,
        companyId: input.companyId,
      },
    });

    return { success: true as const, data: { app } };
    return { success: false as const, error: String(error) };
  }
}

export async function updateMobileApp(
  id: string,
  companyId: string,
  input: UpdateMobileAppInput,
) {
  try {
    const existing = await prisma.mobileApp.findFirst({ where: { id, companyId } });
    if (!existing) return { success: false as const, error: 'App not found' };

    const { emailIds, expiryDate, ...rest } = input;
    const data = await prisma.mobileApp.update({
      where: { id },
      data: {
        ...rest,
        expiryDate: expiryDate ? new Date(expiryDate) : undefined,
        emailIds: emailIds !== undefined ? JSON.stringify(emailIds) : undefined,
      },
    });
    return { success: true as const, data };
  } catch (error) {
    return { success: false as const, error: String(error) };
  }
}

export async function deleteMobileApp(id: string, companyId: string) {
  try {
    const existing = await prisma.mobileApp.findFirst({ where: { id, companyId } });
    if (!existing) return { success: false as const, error: 'App not found' };
    await prisma.mobileApp.delete({ where: { id } });
    return { success: true as const };
  } catch (error) {
    return { success: false as const, error: String(error) };
  }
}

export async function updateMobileAppStatus(
  id: string,
  companyId: string,
  status: 'development' | 'live' | 'suspended' | 'expired',
) {
  try {
    const existing = await prisma.mobileApp.findFirst({ where: { id, companyId } });
    if (!existing) return { success: false as const, error: 'App not found' };

    const data = await prisma.mobileApp.update({
      where: { id },
      data: {
        status,
        ...(status === 'suspended' ? {} : {}),
      },
    });

    // If suspended, also suspend the subscription
    if (status === 'suspended' && existing.subscriptionId) {
      await prisma.subscription.update({
        where: { id: existing.subscriptionId },
        data: { status: 'suspended', autoRenew: false },
      });
    }

    return { success: true as const, data };
  } catch (error) {
    return { success: false as const, error: String(error) };
  }
}
