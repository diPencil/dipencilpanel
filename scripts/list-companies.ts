import 'dotenv/config';
import { prisma } from '../lib/db/prisma';

async function main() {
  const rows = await prisma.company.findMany({
    select: { id: true, name: true, users: { select: { username: true } } },
  });
  console.log(JSON.stringify(rows, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
