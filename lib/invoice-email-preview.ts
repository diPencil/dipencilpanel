/**
 * Client-side live preview for invoice email templates (sample data only).
 */

import { applyInvoiceEmailPlaceholders } from '@/lib/invoice-email-placeholders';

const ACCENT = '#6d28d9';
const PAGE_BG = '#f3f4f6';
const TEXT = '#111827';
const MUTED = '#6b7280';
const BORDER = '#e5e7eb';

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatAmountPlain(amount: number, currency: string): string {
  const c = (currency || 'USD').toUpperCase();
  return `${amount.toFixed(2)} ${c}`;
}

/** Normalize for comparing editor content to built-in defaults (save null if unchanged). */
export function normalizeTemplateWhitespace(s: string): string {
  return s.trim().replace(/\r\n/g, '\n');
}

export function templateMatchesDefault(editor: string, builtIn: string): boolean {
  return normalizeTemplateWhitespace(editor) === normalizeTemplateWhitespace(builtIn);
}

export function buildSampleInvoiceEmailPlaceholderMap(companyName: string): Record<string, string> {
  const cn = companyName.trim() || 'Your company';
  const currency = 'USD';
  const subtotalExVat = 150;
  const vatAmount = 22.5;
  const total = 172.5;

  const logoBlockHtml = `<img src="https://hpanel.hostinger.com/assets/images/logos/hostinger-black.svg" alt="${escapeHtml(cn)}" width="120" style="max-width:120px;height:auto;display:block;margin:0 auto;border:0;" />`;

  const viewUrl = 'https://app.example.com/dashboard/billing/invoices/preview';

  const ctaRowHtml = `<tr>
          <td align="center" style="padding:0 40px 36px;">
            <a href="${escapeHtml(viewUrl)}" style="background:${ACCENT};color:#ffffff;text-decoration:none;padding:14px 36px;border-radius:8px;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:600;display:inline-block;">View invoice</a>
          </td>
        </tr>`;

  const itemsTableRows = `<tr>
        <td style="padding:16px 0;border-bottom:1px solid ${BORDER};vertical-align:top;">
          <p style="margin:0 0 4px;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;color:${TEXT};">Sample hosting plan</p>
          <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:${MUTED};">1 × ${formatAmountPlain(150, currency)}</p>
        </td>
        <td align="right" style="padding:16px 0;border-bottom:1px solid ${BORDER};vertical-align:top;white-space:nowrap;">
          <span style="font-family:Arial,Helvetica,sans-serif;font-size:15px;color:${TEXT};">${formatAmountPlain(150, currency)}</span>
        </td>
      </tr>`;

  const totalsBlock = `<tr>
            <td style="padding:8px 40px 0;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="padding:12px 0;border-top:1px solid ${BORDER};font-family:Arial,Helvetica,sans-serif;font-size:14px;color:${TEXT};">Subtotal (excl. tax)</td>
                  <td align="right" style="padding:12px 0;border-top:1px solid ${BORDER};font-family:Arial,Helvetica,sans-serif;font-size:14px;color:${TEXT};">${formatAmountPlain(subtotalExVat, currency)}</td>
                </tr>
                <tr>
                  <td style="padding:12px 0;border-top:1px solid ${BORDER};font-family:Arial,Helvetica,sans-serif;font-size:14px;color:${TEXT};">Taxes</td>
                  <td align="right" style="padding:12px 0;border-top:1px solid ${BORDER};font-family:Arial,Helvetica,sans-serif;font-size:14px;color:${TEXT};">${formatAmountPlain(vatAmount, currency)}</td>
                </tr>
                <tr>
                  <td style="padding:16px 0 24px;border-top:2px solid ${TEXT};font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:700;color:${TEXT};">Total billing</td>
                  <td align="right" style="padding:16px 0 24px;border-top:2px solid ${TEXT};font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:700;color:${TEXT};">${formatAmountPlain(total, currency)}</td>
                </tr>
              </table>
            </td>
          </tr>`;

  return {
    companyName: escapeHtml(cn),
    clientName: escapeHtml('Pencil Studio'),
    clientEmail: escapeHtml('billing@example.com'),
    invoiceNumber: escapeHtml('INV-2026-0001'),
    issueDate: escapeHtml('April 1, 2026'),
    dueDate: escapeHtml('April 15, 2026'),
    nextBillingDate: escapeHtml('May 1, 2026'),
    nextBillingBlock: ` &middot; Next billing: ${escapeHtml('May 1, 2026')}`,
    paymentNote: ' and complete payment by the due date.',
    currency: escapeHtml(currency),
    totalPlain: escapeHtml(formatAmountPlain(total, currency)),
    subtotalPlain: escapeHtml(formatAmountPlain(subtotalExVat, currency)),
    vatPlain: escapeHtml(formatAmountPlain(vatAmount, currency)),
    logoUrl: escapeHtml('https://example.com/logo.png'),
    logoBlock: logoBlockHtml,
    viewUrl: escapeHtml(viewUrl),
    ctaRow: ctaRowHtml,
    accentColor: ACCENT,
    itemsTableRows,
    totalsBlock,
  };
}

export function buildInvoiceEmailPreviewDocument(
  headerTemplate: string,
  bodyTemplate: string,
  footerTemplate: string,
  companyName: string,
): string {
  const map = buildSampleInvoiceEmailPlaceholderMap(companyName);
  const headerHtml = applyInvoiceEmailPlaceholders(headerTemplate, map);
  const bodyHtml = applyInvoiceEmailPlaceholders(bodyTemplate, map);
  const footerHtml = applyInvoiceEmailPlaceholders(footerTemplate, map);
  const titleSafe = 'INV-2026-0001';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(titleSafe)}</title>
</head>
<body style="margin:0;padding:0;background:${PAGE_BG};">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${PAGE_BG};">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:10px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.06);">
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
