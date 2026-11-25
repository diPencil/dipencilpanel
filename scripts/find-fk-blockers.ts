/**
 * One-off diagnostic: which tables hold FK constraints referencing `Client`,
 * and which of them still hold rows for a given client id (argv[2]).
 * Run: npx tsx scripts/find-fk-blockers.ts <clientId>
 */
import 'dotenv/config';
import { prisma } from '../lib/db/prisma';

async function main() {
  const clientId = process.argv[2];
  const fks = (await prisma.$queryRawUnsafe(
    `SELECT k.TABLE_NAME AS TBL, k.COLUMN_NAME AS COL, r.DELETE_RULE AS RULE
     FROM information_schema.KEY_COLUMN_USAGE k
     JOIN information_schema.REFERENTIAL_CONSTRAINTS r
       ON k.CONSTRAINT_NAME = r.CONSTRAINT_NAME AND k.CONSTRAINT_SCHEMA = r.CONSTRAINT_SCHEMA
     JOIN information_schema.TABLE_CONSTRAINTS t
       ON t.CONSTRAINT_NAME = k.CONSTRAINT_NAME AND t.CONSTRAINT_SCHEMA = k.CONSTRAINT_SCHEMA
     WHERE k.TABLE_SCHEMA = 'dipencil_panel'
       AND k.REFERENCED_TABLE_NAME = 'Client'
       AND t.CONSTRAINT_TYPE = 'FOREIGN KEY'`,
  )) as Array<{ TBL: string; COL: string; RULE: string }>;

  for (const fk of fks) {
    const rows = (await prisma.$queryRawUnsafe(
      `SELECT COUNT(*) AS c FROM \`${fk.TBL}\` WHERE \`${fk.COL}\` = ?`,
      clientId,
    )) as Array<{ c: number }>;
    console.log(`${fk.TBL}.${fk.COL} (${fk.RULE}) rows=${rows[0].c}`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
