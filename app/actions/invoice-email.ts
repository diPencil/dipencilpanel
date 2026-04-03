'use server';

import nodemailer from 'nodemailer';
import { prisma } from '@/lib/prisma';
import {
  applyInvoiceEmailPlaceholders,
  DEFAULT_INVOICE_EMAIL_BODY_HTML,
  DEFAULT_INVOICE_EMAIL_FOOTER_HTML,
  DEFAULT_INVOICE_EMAIL_HEADER_HTML,
} from '@/lib/invoice-email-placeholders';
import { formatInvoiceNumber } from '@/lib/formatting';

const ACCENT = '#6d28d9';
const TEXT = '#111827';
const MUTED = '#6b7280';
const BORDER = '#e5e7eb';
const PAGE_BG = '#f3f4f6';

const EMAIL_BRAND_FALLBACK = 'Pencil Studio';

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

function formatDate(d: Date): string {
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

function absoluteAssetUrl(path: string | null | undefined, baseUrl: string): string | null {
  if (!path?.trim() || path === '/logo.png') return null;
  const p = path.trim();
  if (p.startsWith('http://') || p.startsWith('https://')) return p;
  if (!baseUrl) return null;
  return `${baseUrl}${p.startsWith('/') ? p : `/${p}`}`;
}

function buildPlaceholderMap(args: {
  companyName: string;
  clientName: string;
  clientEmail: string;
  invoiceNumber: string;
  issueDate: Date;
  dueDate: Date;
  nextBillingDate: Date | null;
  isPaid: boolean;
  currency: string;
  subtotalExVat: number;
  vatAmount: number;
  total: number;
  logoUrl: string | null;
  logoBlockHtml: string;
  ctaRowHtml: string;
  viewUrl: string | null;
}): Record<string, string> {
  const {
    companyName,
    clientName,
    clientEmail,
    invoiceNumber,
    issueDate,
    dueDate,
    nextBillingDate,
    isPaid,
    currency,
    subtotalExVat,
    vatAmount,
    total,
    logoUrl,
    logoBlockHtml,
    ctaRowHtml,
    viewUrl,
  } = args;

  const nextBillingFormatted = nextBillingDate ? escapeHtml(formatDate(nextBillingDate)) : '';

  return {
    companyName: escapeHtml(companyName),
    clientName: escapeHtml(clientName),
    clientEmail: escapeHtml(clientEmail),
    invoiceNumber: escapeHtml(invoiceNumber),
    issueDate: escapeHtml(formatDate(issueDate)),
    dueDate: escapeHtml(formatDate(dueDate)),
    nextBillingDate: nextBillingFormatted,
    nextBillingBlock: nextBillingFormatted ? ` &middot; Next billing: ${nextBillingFormatted}` : '',
    paymentNote: isPaid ? '.' : ' and complete payment by the due date.',
    currency: escapeHtml(currency.toUpperCase()),
    totalPlain: escapeHtml(formatAmountPlain(total, currency)),
    subtotalPlain: escapeHtml(formatAmountPlain(subtotalExVat, currency)),
    vatPlain: escapeHtml(formatAmountPlain(vatAmount, currency)),
    logoUrl: logoUrl ? escapeHtml(logoUrl) : '',
    logoBlock: logoBlockHtml,
    ctaRow: ctaRowHtml,
    viewUrl: viewUrl ? escapeHtml(viewUrl) : '',
    accentColor: ACCENT,
  };
}

function buildInvoiceEmailHtml(params: {
  companyName: string;
  clientName: string;
  clientEmail: string;
  logoUrl: string | null;
  invoiceNumber: string;
  issueDate: Date;
  dueDate: Date;
  nextBillingDate: Date | null;
  isPaid: boolean;
  currency: string;
  items: { description: string; quantity: number; price: number; discount: number }[];
  subtotalExVat: number;
  vatAmount: number;
  total: number;
  viewUrl: string | null;
  headerTemplate: string | null | undefined;
  bodyTemplate: string | null | undefined;
  footerTemplate: string | null | undefined;
}): string {
  const {
    companyName,
    clientName,
    clientEmail,
    logoUrl,
    invoiceNumber,
    issueDate,
    dueDate,
    nextBillingDate,
    isPaid,
    currency,
    items,
    subtotalExVat,
    vatAmount,
    total,
    viewUrl,
    headerTemplate,
    bodyTemplate,
    footerTemplate,
  } = params;

  const logoBlockHtml = logoUrl
    ? `<img src="${escapeHtml(logoUrl)}" alt="${escapeHtml(companyName)}" width="240" style="max-width:240px;height:auto;display:block;margin:0 auto;border:0;" />`
    : `<p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:24px;font-weight:700;color:${TEXT};letter-spacing:-0.02em;">${escapeHtml(EMAIL_BRAND_FALLBACK)}</p>`;

  const ctaRowHtml =
    viewUrl != null
      ? `<tr>
          <td align="center" style="padding:0 40px 36px;">
            <a href="${escapeHtml(viewUrl)}" style="background:${ACCENT};color:#ffffff;text-decoration:none;padding:14px 36px;border-radius:8px;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:600;display:inline-block;">View invoice</a>
          </td>
        </tr>`
      : '';

  const map = buildPlaceholderMap({
    companyName,
    clientName,
    clientEmail,
    invoiceNumber,
    issueDate,
    dueDate,
    nextBillingDate,
    isPaid,
    currency,
    subtotalExVat,
    vatAmount,
    total,
    logoUrl,
    logoBlockHtml,
    ctaRowHtml,
    viewUrl,
  });

  const itemsTableRows = items
    .map((item) => {
      const gross = item.quantity * item.price;
      const disc = item.discount ? gross * (item.discount / 100) : 0;
      const line = gross - disc;
      const sub = `${item.quantity} × ${formatAmountPlain(item.price, currency)}`;
      return `<tr>
        <td style="padding:16px 0;border-bottom:1px solid ${BORDER};vertical-align:top;">
          <p style="margin:0 0 4px;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;color:${TEXT};">${escapeHtml(item.description)}</p>
          <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:${MUTED};">${escapeHtml(sub)}</p>
        </td>
        <td align="right" style="padding:16px 0;border-bottom:1px solid ${BORDER};vertical-align:top;white-space:nowrap;">
          <span style="font-family:Arial,Helvetica,sans-serif;font-size:15px;color:${TEXT};">${formatAmountPlain(line, currency)}</span>
        </td>
      </tr>`;
    })
    .join('');

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

  const templateMap: Record<string, string> = {
    ...map,
    itemsTableRows,
    totalsBlock,
  };

  const headerSrc = headerTemplate?.trim() || DEFAULT_INVOICE_EMAIL_HEADER_HTML;
  const bodySrc = bodyTemplate?.trim() || DEFAULT_INVOICE_EMAIL_BODY_HTML;
  const footerSrc = footerTemplate?.trim() || DEFAULT_INVOICE_EMAIL_FOOTER_HTML;
  const headerHtml = applyInvoiceEmailPlaceholders(headerSrc, templateMap);
  const bodyHtml = applyInvoiceEmailPlaceholders(bodySrc, templateMap);
  const footerHtml = applyInvoiceEmailPlaceholders(footerSrc, templateMap);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(invoiceNumber)}</title>
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

/**
 * Sends invoice email via SMTP. Header/body/footer HTML come from company settings (or built-in defaults).
 * Use {{placeholders}}; body must include {{itemsTableRows}} and {{totalsBlock}} for live invoice data.
 */
export async function sendInvoiceToClientEmail(invoiceId: string, companyId: string, cc: string[] = []) {
  const host = process.env.SMTP_HOST?.trim();
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();
  const from = process.env.SMTP_FROM?.trim() || user;
  const port = Number(process.env.SMTP_PORT?.trim() || '465');

  if (!host || !user || !pass || !from) {
    return {
      success: false as const,
      error:
        'SMTP is not configured. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, and SMTP_FROM in your environment.',
    };
  }

  try {
    const invoice = await prisma.invoice.findFirst({
      where: { id: invoiceId, companyId },
      include: { client: true, items: true, company: true },
    });

    if (!invoice) return { success: false as const, error: 'Invoice not found' };

    const to = invoice.client.email?.trim();
    if (!to) return { success: false as const, error: 'Client has no email address' };

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });

    const currency = invoice.currency || 'USD';
    const companyName = invoice.company.name || 'Company';
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') || '';

    const logoPath = invoice.company.invoiceLogo?.trim() || invoice.company.logo?.trim() || null;
    let logoUrl = absoluteAssetUrl(logoPath, baseUrl);
    if (!logoUrl && baseUrl) {
      logoUrl = `${baseUrl}/placeholder-logo.svg`;
    }

    const viewUrl = baseUrl ? `${baseUrl}/dashboard/billing/invoices/${invoice.id}` : null;

    const subtotalExVat = invoice.subtotal - invoice.discountAmount;

    const formattedNum = formatInvoiceNumber(invoice.number);

    const html = buildInvoiceEmailHtml({
      companyName,
      clientName: invoice.client.name,
      clientEmail: invoice.client.email,
      logoUrl,
      invoiceNumber: formattedNum,
      issueDate: invoice.issueDate,
      dueDate: invoice.dueDate,
      nextBillingDate: invoice.nextBillingDate ?? null,
      isPaid: invoice.paymentStatus === 'paid' || invoice.status === 'paid',
      currency,
      items: invoice.items.map((i) => ({
        description: i.description,
        quantity: i.quantity,
        price: i.price,
        discount: i.discount,
      })),
      subtotalExVat,
      vatAmount: invoice.vatAmount,
      total: invoice.total,
      viewUrl,
      headerTemplate: invoice.company.invoiceEmailHeaderHtml,
      bodyTemplate: invoice.company.invoiceEmailBodyHtml,
      footerTemplate: invoice.company.invoiceEmailFooterHtml,
    });

    const text = [
      companyName,
      '',
      `Hello ${invoice.client.name},`,
      '',
      `Invoice ${formattedNum}`,
      `Issued: ${formatDate(invoice.issueDate)} · Due: ${formatDate(invoice.dueDate)}`,
      '',
      ...invoice.items.map((item) => {
        const gross = item.quantity * item.price;
        const disc = item.discount ? gross * (item.discount / 100) : 0;
        return `- ${item.description}: ${formatAmountPlain(gross - disc, currency)}`;
      }),
      '',
      `Subtotal (excl. tax): ${formatAmountPlain(subtotalExVat, currency)}`,
      `Taxes: ${formatAmountPlain(invoice.vatAmount, currency)}`,
      `Total billing: ${formatAmountPlain(invoice.total, currency)}`,
      '',
      viewUrl ? `View invoice: ${viewUrl}` : '',
      '',
      'If you would like assistance with renewal or have any questions, please contact our exclusive service agent:',
      'Engineer Mahmoud El Sabbagh — Technical Agent for Hostinger (Middle East)',
      '',
      '---',
      companyName,
      `You are receiving this message because ${companyName} sent you an invoice.`,
      '',
      'Thank you for your business!',
      companyName,
      'For renewal help or billing questions, contact our service team:',
      '',
      'Engineer Mahmoud El-Sabbagh',
      'Technical Agent — diPencil',
      'Phone: +20 100 377 8273',
      'Email: elsabbagh@dipencil.com',
      '',
      'Pencil Studio | Technology Agents in the Middle East',
      'Feel free to contact us for more information about our service options. Thank you for your business.',
    ]
      .filter(Boolean)
      .join('\n');

    const subject = `Your invoice ${formattedNum} is ready!`;
    const safeFromName = 'diPencil Panel';

    const validCc = cc.map((e) => e.trim()).filter((e) => e && e !== to);

    await transporter.sendMail({
      from: `"${safeFromName}" <${from}>`,
      to,
      ...(validCc.length > 0 && { cc: validCc.join(', ') }),
      replyTo: from,
      subject,
      text,
      html,
    });

    return { success: true as const };
  } catch (e) {
    return { success: false as const, error: e instanceof Error ? e.message : String(e) };
  }
}
