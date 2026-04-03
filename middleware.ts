import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const COOKIE_NAME = 'dipencil_session';

const PUBLIC_PATHS = ['/login'];

/** Default must match `FALLBACK_AUTH_SECRET` in `lib/auth.ts` and `lib/server/account-activity.ts`. */
function getSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET ?? 'dipencil-panel-super-secret-key-2026-change-me';
  return new TextEncoder().encode(secret);
}

async function isAuthenticated(request: NextRequest): Promise<boolean> {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!token) return false;
  try {
    await jwtVerify(token, getSecret());
    return true;
  } catch {
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths and Next.js internals
  if (
    PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/')) ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  const authed = await isAuthenticated(request);

  // Redirect root → dashboard or login
  if (pathname === '/') {
    return NextResponse.redirect(
      new URL(authed ? '/dashboard' : '/login', request.url),
    );
  }

  // Protect all other routes
  if (!authed) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
