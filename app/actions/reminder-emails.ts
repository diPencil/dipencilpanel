'use server';

import { prisma } from '@/lib/prisma';
import nodemailer from 'nodemailer';
import { buildReminderEmailHtml } from '@/lib/reminder-email-build';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ServiceType = 'domain' | 'hosting' | 'vps' | 'email' | 'website' | 'mobile_app';

export interface ReminderItem {
  /** "sub_<id>" for subscription-based, else raw service id */
  serviceId: string;
  serviceType: ServiceType;
  serviceName: string;
  clientId: string;
  clientName: string;
  clientEmail: string;
  expiryDate: string;
  daysLeft: number;
  price: number;
  currency: string;
  /** Subscription id if linked, null if raw service */
  subscriptionId: string | null;
  lastSentAt: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function daysFromNow(date: string | Date | null | undefined): number {
  if (!date) return 9999;
  const d = new Date(date);
  if (isNaN(d.getTime())) return 9999;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

// ─── Get all reminder items ────────────────────────────────────────────────────
// Primary source: Subscription table (covers all service types when a subscription exists)
// Fallback: raw service tables for services with no linked subscription

export async function getReminderItems(
  companyId: string,
): Promise<{ success: true; data: ReminderItem[] } | { success: false; error: string }> {
  try {
    const [subscriptions, domains, hosting, vps, emails, websites, mobileApps, clients, reminderLogs, company] =
      await Promise.all([
        prisma.subscription.findMany({ where: { companyId }, orderBy: { endDate: 'asc' } }),
        prisma.domain.findMany({ where: { companyId } }),
        prisma.hosting.findMany({ where: { companyId } }),
        prisma.vPS.findMany({ where: { companyId } }),
        prisma.email.findMany({ where: { companyId } }),
        prisma.website.findMany({ where: { companyId } }),
        prisma.mobileApp.findMany({ where: { companyId } }),
        prisma.client.findMany({ where: { companyId } }),
        prisma.reminderLog.findMany({ where: { companyId }, orderBy: { sentAt: 'desc' } }),
        prisma.company.findUnique({ where: { id: companyId } }),
      ]);

    const clientMap = new Map(clients.map((c) => [c.id, c]));
    const defaultCurrency = company?.currency ?? 'USD';

    // Build last-sent map: serviceId → last sentAt
    const lastSentMap = new Map<string, string>();
    for (const log of reminderLogs) {
      if (!lastSentMap.has(log.serviceId)) {
        lastSentMap.set(log.serviceId, log.sentAt.toISOString());
      }
    }

    const items: ReminderItem[] = [];

    // ── 1. Subscriptions (primary — covers all linked service types) ─────────
    const subscribedServiceIds = new Set<string>(); // track to avoid duplicates from raw tables

    for (const sub of subscriptions) {
      const days = daysFromNow(sub.endDate);
      if (days > 60) continue;

      const client = clientMap.get(sub.clientId);
      if (!client?.email) continue;

      // Map subscription serviceId to de-dup
      subscribedServiceIds.add(sub.serviceId);

      const serviceId = `sub_${sub.id}`;
      items.push({
        serviceId,
        serviceType: sub.serviceType as ServiceType,
        serviceName: sub.serviceName ?? sub.planName ?? sub.serviceId,
        clientId: sub.clientId,
        clientName: client.name,
        clientEmail: client.email,
        expiryDate: sub.endDate.toISOString(),
        daysLeft: days,
        price: sub.price,
        currency: sub.currency ?? defaultCurrency,
        subscriptionId: sub.id,
        lastSentAt: lastSentMap.get(serviceId) ?? null,
      });
    }

    // ── 2. Raw service tables (fallback for services with no subscription) ───

    // Domains without subscription
    for (const d of domains) {
      if (subscribedServiceIds.has(d.id)) continue;
      const days = daysFromNow(d.expiryDate);
      if (days > 60) continue;
      const client = clientMap.get(d.clientId);
      if (!client?.email) continue;
      items.push({
        serviceId: d.id,
        serviceType: 'domain',
        serviceName: `${d.name}${d.tld}`,
        clientId: d.clientId,
        clientName: client.name,
        clientEmail: client.email,
        expiryDate: d.expiryDate.toISOString(),
        daysLeft: days,
        price: 0,
        currency: defaultCurrency,
        subscriptionId: null,
        lastSentAt: lastSentMap.get(d.id) ?? null,
      });
    }

    // Hosting without subscription
    for (const h of hosting) {
      if (subscribedServiceIds.has(h.id) || !h.expiryDate) continue;
      const days = daysFromNow(h.expiryDate);
      if (days > 60) continue;
      const client = clientMap.get(h.clientId);
      if (!client?.email) continue;
      items.push({
        serviceId: h.id,
        serviceType: 'hosting',
        serviceName: h.name,
        clientId: h.clientId,
        clientName: client.name,
        clientEmail: client.email,
        expiryDate: h.expiryDate.toISOString(),
        daysLeft: days,
        price: 0,
        currency: defaultCurrency,
        subscriptionId: null,
        lastSentAt: lastSentMap.get(h.id) ?? null,
      });
    }

    // VPS without subscription
    for (const v of vps) {
      if (subscribedServiceIds.has(v.id) || !v.expiryDate) continue;
      const days = daysFromNow(v.expiryDate);
      if (days > 60) continue;
      const client = clientMap.get(v.clientId);
      if (!client?.email) continue;
      items.push({
        serviceId: v.id,
        serviceType: 'vps',
        serviceName: v.name,
        clientId: v.clientId,
        clientName: client.name,
        clientEmail: client.email,
        expiryDate: v.expiryDate.toISOString(),
        daysLeft: days,
        price: 0,
        currency: defaultCurrency,
        subscriptionId: null,
        lastSentAt: lastSentMap.get(v.id) ?? null,
      });
    }

    // Emails without subscription
    for (const e of emails) {
      if (subscribedServiceIds.has(e.id) || !e.expiryDate) continue;
      const days = daysFromNow(e.expiryDate);
      if (days > 60) continue;
      const client = clientMap.get(e.clientId);
      if (!client?.email) continue;
      items.push({
        serviceId: e.id,
        serviceType: 'email',
        serviceName: `${e.name}@${e.domain}`,
        clientId: e.clientId,
        clientName: client.name,
        clientEmail: client.email,
        expiryDate: e.expiryDate.toISOString(),
        daysLeft: days,
        price: 0,
        currency: defaultCurrency,
        subscriptionId: null,
        lastSentAt: lastSentMap.get(e.id) ?? null,
      });
    }

    // Websites without subscription
    for (const w of websites) {
      if (subscribedServiceIds.has(w.id) || !w.renewalDate) continue;
      const days = daysFromNow(w.renewalDate);
      if (days > 60) continue;
      const client = clientMap.get(w.clientId);
      if (!client?.email) continue;
      items.push({
        serviceId: w.id,
        serviceType: 'website',
        serviceName: w.name,
        clientId: w.clientId,
        clientName: client.name,
        clientEmail: client.email,
        expiryDate: w.renewalDate.toISOString(),
        daysLeft: days,
        price: w.planPrice ?? 0,
        currency: defaultCurrency,
        subscriptionId: null,
        lastSentAt: lastSentMap.get(w.id) ?? null,
      });
    }

    // Mobile Apps without subscription
    for (const m of mobileApps) {
      if (subscribedServiceIds.has(m.id) || !m.expiryDate) continue;
      const days = daysFromNow(m.expiryDate);
      if (days > 60) continue;
      const client = clientMap.get(m.clientId);
      if (!client?.email) continue;
      items.push({
        serviceId: m.id,
        serviceType: 'mobile_app',
        serviceName: m.name,
        clientId: m.clientId,
        clientName: client.name,
        clientEmail: client.email,
        expiryDate: m.expiryDate.toISOString(),
        daysLeft: days,
        price: m.price ?? 0,
        currency: defaultCurrency,
        subscriptionId: null,
        lastSentAt: lastSentMap.get(m.id) ?? null,
      });
    }

    // Sort: most urgent first
    items.sort((a, b) => a.daysLeft - b.daysLeft);

    return { success: true, data: items };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

// ─── Send reminder email ───────────────────────────────────────────────────────

export async function sendReminderEmail(
  companyId: string,
  item: ReminderItem,
  paymentLink?: string,
  cc: string[] = [],
) {
  const host = process.env.SMTP_HOST?.trim();
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();
  const from = process.env.SMTP_FROM?.trim() || user;
  const port = Number(process.env.SMTP_PORT?.trim() || '465');

  if (!host || !user || !pass || !from) {
    return { success: false as const, error: 'SMTP is not configured.' };
  }

  try {
    const company = await prisma.company.findUnique({ where: { id: companyId } });

    const serviceLabels: Record<ServiceType, string> = {
      domain: 'Domain',
      hosting: 'Hosting',
      vps: 'VPS Server',
      email: 'Email Service',
      website: 'Website',
      mobile_app: 'Mobile Application',
    };
    const serviceLabel = serviceLabels[item.serviceType];

    const expDate = new Date(item.expiryDate).toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric',
    });

    const urgencyLabel =
      item.daysLeft < 0 ? `Expired ${Math.abs(item.daysLeft)} day(s) ago`
      : item.daysLeft === 0 ? 'Expires TODAY'
      : `Expires in ${item.daysLeft} day(s)`;

    const html = buildReminderEmailHtml(
      {
        name: company?.name,
        email: company?.email,
        phone: company?.phone,
        reminderEmailHeaderHtml: company?.reminderEmailHeaderHtml ?? null,
        reminderEmailBodyHtml: company?.reminderEmailBodyHtml ?? null,
        reminderEmailFooterHtml: company?.reminderEmailFooterHtml ?? null,
      },
      item,
      paymentLink,
    );

    const text = [
      `Hello ${item.clientName},`,
      '',
      `Reminder: Your ${serviceLabel} "${item.serviceName}" ${urgencyLabel.toLowerCase()}.`,
      `Expiry date: ${expDate}`,
      item.price > 0 ? `Renewal price: ${item.currency} ${item.price.toFixed(2)}` : '',
      paymentLink ? `\nRenew here: ${paymentLink}` : '',
      '',
      '— Pencil for E-Marketing Ltd · Hosting & Digital System Provider',
      'Mahmoud El-Sabbagh Technical Support Provider in the Middle East',
      'Phone: +20 100 377 8273 | Email: elsabbagh@dipencil.com',
    ].filter((l) => l !== undefined).join('\n');

    const transporter = nodemailer.createTransport({
      host, port, secure: port === 465, auth: { user, pass },
    });

    const to = item.clientEmail.trim();
    const validCc = cc
      .map((e) => e.trim())
      .filter((e) => e && e.toLowerCase() !== to.toLowerCase());

    await transporter.sendMail({
      from: `"diPencil Panel" <${from}>`,
      to,
      ...(validCc.length > 0 && { cc: validCc.join(', ') }),
      subject: `Reminder: ${item.serviceName} ${item.daysLeft < 0 ? 'has expired' : `expires in ${item.daysLeft} day(s)`}`,
      text,
      html,
    });

    // Log the reminder (use raw serviceId from the item)
    const logServiceId = item.serviceId; // e.g. "sub_xyz" or raw id
    await prisma.reminderLog.create({
      data: {
        companyId,
        clientId: item.clientId,
        serviceType: item.serviceType,
        serviceId: logServiceId,
        serviceName: item.serviceName,
        daysLeft: item.daysLeft,
      },
    });

    return { success: true as const };
  } catch (e) {
    return { success: false as const, error: e instanceof Error ? e.message : String(e) };
  }
}
