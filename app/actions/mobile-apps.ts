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
 * Creates a MobileApp + Subscription atomically in one transaction.
 */
export async function createMobileApp(input: CreateMobileAppInput) {
  try {
    const company = await prisma.company.findUnique({ where: { id: input.companyId } });
    const currency = input.currency ?? company?.currency ?? 'USD';
    const planLabel = input.plan.charAt(0).toUpperCase() + input.plan.slice(1);

    const result = await prisma.$transaction(async (tx) => {
      const startDate = new Date();
      const endDate = input.expiryDate
        ? new Date(input.expiryDate)
        : computeEndDate(startDate, input.billingCycle);

      // 1. Create Subscription
      const subscription = await tx.subscription.create({
        data: {
          serviceType: 'mobile_app',
          serviceId: 'pending',
          serviceName: input.name,
          planName: `${planLabel} Plan`,
          price: input.price,
          currency,
          billingCycle: input.billingCycle,
          startDate,
          endDate,
          autoRenew: input.autoRenew ?? true,
          status: 'active',
          clientId: input.clientId,
          companyId: input.companyId,
        },
      });

      // 2. Create MobileApp
      const app = await tx.mobileApp.create({
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
          subscriptionId: subscription.id,
        },
      });

      // 3. Update subscription with real serviceId
      await tx.subscription.update({
        where: { id: subscription.id },
        data: { serviceId: app.id },
      });

      return { app, subscription };
    });

    return { success: true as const, data: result };
  } catch (error) {
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
