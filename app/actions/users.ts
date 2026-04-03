'use server';

import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/auth';

type CreateUserInput = {
  name: string;
  username: string;
  email: string;
  password: string;
  avatar?: string;
  roleId: string;
  companyId: string;
  status?: string;
};

// ─── Queries ──────────────────────────────────────────────────────────────────

export async function getAllUsers(companyId: string) {
  try {
    const data = await prisma.user.findMany({
      where: { companyId },
      include: { role: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'asc' },
    });
    // Strip password from output
    return { success: true as const, data: data.map(({ password: _p, ...u }) => u) };
  } catch (error) {
    return { success: false as const, error: String(error) };
  }
}

export async function getUserById(id: string, companyId: string) {
  try {
    const data = await prisma.user.findFirst({
      where: { id, companyId },
      include: { role: true },
    });
    if (!data) return { success: false as const, error: 'User not found' };
    const { password: _p, ...safe } = data;
    return { success: true as const, data: safe };
  } catch (error) {
    return { success: false as const, error: String(error) };
  }
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export async function createUser(input: CreateUserInput) {
  try {
    const username = input.username.trim().toLowerCase();
    const email = input.email.trim().toLowerCase();
    if (!username || !email || !input.password.trim()) {
      return { success: false as const, error: 'Username, email, and password are required.' };
    }

    const usernameTaken = await prisma.user.findFirst({ where: { username } });
    if (usernameTaken) {
      return { success: false as const, error: 'Username is already taken.' };
    }

    const emailTaken = await prisma.user.findFirst({ where: { email } });
    if (emailTaken) {
      return { success: false as const, error: 'Email is already in use.' };
    }

    const data = await prisma.user.create({
      data: {
        name: input.name.trim(),
        username,
        email,
        password: await hashPassword(input.password),
        avatar: input.avatar,
        roleId: input.roleId,
        companyId: input.companyId,
        status: input.status ?? 'active',
      },
    });
    const { password: _p, ...safe } = data;
    return { success: true as const, data: safe };
  } catch (error) {
    return { success: false as const, error: String(error) };
  }
}

export async function updateUser(
  id: string,
  companyId: string,
  input: Partial<{
    name: string;
    username: string;
    email: string;
    password: string;
    avatar: string;
    roleId: string;
    status: string;
    lastLogin: Date;
  }>,
) {
  try {
    const existing = await prisma.user.findFirst({ where: { id, companyId } });
    if (!existing) return { success: false as const, error: 'User not found' };

    const dataToUpdate: Record<string, unknown> = {};

    if (input.name?.trim()) dataToUpdate.name = input.name.trim();

    if (input.username?.trim()) {
      const username = input.username.trim().toLowerCase();
      const usernameTaken = await prisma.user.findFirst({ where: { username, NOT: { id } } });
      if (usernameTaken) return { success: false as const, error: 'Username is already taken.' };
      dataToUpdate.username = username;
    }

    if (input.email?.trim()) {
      const email = input.email.trim().toLowerCase();
      const emailTaken = await prisma.user.findFirst({ where: { email, NOT: { id } } });
      if (emailTaken) return { success: false as const, error: 'Email is already in use.' };
      dataToUpdate.email = email;
    }

    if (input.avatar !== undefined) dataToUpdate.avatar = input.avatar;
    if (input.roleId) dataToUpdate.roleId = input.roleId;
    if (input.status) dataToUpdate.status = input.status;
    if (input.lastLogin) dataToUpdate.lastLogin = input.lastLogin;

    if (input.password?.trim()) {
      dataToUpdate.password = await hashPassword(input.password.trim());
    }

    if (Object.keys(dataToUpdate).length === 0) {
      return { success: false as const, error: 'No changes to save.' };
    }

    const data = await prisma.user.update({ where: { id }, data: dataToUpdate });
    const { password: _p, ...safe } = data;
    return { success: true as const, data: safe };
  } catch (error) {
    return { success: false as const, error: String(error) };
  }
}

export async function deleteUser(id: string, companyId: string) {
  try {
    const existing = await prisma.user.findFirst({ where: { id, companyId } });
    if (!existing) return { success: false as const, error: 'User not found' };
    await prisma.user.delete({ where: { id } });
    return { success: true as const };
  } catch (error) {
    return { success: false as const, error: String(error) };
  }
}
