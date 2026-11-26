/**
 * Prisma seed - creates the default admin user if it doesn't exist.
 * Run: npx tsx prisma/seed.ts   (or: npx prisma db seed)
 */

import bcrypt from 'bcryptjs';
import { prisma } from '../lib/db/prisma';

async function main() {
  // Ensure there's at least one company to attach the user to
  let company = await prisma.company.findFirst();
  if (!company) {
    company = await prisma.company.create({
      data: {
        name: 'Hostinger International Ltd.',
        email: 'noreply@dipencil.com',
        currency: 'USD',
      },
    });
    console.log('✅ Created default company:', company.name);
  }

  // Ensure there's a default role
  let role = await prisma.role.findFirst({ where: { companyId: company.id } });
  if (!role) {
    role = await prisma.role.create({
      data: {
        name: 'Admin',
        companyId: company.id,
        permissions: JSON.stringify(['*']),
      },
    });
    console.log('✅ Created default role: Admin');
  }

  // Create default admin user
  const existing = await prisma.user.findUnique({ where: { username: 'dipencil' } });
  if (existing) {
    // R-10: flag the account only while it still uses the published bootstrap
    // password. An account that already rotated its password is left alone.
    const stillDefault =
      !!existing.password && (await bcrypt.compare('@diPencil1907@', existing.password));
    if (stillDefault && !existing.mustChangePassword) {
      await prisma.user.update({
        where: { id: existing.id },
        data: { mustChangePassword: true },
      });
      console.log('⚠️  Default password still active - forced rotation enabled for "dipencil".');
    } else if (stillDefault) {
      console.log('⚠️  Default password still active and already flagged for rotation.');
    } else {
      console.log('ℹ️  Default user already exists with a rotated password - skipping.');
    }
    return;
  }

  const hashedPassword = await bcrypt.hash('@diPencil1907@', 12);

  const user = await prisma.user.create({
    data: {
      username: 'dipencil',
      name: 'diPencil Panel',
      email: 'noreply@dipencil.com',
      password: hashedPassword,
      status: 'active',
      // R-10: the bootstrap password is published in the repository, so the
      // first sign-in must rotate it before the panel unlocks.
      mustChangePassword: true,
      companyId: company.id,
      roleId: role.id,
    },
  });

  console.log('✅ Default admin user created:');
  console.log('   Username :', user.username);
  console.log('   Name     :', user.name);
  console.log('   Email    :', user.email);
  console.log('   Password : @diPencil1907@  (bootstrap only - a new password is required on first login)');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
