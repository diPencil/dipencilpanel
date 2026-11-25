import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireApiSession, requireSuperAdmin } from '@/lib/auth/api-auth';

const BACKUP_VERSION = 1;
const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

const BACKUP_ORDER = [
  'Company',
  'Role',
  'Client',
  'User',
  'ClientGroup',
  'Subscription',
  'Domain',
  'DomainTransfer',
  'Hosting',
  'VPS',
  'Email',
  'Website',
  'MobileApp',
  'Invoice',
  'InvoiceItem',
  'Payment',
  'ReminderLog',
  'BusinessEmail',
  'WebsiteMigration',
] as const;

type BackupPayload = {
  version: number;
  exportedAt: string;
  tables: Record<string, unknown[]>;
};

function toDelegateName(modelName: string) {
  return modelName.charAt(0).toLowerCase() + modelName.slice(1);
}

function isBackupPayload(value: unknown): value is BackupPayload {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<BackupPayload>;
  return (
    typeof candidate.version === 'number' &&
    typeof candidate.exportedAt === 'string' &&
    !!candidate.tables &&
    typeof candidate.tables === 'object'
  );
}

/** Reject tables and rows that do not look like records from this schema. */
function validateTables(tables: Record<string, unknown[]>): string | null {
  for (const key of Object.keys(tables)) {
    if (!BACKUP_ORDER.includes(key as (typeof BACKUP_ORDER)[number])) {
      return `Unknown table in backup: ${key}`;
    }
    if (!Array.isArray(tables[key])) {
      return `Table ${key} must be an array`;
    }
    for (const row of tables[key]) {
      if (!row || typeof row !== 'object' || Array.isArray(row)) {
        return `Table ${key} contains a non-object row`;
      }
      const id = (row as { id?: unknown }).id;
      if (typeof id !== 'string' || id.length === 0) {
        return `Table ${key} contains a row without a string id`;
      }
    }
  }
  return null;
}

export async function GET() {
  const auth = await requireApiSession();
  if (!auth.ok) return auth.response;

  const admin = await requireSuperAdmin(auth.session);
  if (!admin.ok) return admin.response;

  try {
    const tables: Record<string, unknown[]> = {};

    for (const modelName of BACKUP_ORDER) {
      const delegate = (prisma as Record<string, any>)[toDelegateName(modelName)];
      tables[modelName] = await delegate.findMany();
    }

    const payload: BackupPayload = {
      version: BACKUP_VERSION,
      exportedAt: new Date().toISOString(),
      tables,
    };

    return new NextResponse(JSON.stringify(payload, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="database-backup-${new Date().toISOString().split('T')[0]}.json"`,
      },
    });
  } catch (error) {
    console.error('Database export error:', error);
    return NextResponse.json({ error: 'Failed to export database' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requireApiSession();
  if (!auth.ok) return auth.response;

  const admin = await requireSuperAdmin(auth.session);
  if (!admin.ok) return admin.response;

  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    if (file.size === 0 || file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json(
        { error: 'Backup file must be between 1 byte and 25 MB' },
        { status: 400 },
      );
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(await file.text());
    } catch {
      return NextResponse.json({ error: 'Backup file is not valid JSON' }, { status: 400 });
    }

    if (!isBackupPayload(parsed)) {
      return NextResponse.json({ error: 'Invalid backup file format' }, { status: 400 });
    }

    const validationError = validateTables(parsed.tables);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const importedCounts: Record<string, number> = {};

    await prisma.$transaction(async (tx) => {
      for (const modelName of BACKUP_ORDER) {
        const rows = parsed.tables[modelName];
        if (!Array.isArray(rows) || rows.length === 0) {
          continue;
        }

        const delegate = (tx as Record<string, any>)[toDelegateName(modelName)];
        await delegate.createMany({
          data: rows,
          skipDuplicates: true,
        });
        importedCounts[modelName] = rows.length;
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Database merged successfully. All new data has been added.',
      importedCounts,
    });
  } catch (error) {
    // Do not leak driver or SQL details to the caller.
    console.error('Database merge error:', error);
    return NextResponse.json(
      { error: 'Failed to merge the backup file.' },
      { status: 500 },
    );
  }
}
