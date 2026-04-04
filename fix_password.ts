import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function updatePassword() {
  const username = 'dipencil';
  const newPasswordRaw = '@diPencil1907@';
  const hashedPassword = await bcrypt.hash(newPasswordRaw, 12);

  const updated = await prisma.user.update({
    where: { username },
    data: { password: hashedPassword }
  });

  console.log(`✅ Password updated for user: ${username}`);
  console.log(`Now try logging in with: ${newPasswordRaw}`);
}

updatePassword().catch(console.error).finally(() => prisma.$disconnect());
