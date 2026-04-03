'use server';

import { prisma } from '@/lib/prisma';

// ─── Types ────────────────────────────────────────────────────────────────────

type ClientInput = {
  name: string;
  email: string;
  phone?: string;
  address?: string;
  companyName?: string;
  companyId: string;
};

// ─── Queries ──────────────────────────────────────────────────────────────────

export async function getAllClients(companyId: string, page = 1, limit = 100) {
  try {
    const data = await prisma.client.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { success: true as const, data };
  } catch (error) {
    return { success: false as const, error: String(error) };
  }
}

export async function getClientById(id: string, companyId: string) {
  try {
    const data = await prisma.client.findFirst({
      where: { id, companyId },
      include: {
        domains: true,
        hosting: true,
        vps: true,
        emails: true,
        websites: true,
        subscriptions: { where: { status: 'active' } },
        invoices: { orderBy: { issueDate: 'desc' }, take: 10 },
        payments: { orderBy: { date: 'desc' }, take: 10 },
      },
    });
    if (!data) return { success: false as const, error: 'Client not found' };
    return { success: true as const, data };
  } catch (error) {
    return { success: false as const, error: String(error) };
  }
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export async function createClient(input: ClientInput) {
  try {
    const { name, email, phone, address, companyName, companyId } = input;
    const data = await prisma.client.create({
      data: {
        name,
        email,
        phone,
        address,
        companyName,
        companyId,
      },
    });
    return { success: true as const, data };
  } catch (error) {
    return { success: false as const, error: String(error) };
  }
}

export async function updateClient(
  id: string,
  companyId: string,
  input: Partial<Omit<ClientInput, 'companyId'>>,
) {
  try {
    // Verify tenant ownership before update
    const existing = await prisma.client.findFirst({ where: { id, companyId } });
    if (!existing) return { success: false as const, error: 'Access denied' };

    const { name, email, phone, address, companyName } = input;
    const data = await prisma.client.update({
      where: { id },
      data: { name, email, phone, address, companyName },
    });
    return { success: true as const, data };
  } catch (error) {
    return { success: false as const, error: String(error) };
  }
}

export async function deleteClient(id: string, companyId: string) {
  try {
    const existing = await prisma.client.findFirst({ where: { id, companyId } });
    if (!existing) return { success: false as const, error: 'Client not found' };
    await prisma.client.delete({ where: { id } });
    return { success: true as const };
  } catch (error) {
    return { success: false as const, error: String(error) };
  }
}

// ─── Client Groups ────────────────────────────────────────────────────────────

export async function getAllClientGroups(companyId: string) {
  try {
    const data = await prisma.clientGroup.findMany({
      where: { companyId },
      orderBy: { createdAt: 'asc' },
    });
    return { success: true as const, data };
  } catch (error) {
    return { success: false as const, error: String(error) };
  }
}

export async function createClientGroup(input: {
  name: string;
  description?: string;
  color?: string;
  companyId: string;
}) {
  try {
    const data = await prisma.clientGroup.create({
      data: { ...input, clientIds: '[]' },
    });
    return { success: true as const, data };
  } catch (error) {
    return { success: false as const, error: String(error) };
  }
}

export async function updateClientGroup(
  id: string,
  companyId: string,
  input: Partial<{ name: string; description: string; color: string; clientIds: string }>,
) {
  try {
    const existing = await prisma.clientGroup.findFirst({ where: { id, companyId } });
    if (!existing) return { success: false as const, error: 'Group not found' };
    const data = await prisma.clientGroup.update({ where: { id }, data: input });
    return { success: true as const, data };
  } catch (error) {
    return { success: false as const, error: String(error) };
  }
}

export async function deleteClientGroup(id: string, companyId: string) {
  try {
    const existing = await prisma.clientGroup.findFirst({ where: { id, companyId } });
    if (!existing) return { success: false as const, error: 'Group not found' };
    await prisma.clientGroup.delete({ where: { id } });
    return { success: true as const };
  } catch (error) {
    return { success: false as const, error: String(error) };
  }
}

export async function toggleClientInGroup(
  groupId: string,
  clientId: string,
  companyId: string,
) {
  try {
    const group = await prisma.clientGroup.findFirst({ where: { id: groupId, companyId } });
    if (!group) return { success: false as const, error: 'Group not found' };

    const ids: string[] = JSON.parse(group.clientIds || '[]');
    const updated = ids.includes(clientId)
      ? ids.filter((id) => id !== clientId)
      : [...ids, clientId];

    const data = await prisma.clientGroup.update({
      where: { id: groupId },
      data: { clientIds: JSON.stringify(updated) },
    });
    return { success: true as const, data };
  } catch (error) {
    return { success: false as const, error: String(error) };
  }
}
