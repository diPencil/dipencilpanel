'use server';

import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import {
  verifyPassword,
  hashPassword,
  setSessionCookie,
  clearSessionCookie,
  getSession,
  getUserIdFromSessionCookie,
} from '@/lib/auth';
import type { AccountActivityData } from '@/lib/account-activity-types';
import { fetchAccountActivity } from '@/lib/server/account-activity';

export interface LoginResult {
  success: boolean;
  error?: string;
}

export async function loginAction(
  identifier: string, // username OR email
  password: string,
  remember: boolean,
): Promise<LoginResult> {
  if (!identifier?.trim() || !password?.trim()) {
    return { success: false, error: 'Please enter your username/email and password.' };
  }

  try {
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { username: identifier.trim().toLowerCase() },
          { email: identifier.trim().toLowerCase() },
        ],
        status: 'active',
      },
    });

    if (!user || !user.password) {
      return { success: false, error: 'Invalid credentials. Please try again.' };
    }

    const valid = await verifyPassword(password, user.password);
    if (!valid) {
      return { success: false, error: 'Invalid credentials. Please try again.' };
    }

    // Update lastLogin
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    await setSessionCookie(
      { userId: user.id, username: user.username, name: user.name, email: user.email, avatar: user.avatar ?? undefined },
      remember,
    );

    return { success: true };
  } catch (err) {
    console.error('[loginAction]', err);
    return { success: false, error: 'Something went wrong. Please try again.' };
  }
}

export async function logoutAction(): Promise<void> {
  const session = await getSession();
  const userId = session?.userId ?? (await getUserIdFromSessionCookie());

  if (userId) {
    try {
      const { count } = await prisma.user.updateMany({
        where: { id: userId },
        data: { lastLogoutAt: new Date() },
      });
      if (count === 0) {
        console.warn('[logoutAction] no user row updated for id', userId);
      }
    } catch (err) {
      console.error('[logoutAction] lastLogoutAt', err);
    }
  } else {
    console.warn('[logoutAction] no userId from session or JWT cookie');
  }

  await clearSessionCookie();
  redirect('/login');
}

export async function getCurrentUser() {
  return getSession();
}

export type AccountActivity = AccountActivityData;

/** Prefer `fetchAccountActivity()` from RSC; this wraps the same logic for rare client refresh. */
export async function getAccountActivityAction(): Promise<AccountActivity | null> {
  try {
    return await fetchAccountActivity();
  } catch (err) {
    console.error('[getAccountActivityAction]', err);
    return null;
  }
}

export interface UpdateAccountResult {
  success: boolean;
  error?: string;
}

export async function updateAccountAction(input: {
  name?: string;
  username?: string;
  email?: string;
  avatar?: string;
  currentPassword?: string;
  newPassword?: string;
}): Promise<UpdateAccountResult> {
  const session = await getSession();
  if (!session) return { success: false, error: 'Not authenticated.' };

  try {
    const user = await prisma.user.findUnique({ where: { id: session.userId } });
    if (!user) return { success: false, error: 'User not found.' };

    const updateData: Record<string, unknown> = {};

    if (input.name?.trim()) updateData.name = input.name.trim();
    if (input.avatar !== undefined) updateData.avatar = input.avatar;
    if (input.email?.trim()) {
      const emailTaken = await prisma.user.findFirst({
        where: { email: input.email.trim().toLowerCase(), NOT: { id: user.id } },
      });
      if (emailTaken) return { success: false, error: 'Email already in use.' };
      updateData.email = input.email.trim().toLowerCase();
    }
    if (input.username?.trim()) {
      const usernameTaken = await prisma.user.findFirst({
        where: { username: input.username.trim().toLowerCase(), NOT: { id: user.id } },
      });
      if (usernameTaken) return { success: false, error: 'Username already taken.' };
      updateData.username = input.username.trim().toLowerCase();
    }

    if (input.newPassword?.trim()) {
      if (!input.currentPassword?.trim()) {
        return { success: false, error: 'Current password is required to set a new one.' };
      }
      const valid = user.password ? await verifyPassword(input.currentPassword, user.password) : false;
      if (!valid) return { success: false, error: 'Current password is incorrect.' };
      updateData.password = await hashPassword(input.newPassword);
    }

    if (Object.keys(updateData).length === 0) {
      return { success: false, error: 'No changes to save.' };
    }

    const updated = await prisma.user.update({ where: { id: user.id }, data: updateData });

    // Refresh session cookie with new name/email/username
    await setSessionCookie({
      userId: updated.id,
      username: updated.username,
      name: updated.name,
      email: updated.email,
      avatar: updated.avatar ?? undefined,
    });

    return { success: true };
  } catch (err) {
    console.error('[updateAccountAction]', err);
    return { success: false, error: 'Something went wrong. Please try again.' };
  }
}
