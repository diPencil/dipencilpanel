import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { appendLog } from '@/lib/migration-utils.server';
import { getAllowedTransitions } from '@/lib/migration-utils';
import type { MigrationStatus } from '@/lib/migration-utils';

type RouteParams = { params: Promise<{ id: string }> };

// ─── GET /api/websites/migrate/[id] ──────────────────────────────────────────
// Fetch a single migration record (no password returned).

export async function GET(_req: Request, { params }: RouteParams) {
  const { id } = await params;

  const migration = await prisma.websiteMigration.findUnique({
    where: { id },
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
    },
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

  try {
    const body = await req.json();
    const { status: newStatus, note } = body as { status?: string; note?: string };

    const migration = await prisma.websiteMigration.findUnique({ where: { id } });
    if (!migration) {
      return NextResponse.json({ error: 'Migration not found' }, { status: 404 });
    }

    const allowed = getAllowedTransitions(migration.status as MigrationStatus);

    if (newStatus && !allowed.includes(newStatus as MigrationStatus)) {
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
      where: { id },
      data: {
        ...(newStatus ? { status: newStatus } : {}),
        logs,
        ...(newStatus === 'failed' && note ? { errorMessage: note } : {}),
      },
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
      },
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

  try {
    await prisma.websiteMigration.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Migration API] DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete migration' }, { status: 500 });
  }
}
