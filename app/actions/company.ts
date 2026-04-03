'use server';

import { prisma } from '@/lib/prisma';

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
  currency?: string;
  taxRate?: number;
  exchangeRates?: string;
  status?: string;
};

// ─── Queries ──────────────────────────────────────────────────────────────────

export async function getCompanies() {
  try {
    const data = await prisma.company.findMany({
      orderBy: { createdAt: 'asc' },
      include: { _count: { select: { users: true } } },
    });
    return { success: true as const, data };
  } catch (error) {
    return { success: false as const, error: String(error) };
  }
}

export async function getCompany(id: string) {
  try {
    const data = await prisma.company.findUnique({ where: { id } });
    if (!data) return { success: false as const, error: 'Company not found' };
    return { success: true as const, data };
  } catch (error) {
    return { success: false as const, error: String(error) };
  }
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export async function createCompany(input: CompanyInput) {
  try {
    const data = await prisma.company.create({ data: input });
    return { success: true as const, data };
  } catch (error) {
    return { success: false as const, error: String(error) };
  }
}

export async function updateCompany(id: string, input: Partial<CompanyInput>) {
  try {
    const data = await prisma.company.update({ where: { id }, data: input });
    return { success: true as const, data };
  } catch (error) {
    return { success: false as const, error: String(error) };
  }
}

export async function deleteCompany(id: string) {
  try {
    await prisma.company.delete({ where: { id } });
    return { success: true as const };
  } catch (error) {
    return { success: false as const, error: String(error) };
  }
}
