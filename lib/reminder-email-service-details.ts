/**
 * HTML for the reminder “service details” table — safe for client preview and server send.
 */

export type ReminderServiceDetailsInput = {
  serviceType: 'domain' | 'hosting' | 'vps' | 'email' | 'website' | 'mobile_app';
  serviceName: string;
  expiryDate: string;
  daysLeft: number;
  price: number;
  currency: string;
  subscriptionId: string | null;
};

const SERVICE_LABELS: Record<ReminderServiceDetailsInput['serviceType'], string> = {
  domain: 'Domain',
  hosting: 'Hosting',
  vps: 'VPS Server',
  email: 'Email Service',
  website: 'Website',
  mobile_app: 'Mobile Application',
};

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function buildServiceDetailsTableHtml(
  item: ReminderServiceDetailsInput,
  urgencyColor: string,
  paymentLink?: string,
): string {
  const serviceLabel = SERVICE_LABELS[item.serviceType];
  const expDate = new Date(item.expiryDate).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const priceBlock =
    item.price > 0
      ? `<tr><td style="padding:8px 16px;font-size:13px;color:#6b7280;border-bottom:1px solid #f3f4f6;">Renewal Price</td><td style="padding:8px 16px;font-size:13px;font-weight:600;color:#111827;text-align:right;border-bottom:1px solid #f3f4f6;">${escapeHtml(item.currency)} ${item.price.toFixed(2)}</td></tr>`
      : '';

  const ctaBlock = paymentLink
    ? `<tr><td colspan="2" style="padding:20px 16px 8px;"><a href="${escapeHtml(paymentLink)}" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:8px;font-size:14px;font-weight:600;">Renew Now</a></td></tr>`
    : '';

  const subBadge = item.subscriptionId
    ? `<tr><td style="padding:8px 16px;font-size:13px;color:#6b7280;border-bottom:1px solid #f3f4f6;">Subscription</td><td style="padding:8px 16px;text-align:right;border-bottom:1px solid #f3f4f6;"><span style="font-size:11px;background:#f0fdf4;color:#16a34a;border:1px solid #bbf7d0;padding:2px 8px;border-radius:99px;">Active</span></td></tr>`
    : '';

  return `<table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;margin-bottom:24px;">
<tr style="background:#f9fafb;"><td colspan="2" style="padding:10px 16px;font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;border-bottom:1px solid #e5e7eb;">Service Details</td></tr>
<tr><td style="padding:8px 16px;font-size:13px;color:#6b7280;border-bottom:1px solid #f3f4f6;">Service Type</td><td style="padding:8px 16px;font-size:13px;font-weight:600;color:#111827;text-align:right;border-bottom:1px solid #f3f4f6;">${escapeHtml(serviceLabel)}</td></tr>
<tr><td style="padding:8px 16px;font-size:13px;color:#6b7280;border-bottom:1px solid #f3f4f6;">Service Name</td><td style="padding:8px 16px;font-size:13px;font-weight:600;color:#111827;text-align:right;border-bottom:1px solid #f3f4f6;">${escapeHtml(item.serviceName)}</td></tr>
${subBadge}
<tr><td style="padding:8px 16px;font-size:13px;color:#6b7280;border-bottom:1px solid #f3f4f6;">Expiry Date</td><td style="padding:8px 16px;font-size:13px;font-weight:600;color:${urgencyColor};text-align:right;border-bottom:1px solid #f3f4f6;">${escapeHtml(expDate)}</td></tr>
${priceBlock}
${ctaBlock}
</table>`;
}
