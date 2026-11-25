import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { appendLog } from '@/lib/migration/migration-utils.server';
import { getAllowedTransitions } from '@/lib/migration/migration-utils';
import type { MigrationStatus } from '@/lib/migration/migration-utils';
import { requireApiSession, requireCompanyAccess } from '@/lib/auth/api-auth';
import { updateMigrationSchema } from '@/lib/migration/migration-schema';

type RouteParams = { params: Promise<{ id: string }> };

const SAFE_SELECT = {
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
} as const;

/** Resolve the record's company, then verify the caller may act on it. */
async function loadAuthorizedMigration(id: string) {
  const auth = await requireApiSession();
  if (!auth.ok) return { ok: false as const, response: auth.response };

  const record = await prisma.websiteMigration.findUnique({
    where: { id },
    select: { id: true, companyId: true },
  });

  if (!record) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: 'Migration not found' }, { status: 404 }),
    };
  }

  const access = await requireCompanyAccess(auth.session, record.companyId);
  if (!access.ok) return { ok: false as const, response: access.response };

  return { ok: true as const, companyId: access.companyId };
}

// ─── GET /api/websites/migrate/[id] ──────────────────────────────────────────
// Fetch a single migration record (no password returned).

export async function GET(_req: Request, { params }: RouteParams) {
  const { id } = await params;
  const authorized = await loadAuthorizedMigration(id);
  if (!authorized.ok) return authorized.response;

  const migration = await prisma.websiteMigration.findFirst({
    where: { id, companyId: authorized.companyId },
    select: SAFE_SELECT,
  });

  if (!migration) {
    return NextResponse.json({ error: 'Migration not found' }, { status: 404 });
  }

  return NextResponse.json(migration);
}

// ─── PATCH /api/websites/migrate/[id] ────────────────────────────────────────
// Admin updates migration status (with optional admin note).

export async function PATCH(req: Request, { params }: RouteParams) {
  const { id } = await params;
  const authorized = await loadAuthorizedMigration(id);
  if (!authorized.ok) return authorized.response;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = updateMigrationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid update', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { status: newStatus, note } = parsed.data;

  try {
    const migration = await prisma.websiteMigration.findFirst({
      where: { id, companyId: authorized.companyId },
    });
    if (!migration) {
      return NextResponse.json({ error: 'Migration not found' }, { status: 404 });
    }

    const allowed = getAllowedTransitions(migration.status as MigrationStatus);

    if (newStatus && !allowed.includes(newStatus)) {
      return NextResponse.json(
        { error: `Cannot transition from "${migration.status}" to "${newStatus}"` },
        { status: 400 },
      );
    }

    // Build updated logs
    let logs = migration.logs;
    if (newStatus && newStatus !== migration.status) {
      const level =
        newStatus === 'completed' ? 'success' :
        newStatus === 'failed' || newStatus === 'cancelled' ? 'error' : 'info';
      logs = appendLog(logs, `Status changed to "${newStatus}" by admin`, level);
    }
    if (note) {
      logs = appendLog(logs, `Admin note: ${note}`, 'info');
    }

    const updated = await prisma.websiteMigration.update({
      where: { id, companyId: authorized.companyId },
      data: {
        ...(newStatus ? { status: newStatus } : {}),
        logs,
        ...(newStatus === 'failed' && note ? { errorMessage: note } : {}),
      },
      select: SAFE_SELECT,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('[Migration API] PATCH error:', error);
    return NextResponse.json({ error: 'Failed to update migration' }, { status: 500 });
  }
}

// ─── DELETE /api/websites/migrate/[id] ───────────────────────────────────────
// Remove a migration record permanently.

export async function DELETE(_req: Request, { params }: RouteParams) {
  const { id } = await params;
  const authorized = await loadAuthorizedMigration(id);
  if (!authorized.ok) return authorized.response;

  try {
    const result = await prisma.websiteMigration.deleteMany({
      where: { id, companyId: authorized.companyId },
    });

    if (result.count === 0) {
      return NextResponse.json({ error: 'Migration not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Migration API] DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete migration' }, { status: 500 });
  }
}
