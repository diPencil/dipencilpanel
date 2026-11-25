/**
 * One-off evidence helper: creates a non-admin test user in a second company
 * and mints session cookies for both users so the API authorisation matrix can
 * be exercised with curl. Never run this against production.
 *
 * Run: npx tsx scripts/mint-test-sessions.ts
 */

import 'dotenv/config';
import { SignJWT } from 'jose';
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/db/prisma';

const SECRET = process.env.AUTH_SECRET ?? 'dipencil-panel-super-secret-key-2026-change-me';

async function mint(userId: string, username: string, name: string, email: string) {
  return new SignJWT({ userId, username, name, email, isAuthenticated: true })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(new TextEncoder().encode(SECRET));
}

async function main() {
  const admin = await prisma.user.findUnique({
    where: { username: 'dipencil' },
    select: { id: true, username: true, name: true, email: true },
  });
  if (!admin) throw new Error('default admin user not found');

  let companyB = await prisma.company.findFirst({ where: { name: 'Test Tenant B' } });
  if (!companyB) {
    companyB = await prisma.company.create({ data: { name: 'Test Tenant B', currency: 'USD' } });
    console.log('created company B:', companyB.id);
  }

  let viewerRole = await prisma.role.findFirst({
    where: { companyId: companyB.id, name: 'Viewer' },
  });
  if (!viewerRole) {
    viewerRole = await prisma.role.create({
      data: {
        name: 'Viewer',
        companyId: companyB.id,
        // No wildcard permission: this role must not unlock other tenants.
        permissions: JSON.stringify({ clients: { view: true } }),
      },
    });
  }

  const hashed = await bcrypt.hash('ViewerPass#2026', 12);
  const viewer =
    (await prisma.user.findUnique({ where: { username: 'viewer_test' } })) ??
    (await prisma.user.create({
      data: {
        username: 'viewer_test',
        name: 'Viewer Test',
        email: 'viewer.test@example.test',
        password: hashed,
        status: 'active',
        companyId: companyB.id,
        roleId: viewerRole.id,
      },
    }));

  const adminCookie = await mint(admin.id, admin.username, admin.name, admin.email);
  const viewerCookie = await mint(viewer.id, viewer.username, viewer.name, viewer.email);

  console.log(JSON.stringify({ companyA: admin, companyB: companyB.id, viewer: viewer.id }, null, 2));
  console.log('ADMIN_COOKIE=' + adminCookie);
  console.log('VIEWER_COOKIE=' + viewerCookie);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
