/**
 * Server-side authentication guard for Server Actions and Route Handlers.
 *
 * Middleware is a convenience gate, not a security boundary: every Server
 * Action is a public HTTP endpoint. Call `requireSession()` before touching
 * tenant data so an unauthenticated request can never reach Prisma.
 *
 * `redirect()` throws a control-flow error that Next.js turns into a client
 * navigation, so callers stay type-safe and unauthenticated users land on the
 * login page instead of seeing a 500.
 */

import { cache } from 'react';
import { redirect } from 'next/navigation';
import { getSession, type SessionPayload } from './auth';
import { prisma } from '@/lib/db/prisma';
import { hasPermission } from './api-auth';

/**
 * Resolve the current session or redirect to `/login`.
 * Cached per request, so repeated calls in one render cost one database lookup.
 */
export const requireSession = cache(async (): Promise<SessionPayload> => {
  const session = await getSession();
  if (!session) {
    redirect('/login');
  }
  return session;
});

/**
 * Tenant boundary for Server Actions (CONSTITUTION.md, Articles I.2 and II.7).
 *
 * A Server Action is a public HTTP endpoint: the `companyId` argument it
 * receives is client-supplied and must never be trusted. Resolve the caller's
 * real company from the database and deny the call unless:
 *
 * - the caller is a super admin (role permission `*`), who may operate on any
 *   existing company (operator console with a company switcher), or
 * - the caller belongs to the requested company.
 *
 * Anything else is kicked to the dashboard. Cached per request so repeated
 * calls in one render cost one database lookup.
 */
export const requireTenantAccess = cache(async (companyId: string): Promise<SessionPayload> => {
  const session = await requireSession();
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { companyId: true, role: { select: { permissions: true } } },
  });
  const isSuperAdmin = user ? hasPermission(user.role.permissions, '*', 'view') : false;
  if (!user || (!isSuperAdmin && user.companyId !== companyId)) {
    redirect('/dashboard');
  }
  return session;
});

/**
 * Super-admin-only boundary for Server Actions (company and tenant management).
 * Non-super-admins are redirected to the dashboard (deny by default).
 */
export const requireSuperAdminSession = cache(async (): Promise<SessionPayload> => {
  const session = await requireSession();
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { role: { select: { permissions: true } } },
  });
  if (!user || !hasPermission(user.role.permissions, '*', 'view')) {
    redirect('/dashboard');
  }
  return session;
});

/**
 * Resolve the signed-in user's own company id (never trust the client).
 * Used by session-scoped features such as search and notifications that have
 * no company argument: they are always scoped to the caller's own company.
 */
export const getSessionTenant = cache(async (): Promise<{ session: SessionPayload; companyId: string } | null> => {
  const session = await getSession();
  if (!session) return null;
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { companyId: true },
  });
  if (!user) return null;
  return { session, companyId: user.companyId };
});
