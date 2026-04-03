import { applyInvoiceEmailPlaceholders } from '@/lib/invoice-email-placeholders';
import type { ReminderItem, ServiceType } from '@/app/actions/reminder-emails';
import { buildServiceDetailsTableHtml } from '@/lib/reminder-email-service-details';
import {
  DEFAULT_REMINDER_EMAIL_BODY_HTML,
  DEFAULT_REMINDER_EMAIL_FOOTER_HTML,
  DEFAULT_REMINDER_EMAIL_HEADER_HTML,
} from '@/lib/reminder-email-template';

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const SERVICE_LABELS: Record<ServiceType, string> = {
  domain: 'Domain',
  hosting: 'Hosting',
  vps: 'VPS Server',
  email: 'Email Service',
  website: 'Website',
  mobile_app: 'Mobile Application',
};

function buildLogoBlockHtml(): string {
  return `<img src="https://hpanel.hostinger.com/assets/images/logos/hostinger-black.svg" alt="Hostinger" width="120" style="max-width:120px;height:auto;display:block;margin:0 auto;border:0;" />`;
}

export function buildReminderPlaceholderMap(
  company: { name?: string | null; email?: string | null; phone?: string | null },
  item: ReminderItem,
  paymentLink?: string,
): Record<string, string> {
  const urgencyColor =
    item.daysLeft < 0 ? '#dc2626'
    : item.daysLeft <= 1 ? '#ea580c'
    : item.daysLeft <= 7 ? '#d97706'
    : '#2563eb';

  const urgencyLabel =
    item.daysLeft < 0 ? `Expired ${Math.abs(item.daysLeft)} day(s) ago`
    : item.daysLeft === 0 ? 'Expires TODAY'
    : `Expires in ${item.daysLeft} day(s)`;

  const expDate = new Date(item.expiryDate).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const serviceLabel = SERVICE_LABELS[item.serviceType];

  return {
    logoBlock: buildLogoBlockHtml(),
    companyName: escapeHtml((company.name ?? '').trim() || 'Company'),
    companyEmail: escapeHtml((company.email ?? '').trim()),
    companyPhone: escapeHtml((company.phone ?? '').trim()),
    urgencyColor,
    urgencyLabel: escapeHtml(urgencyLabel),
    clientName: escapeHtml(item.clientName),
    serviceLabel: escapeHtml(serviceLabel),
    serviceName: escapeHtml(item.serviceName),
    expiryDate: escapeHtml(expDate),
    serviceDetailsTable: buildServiceDetailsTableHtml(item, urgencyColor, paymentLink),
  };
}

type CompanyReminderTemplates = {
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  reminderEmailHeaderHtml?: string | null;
  reminderEmailBodyHtml?: string | null;
  reminderEmailFooterHtml?: string | null;
};

export function buildReminderEmailHtml(
  company: CompanyReminderTemplates,
  item: ReminderItem,
  paymentLink?: string,
): string {
  const map = buildReminderPlaceholderMap(company, item, paymentLink);
  const headerSrc =
    company.reminderEmailHeaderHtml?.trim() || DEFAULT_REMINDER_EMAIL_HEADER_HTML;
  const bodySrc = company.reminderEmailBodyHtml?.trim() || DEFAULT_REMINDER_EMAIL_BODY_HTML;
  const footerSrc =
    company.reminderEmailFooterHtml?.trim() || DEFAULT_REMINDER_EMAIL_FOOTER_HTML;

  const header = applyInvoiceEmailPlaceholders(headerSrc, map);
  const body = applyInvoiceEmailPlaceholders(bodySrc, map);
  const footer = applyInvoiceEmailPlaceholders(footerSrc, map);

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:32px 16px;">
  <tr><td align="center">
    <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
      ${header}
      ${body}
      ${footer}
    </table>
  </td></tr>
</table>
</body>
</html>`;
}
