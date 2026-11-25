import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import {
  encryptPassword,
  checkPortOpen,
  getMigrationPort,
  appendLog,
  assertPublicHost,
} from '@/lib/migration/migration-utils.server';
import { requireApiSession, requireCompanyAccess } from '@/lib/auth/api-auth';
import { createMigrationSchema, listMigrationsSchema } from '@/lib/migration/migration-schema';

// ─── POST /api/websites/migrate ───────────────────────────────────────────────
// Create a new migration request + run a real TCP connection check.

export async function POST(req: Request) {
  const auth = await requireApiSession();
  if (!auth.ok) return auth.response;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = createMigrationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid migration request', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { sourceIp, username, password, type, companyId, port: customPort } = parsed.data;

  const access = await requireCompanyAccess(auth.session, companyId);
  if (!access.ok) return access.response;

  try {
    // SSRF guard: resolve the host and reject loopback/private/metadata ranges.
    try {
      await assertPublicHost(sourceIp);
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'Invalid source host' },
        { status: 400 },
      );
    }

    // Determine port: prefer user-supplied override, else derive from migration type
    const port = customPort ?? getMigrationPort(type);

    // ── Real TCP check ──────────────────────────────────────────────────────
    const isReachable = await checkPortOpen(sourceIp, port, 7000);

    // Encrypt password before persisting
    const encryptedPassword = encryptPassword(password);

    // Build initial log chain
    let logs = appendLog('[]', `Migration request created for ${sourceIp}:${port}`, 'info');

    let status: string;
    let errorMessage: string | undefined;

    if (isReachable) {
      status = 'analyzing';
      logs = appendLog(logs, `TCP connection to ${sourceIp}:${port} successful - server is reachable`, 'success');
      logs = appendLog(logs, `Migration type: ${type} - credentials stored securely`, 'info');
      logs = appendLog(logs, 'Awaiting admin review to begin file transfer', 'info');
    } else {
      status = 'failed';
      errorMessage = `Cannot reach ${sourceIp} on port ${port}. Verify the IP, firewall rules, and that the service is running.`;
      logs = appendLog(logs, `TCP connection to ${sourceIp}:${port} timed out - host unreachable or port closed`, 'error');
      logs = appendLog(logs, errorMessage, 'error');
    }

    const migration = await prisma.websiteMigration.create({
      data: {
        sourceIp,
        port,
        username,
        password: encryptedPassword,
        type,
        companyId,
        status,
        logs,
        errorMessage: errorMessage ?? null,
      },
    });

    return NextResponse.json({
      success: isReachable,
      id: migration.id,
      status,
      reachable: isReachable,
      port,
      message: isReachable
        ? `Server is reachable on port ${port}. Migration is under analysis.`
        : errorMessage,
    });

  } catch (error) {
    console.error('[Migration API] POST error:', error);
    return NextResponse.json({ error: 'Failed to start migration' }, { status: 500 });
  }
}

// ─── GET /api/websites/migrate ────────────────────────────────────────────────
// List migration history for a company (password is never returned).

export async function GET(req: Request) {
  const auth = await requireApiSession();
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(req.url);
  const parsed = listMigrationsSchema.safeParse({
    companyId: searchParams.get('companyId') ?? '',
  });
  if (!parsed.success) {
    return NextResponse.json({ error: 'Missing or invalid companyId' }, { status: 400 });
  }

  const access = await requireCompanyAccess(auth.session, parsed.data.companyId);
  if (!access.ok) return access.response;

  try {
    const migrations = await prisma.websiteMigration.findMany({
      where: { companyId: access.companyId },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        id: true,
        sourceIp: true,
        port: true,
        username: true,
        type: true,
        status: true,
        logs: true,
        dataSize: true,
        notes: true,
        errorMessage: true,
        createdAt: true,
        updatedAt: true,
        // password intentionally excluded from response
      },
    });

    return NextResponse.json(migrations);
  } catch (error) {
    console.error('[Migration API] GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch migrations' }, { status: 500 });
  }
}
