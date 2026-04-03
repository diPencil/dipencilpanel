import 'server-only';

import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { prisma } from '@/lib/prisma';
import type { AccountActivityData } from '@/lib/account-activity-types';

const COOKIE_NAME = 'dipencil_session';

/** Same default as `middleware.ts` and `lib/auth.ts` when AUTH_SECRET is missing. */
const FALLBACK_AUTH_SECRET = 'dipencil-panel-super-secret-key-2026-change-me';

function jwtSecretKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET ?? FALLBACK_AUTH_SECRET;
  return new TextEncoder().encode(secret);
}

function toIsoUtc(value: unknown): string | null {
  if (value == null) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString();
  }
  if (typeof value === 'string' || typeof value === 'number') {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  }
  if (typeof value === 'bigint') {
    const d = new Date(Number(value));
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  }
  return null;
}

function isPrismaClientValidationError(e: unknown): boolean {
  return (
    typeof e === 'object' &&
    e !== null &&
    (e as { name?: string }).name === 'PrismaClientValidationError'
  );
}

type UserActivitySelect = {
  lastLogin: Date | null;
  lastLogoutAt: Date | null;
  createdAt: Date;
  status: string;
};

async function loadUserActivityRow(uid: string): Promise<UserActivitySelect | null> {
  try {
    return await prisma.user.findUnique({
      where: { id: uid },
      select: { lastLogin: true, lastLogoutAt: true, createdAt: true, status: true },
    });
  } catch (first) {
    if (!isPrismaClientValidationError(first)) throw first;
    const user = await prisma.user.findUnique({
      where: { id: uid },
      select: { lastLogin: true, createdAt: true, status: true },
    });
    if (!user) return null;
    let lastLogoutAt: Date | null = null;
    try {
      const row = await prisma.user.findUnique({
        where: { id: uid },
        select: { lastLogoutAt: true },
      });
      lastLogoutAt = row?.lastLogoutAt ?? null;
    } catch {
      /* ignore: older client / DB without column */
    }
    return { ...user, lastLogoutAt };
  }
}

/**
 * Load session activity on the server (RSC / Route Handler). Prefer this over a client-invoked
 * server action so `cookies()` always matches the document request.
 */
export async function fetchAccountActivity(): Promise<AccountActivityData | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value;
  if (!token) return null;

  let payload: Record<string, unknown>;
  try {
    const { payload: p } = await jwtVerify(token, jwtSecretKey());
    payload = p as Record<string, unknown>;
  } catch {
    return null;
  }

  const uidRaw = payload.userId ?? payload.sub;
  const uid =
    uidRaw != null && uidRaw !== ''
      ? String(uidRaw).trim()
      : '';
  if (!uid) return null;

  const rawIat = payload.iat;
  const sec =
    typeof rawIat === 'number'
      ? rawIat
      : typeof rawIat === 'string'
        ? Number(rawIat)
        : typeof rawIat === 'bigint'
          ? Number(rawIat)
          : NaN;
  const sessionStartedAt = Number.isFinite(sec) ? new Date(sec * 1000).toISOString() : null;

  let lastLogin: string | null = null;
  let lastLogoutAt: string | null = null;
  try {
    const user = await loadUserActivityRow(uid);
    if (user?.status === 'active') {
      lastLogin = toIsoUtc(user.lastLogin) ?? toIsoUtc(user.createdAt);
      lastLogoutAt = toIsoUtc(user.lastLogoutAt);
    }
  } catch (err) {
    console.error('[fetchAccountActivity] prisma', err);
  }

  return { lastLogin, lastLogoutAt, sessionStartedAt };
}
