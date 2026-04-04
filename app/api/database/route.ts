import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const BACKUP_VERSION = 1;
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

export async function GET() {
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
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as unknown;

      if (!isBackupPayload(parsed)) {
        return NextResponse.json({ error: 'Invalid backup file format' }, { status: 400 });
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
        message: 'Database merged successfully! All new data has been added.',
        importedCounts,
      });

    } catch (dbError: any) {
      console.error('Database connection/merge error:', dbError);
      return NextResponse.json({ 
        error: `Failed to merge: ${dbError.message || 'Unknown database error'}` 
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Database merge process error:', error);
    return NextResponse.json({ error: 'Failed to process database file.' }, { status: 500 });
  }
}
