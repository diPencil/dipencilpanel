'use server';

import { prisma } from '@/lib/prisma';

type CreateRoleInput = {
  name: string;
  description?: string;
  permissions: string; // JSON string
  companyId: string;
};

// ─── Queries ──────────────────────────────────────────────────────────────────

export async function getAllRoles(companyId: string) {
  try {
    const data = await prisma.role.findMany({
      where: { companyId },
      include: { _count: { select: { users: true } } },
      orderBy: { createdAt: 'asc' },
    });
    return { success: true as const, data };
  } catch (error) {
    return { success: false as const, error: String(error) };
  }
}

export async function getRoleById(id: string, companyId: string) {
  try {
    const data = await prisma.role.findFirst({
      where: { id, companyId },
      include: { users: { select: { id: true, name: true, email: true } } },
    });
    if (!data) return { success: false as const, error: 'Role not found' };
    return { success: true as const, data };
  } catch (error) {
    return { success: false as const, error: String(error) };
  }
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export async function createRole(input: CreateRoleInput) {
  try {
    const data = await prisma.role.create({ data: input });
    return { success: true as const, data };
  } catch (error) {
    return { success: false as const, error: String(error) };
  }
}

export async function updateRole(
  id: string,
  companyId: string,
  input: Partial<{ name: string; description: string; permissions: string }>,
) {
  try {
    const existing = await prisma.role.findFirst({ where: { id, companyId } });
    if (!existing) return { success: false as const, error: 'Role not found' };

    const data = await prisma.role.update({ where: { id }, data: input });
    return { success: true as const, data };
  } catch (error) {
    return { success: false as const, error: String(error) };
  }
}

export async function deleteRole(id: string, companyId: string) {
  try {
    const existing = await prisma.role.findFirst({ where: { id, companyId } });
    if (!existing) return { success: false as const, error: 'Role not found' };

    // Prevent deletion if users are assigned
    const usersWithRole = await prisma.user.count({ where: { roleId: id } });
    if (usersWithRole > 0) {
      return {
        success: false as const,
        error: `Cannot delete role: ${usersWithRole} user(s) are assigned to it`,
      };
    }

    await prisma.role.delete({ where: { id } });
    return { success: true as const };
  } catch (error) {
    return { success: false as const, error: String(error) };
  }
}
