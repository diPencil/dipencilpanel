'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import {
  verifyPassword,
  hashPassword,
  setSessionCookie,
  clearSessionCookie,
  getSession,
  getUserIdFromSessionCookie,
} from '@/lib/auth/auth';
import type { AccountActivityData } from '@/lib/auth/account-activity-types';
import { fetchAccountActivity } from '@/lib/auth/account-activity.server';

export interface LoginResult {
  success: boolean;
  error?: string;
  /** R-10: true when the account must rotate its password before using the panel. */
  mustChangePassword?: boolean;
}

/**
 * R-10: the bootstrap password published in README.md and prisma/seed.ts.
 * Production refuses it at login so a deployment cannot be taken over by
 * anyone who has read the repository; local development still allows it so
 * the forced-change screen can run.
 */
const PUBLISHED_BOOTSTRAP_PASSWORD = '@diPencil1907@';

// ─── Login throttling ─────────────────────────────────────────────────────────
// In-memory, per-process throttle. It stops casual credential stuffing against a
// single account. A multi-instance deployment should move this to Redis.

const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const MAX_LOGIN_ATTEMPTS = 8;
const loginAttempts = new Map<string, { count: number; resetAt: number }>();

function loginKey(identifier: string): string {
  return identifier.trim().toLowerCase();
}

/** Returns true when the caller must wait before trying again. */
function isLoginRateLimited(key: string): boolean {
  const now = Date.now();
  const entry = loginAttempts.get(key);

  if (!entry || entry.resetAt <= now) {
    loginAttempts.set(key, { count: 1, resetAt: now + LOGIN_WINDOW_MS });
    return false;
  }

  entry.count += 1;
  return entry.count > MAX_LOGIN_ATTEMPTS;
}

function clearLoginAttempts(key: string): void {
  loginAttempts.delete(key);
}

export async function loginAction(
  identifier: string, // username OR email
  password: string,
  remember: boolean,
): Promise<LoginResult> {
  if (!identifier?.trim() || !password?.trim()) {
    return { success: false, error: 'Please enter your username/email and password.' };
  }

  const key = loginKey(identifier);
  if (isLoginRateLimited(key)) {
    return {
      success: false,
      error: 'Too many attempts. Please wait a few minutes and try again.',
    };
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

    // R-10: production never accepts the published bootstrap password.
    if (process.env.NODE_ENV === 'production' && password === PUBLISHED_BOOTSTRAP_PASSWORD) {
      console.warn('[loginAction] refused published bootstrap password for user', user.username);
      return {
        success: false,
        error:
          'This password is disabled in production. Set a new password from the server (scripts/fix-password.ts "<new password>").',
      };
    }

    // Update lastLogin
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    await setSessionCookie(
      {
        userId: user.id,
        username: user.username,
        name: user.name,
        email: user.email,
        avatar: user.avatar ?? undefined,
        mustChangePassword: user.mustChangePassword,
      },
      remember,
    );

    clearLoginAttempts(key);

    return { success: true, mustChangePassword: user.mustChangePassword };
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
      // R-10: an explicit password change always satisfies the forced rotation.
      updateData.mustChangePassword = false;
    }

    if (Object.keys(updateData).length === 0) {
      return { success: false, error: 'No changes to save.' };
    }

    const updated = await prisma.user.update({ where: { id: user.id }, data: updateData });

    // Refresh session cookie with new name/email/username (and the rotated flag).
    await setSessionCookie({
      userId: updated.id,
      username: updated.username,
      name: updated.name,
      email: updated.email,
      avatar: updated.avatar ?? undefined,
      mustChangePassword: updated.mustChangePassword,
    });

    return { success: true };
  } catch (err) {
    console.error('[updateAccountAction]', err);
    return { success: false, error: 'Something went wrong. Please try again.' };
  }
}

// ─── R-10: forced password rotation ──────────────────────────────────────────

const forcePasswordSchema = z
  .object({
    newPassword: z
      .string()
      .min(8, 'Use at least 8 characters.')
      .max(128, 'Use at most 128 characters.'),
    confirmPassword: z.string().min(1, 'Confirm the new password.'),
  })
  .refine((value) => value.newPassword === value.confirmPassword, {
    message: 'The passwords do not match.',
    path: ['confirmPassword'],
  });

/**
 * Change the password of a session flagged by `mustChangePassword`.
 *
 * Uses `getSession()` directly (not `requireSession()`) so the forced-change
 * gate cannot redirect the action into a loop. The action refuses to run for a
 * session that is not flagged: an unflagged user must go through
 * `updateAccountAction`, which verifies the current password.
 */
export async function forceChangePasswordAction(input: {
  newPassword: string;
  confirmPassword: string;
}): Promise<UpdateAccountResult> {
  const session = await getSession();
  if (!session) return { success: false, error: 'Not authenticated.' };
  if (!session.mustChangePassword) {
    return { success: false, error: 'Use account settings to change your password.' };
  }

  const parsed = forcePasswordSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid password.' };
  }

  try {
    const user = await prisma.user.findUnique({ where: { id: session.userId } });
    if (!user) return { success: false, error: 'User not found.' };

    // A forced rotation must actually rotate: refuse the current password.
    if (user.password && (await verifyPassword(parsed.data.newPassword, user.password))) {
      return { success: false, error: 'Choose a password different from the current one.' };
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        password: await hashPassword(parsed.data.newPassword),
        mustChangePassword: false,
      },
    });

    // Re-issue the session without the flag so middleware lets the dashboard through.
    await setSessionCookie({
      userId: updated.id,
      username: updated.username,
      name: updated.name,
      email: updated.email,
      avatar: updated.avatar ?? undefined,
      mustChangePassword: false,
    });

    return { success: true };
  } catch (err) {
    console.error('[forceChangePasswordAction]', err);
    return { success: false, error: 'Something went wrong. Please try again.' };
  }
}
