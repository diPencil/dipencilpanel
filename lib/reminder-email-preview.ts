/**
 * Live preview for reminder email templates (sample data, client-only).
 */

import { applyInvoiceEmailPlaceholders } from '@/lib/invoice-email-placeholders';
import {
  DEFAULT_REMINDER_EMAIL_BODY_HTML,
  DEFAULT_REMINDER_EMAIL_FOOTER_HTML,
  DEFAULT_REMINDER_EMAIL_HEADER_HTML,
} from '@/lib/reminder-email-template';
import { buildServiceDetailsTableHtml } from '@/lib/reminder-email-service-details';
import { templateMatchesDefault } from '@/lib/invoice-email-preview';

export { templateMatchesDefault, normalizeTemplateWhitespace } from '@/lib/invoice-email-preview';

const SAMPLE_ITEM = {
  serviceType: 'hosting' as const,
  serviceName: 'Business Web Hosting',
  clientName: 'Pencil Studio',
  expiryDate: new Date('2026-04-15T12:00:00.000Z').toISOString(),
  daysLeft: 5,
  price: 49.99,
  currency: 'USD',
  subscriptionId: 'sub_preview' as string | null,
};

function buildSampleReminderMap(companyName: string): Record<string, string> {
  const urgencyColor = '#d97706';
  const urgencyLabel = 'Expires in 5 day(s)';
  const expDate = new Date(SAMPLE_ITEM.expiryDate).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const cn = companyName.trim() || 'Your company';

  function escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  const logoBlock = `<img src="https://hpanel.hostinger.com/assets/images/logos/hostinger-black.svg" alt="Hostinger" width="120" style="max-width:120px;height:auto;display:block;margin:0 auto;border:0;" />`;

  return {
    logoBlock,
    companyName: escapeHtml(cn),
    companyEmail: escapeHtml('contact@company.com'),
    companyPhone: escapeHtml('+1 (555) 123-4567'),
    urgencyColor,
    urgencyLabel: escapeHtml(urgencyLabel),
    clientName: escapeHtml(SAMPLE_ITEM.clientName),
    serviceLabel: escapeHtml('Hosting'),
    serviceName: escapeHtml(SAMPLE_ITEM.serviceName),
    expiryDate: escapeHtml(expDate),
    serviceDetailsTable: buildServiceDetailsTableHtml(SAMPLE_ITEM, urgencyColor, undefined),
  };
}

export function buildReminderEmailPreviewDocument(
  headerTemplate: string,
  bodyTemplate: string,
  footerTemplate: string,
  companyName: string,
): string {
  const map = buildSampleReminderMap(companyName);
  const headerHtml = applyInvoiceEmailPlaceholders(headerTemplate, map);
  const bodyHtml = applyInvoiceEmailPlaceholders(bodyTemplate, map);
  const footerHtml = applyInvoiceEmailPlaceholders(footerTemplate, map);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Reminder preview</title>
</head>
<body style="margin:0;padding:0;background:#f9fafb;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f9fafb;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="560" cellspacing="0" cellpadding="0" style="max-width:560px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
          ${headerHtml}
          ${bodyHtml}
          ${footerHtml}
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function reminderTemplateMatchesDefault(editor: string, builtIn: string): boolean {
  return templateMatchesDefault(editor, builtIn);
}
