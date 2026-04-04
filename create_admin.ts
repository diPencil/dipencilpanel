import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function createAdmin() {
  const company = await prisma.company.findFirst();
  if (!company) {
    console.error('No company found to link the user to!');
    return;
  }

  // Check if any role exists
  let role = await prisma.role.findFirst({ where: { name: 'Admin' } });
  if (!role) {
     role = await prisma.role.create({
        data: {
           name: 'Admin',
           companyId: company.id,
           permissions: JSON.stringify({ all: true })
        }
     });
  }

  const hashedPassword = await bcrypt.hash('@Elsabbagh1907@', 10);
  
  const newUser = await prisma.user.create({
    data: {
      username: 'dipencil',
      name: 'Admin',
      email: 'admin@dipencil.com',
      password: hashedPassword,
      companyId: company.id,
      roleId: role.id,
      status: 'active'
    }
  });

  console.log('--- SUCCESS: Created Admin User ---');
  console.log('Username: dipencil');
  console.log('Password: (the one you usually use)');
}

createAdmin().catch(console.error).finally(() => prisma.$disconnect());
