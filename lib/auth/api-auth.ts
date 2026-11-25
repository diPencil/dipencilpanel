/**
 * Shared authentication and authorisation helpers for Route Handlers.
 *
 * Middleware skips `/api/*` entirely, so every Route Handler must verify the
 * session itself (CONSTITUTION.md, Article II.2).
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getSession, type SessionPayload } from './auth';

export type ApiSessionResult =
  | { ok: true; session: SessionPayload }
  | { ok: false; response: NextResponse };

/** Resolve the session or return a 401 response. */
export async function requireApiSession(): Promise<ApiSessionResult> {
  const session = await getSession();
  if (!session) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    };
  }
  return { ok: true, session };
}

type PermissionMap = Record<string, Record<string, boolean> | undefined>;

/**
 * Roles store permissions as JSON. The seed uses `["*"]`; the roles UI stores
 * an object of `{ module: { view, create, edit, delete } }`. Accept both shapes.
 */
export function hasPermission(
  rawPermissions: string | null | undefined,
  module: string,
  action: 'view' | 'create' | 'edit' | 'delete',
): boolean {
  if (!rawPermissions) return false;

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawPermissions);
  } catch {
    return false;
  }

  if (Array.isArray(parsed)) {
    return parsed.includes('*') || parsed.includes(`${module}.${action}`);
  }

  if (parsed && typeof parsed === 'object') {
    const map = parsed as PermissionMap;
    return map[module]?.[action] === true || map['*']?.view === true;
  }

  return false;
}

export type CompanyAccessResult =
  | { ok: true; companyId: string; isSuperAdmin: boolean }
  | { ok: false; response: NextResponse };

/**
 * Verify that the signed-in user may act on `companyId`.
 *
 * Super admins (role permission `*`) may operate on any existing company,
 * because the panel is an operator console with a company switcher. Every
 * other user is limited to their own company.
 */
export async function requireCompanyAccess(
  session: SessionPayload,
  companyId: string,
): Promise<CompanyAccessResult> {
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      companyId: true,
      role: { select: { permissions: true } },
    },
  });

  if (!user) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    };
  }

  const isSuperAdmin = hasPermission(user.role.permissions, '*', 'view');

  if (!isSuperAdmin && user.companyId !== companyId) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
    };
  }

  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { id: true },
  });

  if (!company) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Company not found' }, { status: 404 }),
    };
  }

  return { ok: true, companyId: company.id, isSuperAdmin };
}

/** True only for super admins (role permission `*`). */
export async function requireSuperAdmin(
  session: SessionPayload,
): Promise<{ ok: true } | { ok: false; response: NextResponse }> {
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { role: { select: { permissions: true } } },
  });

  if (!user || !hasPermission(user.role.permissions, '*', 'view')) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
    };
  }

  return { ok: true };
}
