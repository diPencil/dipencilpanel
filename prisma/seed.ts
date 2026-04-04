/**
 * Prisma seed — creates the default admin user if it doesn't exist.
 * Run: npx tsx prisma/seed.ts   (or: npx prisma db seed)
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

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
    console.log('ℹ️  Default user already exists — skipping.');
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
      companyId: company.id,
      roleId: role.id,
    },
  });

  console.log('✅ Default admin user created:');
  console.log('   Username :', user.username);
  console.log('   Name     :', user.name);
  console.log('   Email    :', user.email);
  console.log('   Password : @diPencil1907@');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
