'use server';

import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export interface SearchResult {
  id: string;
  type: 'page' | 'client' | 'website' | 'domain' | 'user' | 'hosting' | 'vps' | 'email' | 'invoice' | 'subscription' | 'company' | 'app';
  title: string;
  subtitle?: string;
  url: string;
}

const PAGES = [
  { title: 'Dashboard Overview', url: '/dashboard' },
  { title: 'All Websites', url: '/dashboard/websites' },
  { title: 'Add New Website', url: '/dashboard/websites/new' },
  { title: 'Website Migrations', url: '/dashboard/websites/migrate' },
  { title: 'Mobile Applications', url: '/dashboard/mobile-apps' },
  { title: 'Domain Portfolio', url: '/dashboard/domains' },
  { title: 'DNS / Nameservers', url: '/dashboard/domains/dns' },
  { title: 'Hosting Services', url: '/dashboard/hosting' },
  { title: 'Email Services', url: '/dashboard/emails' },
  { title: 'VPS Servers', url: '/dashboard/vps' },
  { title: 'All Clients', url: '/dashboard/clients' },
  { title: 'Subscriptions List', url: '/dashboard/billing/subscriptions' },
  { title: 'Invoices & Billing', url: '/dashboard/billing/invoices' },
  { title: 'Financial Summary', url: '/dashboard/billing/financial-summary' },
  { title: 'System Users (User Management)', url: '/dashboard/management/users' },
  { title: 'Companies List (Tenants)', url: '/dashboard/management/companies' },
  { title: 'Roles & Permissions', url: '/dashboard/management/roles' },
  { title: 'System Settings (General)', url: '/dashboard/settings' },
  { title: 'Notification Log (History)', url: '/dashboard/settings/notifications' },
  { title: 'Account Preferences (Profile)', url: '/dashboard/settings/account' },
];

export async function globalSearch(query: string): Promise<SearchResult[]> {
  if (!query || query.length < 2) return [];

  const session = await getSession();
  if (!session) return [];

  const results: SearchResult[] = [];
  const q = query.toLowerCase();

  // 1. Pages
  PAGES.filter(p => p.title.toLowerCase().includes(q))
    .forEach(p => results.push({ id: `page-${p.url}`, type: 'page', title: p.title, url: p.url }));

  try {
    const filters = { contains: query };

    // 2. Clients
    const clients = await prisma.client.findMany({ where: { name: filters }, take: 5 });
    clients.forEach(c => results.push({ id: `cl-${c.id}`, type: 'client', title: c.name, subtitle: c.email || '', url: `/dashboard/clients?id=${c.id}` }));

    // 3. Websites
    const websites = await prisma.website.findMany({ where: { name: filters }, take: 5 });
    websites.forEach(w => results.push({ id: `web-${w.id}`, type: 'website', title: w.name, subtitle: w.domain, url: `/dashboard/websites` }));

    // 4. Domains
    const domains = await prisma.domain.findMany({ where: { name: filters }, take: 5 });
    domains.forEach(d => results.push({ id: `dom-${d.id}`, type: 'domain', title: d.name, subtitle: `Expires: ${d.expiryDate.toLocaleDateString()}`, url: `/dashboard/domains` }));

    // 5. Invoices
    const invoices = await prisma.invoice.findMany({ where: { number: filters }, take: 5 });
    invoices.forEach(i => results.push({ id: `inv-${i.id}`, type: 'invoice', title: `Invoice #${i.number}`, subtitle: `${i.total} ${i.currency} - ${i.status}`, url: `/dashboard/billing/invoices` }));

    // 6. VPS
    const vps = await prisma.vPS.findMany({ where: { name: filters }, take: 5 });
    vps.forEach((v: any) => results.push({ id: `vps-${v.id}`, type: 'vps', title: v.name, subtitle: `${v.planName} - ${v.status}`, url: `/dashboard/vps` }));

    // 7. Emails
    const emails = await prisma.email.findMany({ where: { name: filters }, take: 5 });
    emails.forEach((e: any) => results.push({ id: `eml-${e.id}`, type: 'email', title: `${e.name}@${e.domain}`, subtitle: e.status, url: `/dashboard/emails` }));

    // 8. Mobile Apps
    const apps = await prisma.mobileApp.findMany({ where: { name: filters }, take: 5 });
    apps.forEach((a: any) => results.push({ id: `app-${a.id}`, type: 'app', title: a.name, subtitle: `${a.appType} - ${a.framework}`, url: `/dashboard/mobile-apps` }));

    // 9. Users
    const users = await prisma.user.findMany({ 
      where: { OR: [{ name: filters }, { username: filters }] }, 
      take: 5 
    });
    users.forEach((u: any) => results.push({ id: `user-${u.id}`, type: 'user', title: u.name, subtitle: `@${u.username}`, url: `/dashboard/management/users` }));

    // 10. Subscriptions
    const subs = await prisma.subscription.findMany({ where: { serviceName: filters }, take: 5 });
    subs.forEach((s: any) => results.push({ id: `sub-${s.id}`, type: 'subscription', title: s.serviceName || 'Shared Service', subtitle: `${s.status} - ${s.price} ${s.currency}`, url: `/dashboard/billing/subscriptions` }));

  } catch (err) {
    console.error('[globalSearch Error]', err);
  }

  return results;
}
