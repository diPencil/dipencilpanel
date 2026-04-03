import { NextResponse } from 'next/server';
import path from 'node:path';
import fs from 'node:fs/promises';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const dbPath = path.join(process.cwd(), 'dev.db');
    
    try {
      await fs.access(dbPath);
    } catch {
      return NextResponse.json({ error: 'Database file not found' }, { status: 404 });
    }

    const dbBuffer = await fs.readFile(dbPath);

    return new NextResponse(dbBuffer, {
      headers: {
        'Content-Type': 'application/x-sqlite3',
        'Content-Disposition': `attachment; filename="database-${new Date().toISOString().split('T')[0]}.db"`,
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

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const dbPath = path.join(process.cwd(), 'dev.db');
    const backupPath = path.join(process.cwd(), `dev-backup-${Date.now()}.db`);
    const tempPath = path.join(process.cwd(), `temp-import-${Date.now()}.db`);

    // 1. Create backup of current DB
    try {
      await fs.copyFile(dbPath, backupPath);
    } catch (e) {
      console.warn('Backup failed:', e);
    }

    // 2. Write uploaded file to temp location
    await fs.writeFile(tempPath, buffer);

    // Normalize path for SQLite (especially on Windows)
    const sqlTempPath = tempPath.replace(/\\/g, '/');

    // 3. Define tables to merge (Ordered for Foreign Key safety)
    const tables = [
      'Company', 'Role', 'User', 'Client', 'ClientGroup', 'Subscription',
      'Domain', 'Hosting', 'VPS', 'Email', 'Website', 'MobileApp', 'DomainTransfer',
      'Invoice', 'InvoiceItem', 'Payment', 'ReminderLog', 'BusinessEmail', 'WebsiteMigration'
    ];

    try {
      // 4. Attach and Merge
      // We do this outside a transaction first if needed, but Prisma executeRaw should handle it.
      // We'll use a sequence of raw queries.
      
      await prisma.$executeRawUnsafe(`ATTACH DATABASE '${sqlTempPath}' AS source_db`);

      try {
        for (const table of tables) {
          try {
            // Use INSERT OR IGNORE to merge data
            await prisma.$executeRawUnsafe(`INSERT OR IGNORE INTO main."${table}" SELECT * FROM source_db."${table}"`);
          } catch (tableError) {
            console.warn(`Could not merge table ${table}:`, tableError);
            // Continue with other tables
          }
        }
      } finally {
        await prisma.$executeRawUnsafe(`DETACH DATABASE source_db`);
      }

      return NextResponse.json({ 
        success: true, 
        message: 'Database merged successfully! All new data has been added.' 
      });

    } catch (dbError: any) {
      console.error('Database connection/merge error:', dbError);
      return NextResponse.json({ 
        error: `Failed to merge: ${dbError.message || 'Unknown database error'}` 
      }, { status: 500 });
    } finally {
      // Cleanup temp file regardless of outcome
      try {
        await fs.unlink(tempPath);
      } catch (e) {
        // Ignore cleanup errors
      }
    }
  } catch (error) {
    console.error('Database merge process error:', error);
    return NextResponse.json({ error: 'Failed to process database file.' }, { status: 500 });
  }
}
