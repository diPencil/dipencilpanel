'use server';

import { requireSession, requireSuperAdminSession, getSessionTenant } from '@/lib/auth/auth-guard';
import { hasPermission } from '@/lib/auth/api-auth';

import { prisma } from '@/lib/db/prisma';

// ─── Types ────────────────────────────────────────────────────────────────────

type CompanyInput = {
  name: string;
  ownerName?: string;
  email?: string;
  phone?: string;
  address?: string;
  vatNumber?: string;
  logo?: string;
  invoiceLogo?: string;
  invoiceEmailHeaderHtml?: string | null;
  invoiceEmailBodyHtml?: string | null;
  invoiceEmailFooterHtml?: string | null;
  reminderEmailHeaderHtml?: string | null;
  reminderEmailBodyHtml?: string | null;
  reminderEmailFooterHtml?: string | null;
  dipencilLogo?: string | null;
  dipencilSellerName?: string | null;
  dipencilSellerLines?: string | null;
  dipencilFooterLeft?: string | null;
  dipencilFooterRight?: string | null;
  clientInvoiceFooterLeft?: string | null;
  clientInvoiceFooterRight?: string | null;
  projectName?: string | null;
  favicon?: string | null;
  loginLogo?: string | null;
  smtpHost?: string | null;
  smtpPort?: number | null;
  smtpEncryption?: string | null;
  smtpUser?: string | null;
  smtpPass?: string | null;
  smtpFromName?: string | null;
  smtpFromEmail?: string | null;
  smtpTimeout?: number | null;
  smtpAuthEnabled?: boolean | null;
  imapProtocol?: string | null;
  imapHost?: string | null;
  imapPort?: number | null;
  imapEncryption?: string | null;
  imapUser?: string | null;
  imapPass?: string | null;
  imapMailbox?: string | null;
  currency?: string;
  taxRate?: number;
  exchangeRates?: string;
  status?: string;
};

// ─── Queries ──────────────────────────────────────────────────────────────────

export async function getPublicBranding() {
  try {
    const comp = await prisma.company.findFirst({
      select: {
        name: true,
        projectName: true,
        logo: true,
        loginLogo: true,
        favicon: true,
      },
    });
    return {
      success: true as const,
      data: {
        name: comp?.name || 'diPencil Panel',
        projectName: comp?.projectName || 'diPencil Panel',
        logo: comp?.logo || '/pencil-logo.png',
        loginLogo: comp?.loginLogo || '/favicon.png',
        favicon: comp?.favicon || '/favicon.svg',
      },
    };
  } catch {
    return {
      success: true as const,
      data: {
        name: 'diPencil Panel',
        projectName: 'diPencil Panel',
        logo: '/pencil-logo.png',
        loginLogo: '/favicon.png',
        favicon: '/favicon.svg',
      },
    };
  }
}

export async function getCompanies() {
  await requireSession();
  try {
    const tenant = await getSessionTenant();
    if (!tenant) return { success: false as const, error: 'Unauthorized' };

    const user = await prisma.user.findUnique({
      where: { id: tenant.session.userId },
      select: { companyId: true, role: { select: { permissions: true } } },
    });
    const isSuperAdmin = user?.role?.permissions ? hasPermission(user.role.permissions, '*', 'view') : false;

    // Super admins (operator console) may list every company. Everyone else
    // only ever sees their own tenant.
    const data = await prisma.company.findMany({
      where: isSuperAdmin ? undefined : { id: tenant.companyId },
      orderBy: { createdAt: 'asc' },
      include: { _count: { select: { users: true } } },
    });
    return { success: true as const, data };
  } catch (error) {
    return { success: false as const, error: String(error) };
  }
}

export async function getCompany(id: string) {
  await requireSession();
  try {
    const tenant = await getSessionTenant();
    if (!tenant) return { success: false as const, error: 'Unauthorized' };

    const user = await prisma.user.findUnique({
      where: { id: tenant.session.userId },
      select: { companyId: true, role: { select: { permissions: true } } },
    });
    const isSuperAdmin = user?.role?.permissions ? hasPermission(user.role.permissions, '*', 'view') : false;
    if (!isSuperAdmin && user?.companyId !== id) {
      return { success: false as const, error: 'Company not found' };
    }

    const data = await prisma.company.findUnique({ where: { id } });
    if (!data) return { success: false as const, error: 'Company not found' };
    return { success: true as const, data };
  } catch (error) {
    return { success: false as const, error: String(error) };
  }
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export async function createCompany(input: CompanyInput) {
  await requireSuperAdminSession();
  try {
    const data = await prisma.company.create({ data: input });
    return { success: true as const, data };
  } catch (error) {
    return { success: false as const, error: String(error) };
  }
}

const ALLOWED_COMPANY_UPDATE_KEYS = [
  'name',
  'ownerName',
  'email',
  'phone',
  'address',
  'vatNumber',
  'logo',
  'invoiceLogo',
  'invoiceEmailHeaderHtml',
  'invoiceEmailBodyHtml',
  'invoiceEmailFooterHtml',
  'reminderEmailHeaderHtml',
  'reminderEmailBodyHtml',
  'reminderEmailFooterHtml',
  'dipencilLogo',
  'dipencilSellerName',
  'dipencilSellerLines',
  'dipencilFooterLeft',
  'dipencilFooterRight',
  'clientInvoiceFooterLeft',
  'clientInvoiceFooterRight',
  'projectName',
  'favicon',
  'loginLogo',
  'smtpHost',
  'smtpPort',
  'smtpEncryption',
  'smtpUser',
  'smtpPass',
  'smtpFromName',
  'smtpFromEmail',
  'smtpTimeout',
  'smtpAuthEnabled',
  'imapProtocol',
  'imapHost',
  'imapPort',
  'imapEncryption',
  'imapUser',
  'imapPass',
  'imapMailbox',
  'currency',
  'taxRate',
  'exchangeRates',
  'status',
] as const;

export async function updateCompany(id: string, input: Partial<CompanyInput>) {
  await requireSession();
  try {
    const tenant = await getSessionTenant();
    if (!tenant) return { success: false as const, error: 'Unauthorized' };

    const user = await prisma.user.findUnique({
      where: { id: tenant.session.userId },
      select: { companyId: true, role: { select: { permissions: true } } },
    });
    const isSuperAdmin = user?.role?.permissions ? hasPermission(user.role.permissions, '*', 'view') : false;
    if (!isSuperAdmin && user?.companyId !== id) {
      return { success: false as const, error: 'Forbidden' };
    }

    const cleanData: Record<string, unknown> = {};
    for (const key of ALLOWED_COMPANY_UPDATE_KEYS) {
      const val = (input as Record<string, unknown>)[key];
      if (val !== undefined) {
        cleanData[key] = val;
      }
    }

    const data = await prisma.company.update({
      where: { id },
      data: cleanData as Partial<CompanyInput>,
    });
    return { success: true as const, data };
  } catch (error) {
    return { success: false as const, error: String(error) };
  }
}

export async function deleteCompany(id: string) {
  await requireSuperAdminSession();
  try {
    await prisma.company.delete({ where: { id } });
    return { success: true as const };
  } catch (error) {
    return { success: false as const, error: String(error) };
  }
}
