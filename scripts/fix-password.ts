/**
 * Reset the default admin password.
 *
 * Usage:
 *   npx tsx scripts/fix-password.ts "NewStrongPassword!"   # operator-chosen, clears the flag
 *   npx tsx scripts/fix-password.ts                        # local recovery: published default + flag
 *
 * The no-argument form restores the bootstrap password documented in README.md,
 * so it re-enables the R-10 forced rotation. The argument form is the production
 * bootstrap path: production refuses the published password at login, so the
 * operator sets a real one here first.
 */

import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/db/prisma';

const PUBLISHED_BOOTSTRAP_PASSWORD = '@diPencil1907@';

async function updatePassword() {
  const username = 'dipencil';
  const requested = process.argv[2]?.trim();

  if (requested && requested.length < 8) {
    console.error('Password must be at least 8 characters.');
    process.exitCode = 1;
    return;
  }

  const password = requested ?? PUBLISHED_BOOTSTRAP_PASSWORD;
  const hashedPassword = await bcrypt.hash(password, 12);

  const updated = await prisma.user.update({
    where: { username },
    data: {
      password: hashedPassword,
      // R-10: the published default must be rotated on next login; an
      // operator-chosen password is already a real rotation.
      mustChangePassword: !requested,
    },
  });

  console.log(`✅ Password updated for user: ${updated.username}`);
  if (requested) {
    console.log('   Forced rotation: disabled (operator-chosen password).');
  } else {
    console.log('   Forced rotation: enabled - the next login must choose a new password.');
    console.log(`   Password: ${PUBLISHED_BOOTSTRAP_PASSWORD} (bootstrap only)`);
  }
}

updatePassword().catch(console.error).finally(() => prisma.$disconnect());
