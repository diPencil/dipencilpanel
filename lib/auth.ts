/**
 * Authentication utilities — session via HTTP-only JWT cookie.
 * Ready to upgrade to Auth.js / NextAuth later.
 */

import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';

// ─── constants ────────────────────────────────────────────────────────────────

const COOKIE_NAME = 'dipencil_session';
const SESSION_DURATION = 7 * 24 * 60 * 60; // 7 days in seconds

/** Keep in sync with `middleware.ts` fallback when `AUTH_SECRET` is unset. */
const FALLBACK_AUTH_SECRET = 'dipencil-panel-super-secret-key-2026-change-me';

function getSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET ?? FALLBACK_AUTH_SECRET;
  return new TextEncoder().encode(secret);
}

// ─── types ────────────────────────────────────────────────────────────────────

export interface SessionPayload {
  userId: string;
  username: string;
  name: string;
  email: string;
  avatar?: string;
  isAuthenticated: true;
}

// ─── password helpers (bcryptjs — server-only) ───────────────────────────────

export async function hashPassword(plain: string): Promise<string> {
  const bcrypt = await import('bcryptjs');
  return bcrypt.hash(plain, 12);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  const bcrypt = await import('bcryptjs');
  return bcrypt.compare(plain, hash);
}

// ─── JWT session ──────────────────────────────────────────────────────────────

export async function createSessionToken(payload: Omit<SessionPayload, 'isAuthenticated'>): Promise<string> {
  // Never put avatar (base64) in the JWT — it exceeds cookie size limits (~4KB) and breaks the session.
  const { avatar: _omitAvatar, ...jwtPayload } = payload;
  return new SignJWT({ ...jwtPayload, isAuthenticated: true })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION}s`)
    .sign(getSecret());
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

/** userId from the session JWT only (no DB). Use when `getSession()` is null but the cookie may still be valid (e.g. logout). */
export async function getUserIdFromSessionCookie(): Promise<string | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value;
  if (!token) return null;
  const p = await verifySessionToken(token);
  return p?.userId ?? null;
}

/** When the current JWT was issued (start of this browser session for "session duration"). */
export async function getSessionTokenIssuedAt(): Promise<Date | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret());
    const raw = payload.iat;
    const sec =
      typeof raw === 'number'
        ? raw
        : typeof raw === 'string'
          ? Number(raw)
          : typeof raw === 'bigint'
            ? Number(raw)
            : NaN;
    if (!Number.isFinite(sec)) return null;
    return new Date(sec * 1000);
  } catch {
    return null;
  }
}

// ─── cookie helpers (server-only, use inside Server Actions / Route Handlers) ─

export async function setSessionCookie(payload: Omit<SessionPayload, 'isAuthenticated'>, remember = false): Promise<void> {
  const token = await createSessionToken(payload);
  const jar = await cookies();
  jar.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: remember ? SESSION_DURATION : undefined, // undefined = session cookie
  });
}

export async function clearSessionCookie(): Promise<void> {
  const jar = await cookies();
  jar.delete(COOKIE_NAME);
}

export async function getSession(): Promise<SessionPayload | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value;
  if (!token) return null;
  const jwtPayload = await verifySessionToken(token);
  if (!jwtPayload?.userId) return null;

  try {
    const user = await prisma.user.findUnique({
      where: { id: jwtPayload.userId },
      select: { id: true, username: true, name: true, email: true, avatar: true, status: true },
    });
    if (!user || user.status !== 'active') return null;

    return {
      userId: user.id,
      username: user.username,
      name: user.name,
      email: user.email,
      avatar: user.avatar ?? undefined,
      isAuthenticated: true,
    };
  } catch (err) {
    console.error('[getSession] failed to load user', err);
    return null;
  }
}
