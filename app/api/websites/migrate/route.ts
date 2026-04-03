import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  encryptPassword,
  checkPortOpen,
  getMigrationPort,
  appendLog,
} from '@/lib/migration-utils.server';

// ─── POST /api/websites/migrate ───────────────────────────────────────────────
// Create a new migration request + run a real TCP connection check.

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { sourceIp, username, password, type, companyId, port: customPort } = body;

    if (!sourceIp || !username || !password || !type || !companyId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Basic IP / hostname sanity check — prevent SSRF against localhost
    const lowerIp = sourceIp.trim().toLowerCase();
    if (
      lowerIp === 'localhost' ||
      lowerIp.startsWith('127.') ||
      lowerIp.startsWith('0.') ||
      lowerIp === '::1'
    ) {
      return NextResponse.json({ error: 'Invalid source IP address' }, { status: 400 });
    }

    // Determine port: prefer user-supplied override, else derive from migration type
    const port: number =
      customPort && Number.isInteger(Number(customPort))
        ? Number(customPort)
        : getMigrationPort(type);

    // ── Real TCP check ──────────────────────────────────────────────────────
    const isReachable = await checkPortOpen(sourceIp.trim(), port, 7000);

    // Encrypt password before persisting
    const encryptedPassword = encryptPassword(password);

    // Build initial log chain
    let logs = appendLog('[]', `Migration request created for ${sourceIp}:${port}`, 'info');

    let status: string;
    let errorMessage: string | undefined;

    if (isReachable) {
      status = 'analyzing';
      logs = appendLog(logs, `TCP connection to ${sourceIp}:${port} successful — server is reachable`, 'success');
      logs = appendLog(logs, `Migration type: ${type} — credentials stored securely`, 'info');
      logs = appendLog(logs, 'Awaiting admin review to begin file transfer', 'info');
    } else {
      status = 'failed';
      errorMessage = `Cannot reach ${sourceIp} on port ${port}. Verify the IP, firewall rules, and that the service is running.`;
      logs = appendLog(logs, `TCP connection to ${sourceIp}:${port} timed out — host unreachable or port closed`, 'error');
      logs = appendLog(logs, errorMessage, 'error');
    }

    const migration = await prisma.websiteMigration.create({
      data: {
        sourceIp: sourceIp.trim(),
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
  try {
    const { searchParams } = new URL(req.url);
    const companyId = searchParams.get('companyId');

    if (!companyId) {
      return NextResponse.json({ error: 'Missing companyId' }, { status: 400 });
    }

    const migrations = await prisma.websiteMigration.findMany({
      where: { companyId },
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
