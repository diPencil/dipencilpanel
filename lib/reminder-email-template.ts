/**
 * Renewal / subscription reminder emails: HTML fragments (table rows) with {{placeholders}}.
 * Edited under Settings → Reminder email template.
 */

export const REMINDER_EMAIL_TEMPLATE_VARIABLES: { key: string; description: string }[] = [
  { key: 'logoBlock', description: 'Ready-to-use logo &lt;img&gt; (HTML)' },
  { key: 'companyName', description: 'Workspace company name (escaped text)' },
  { key: 'companyEmail', description: 'Company email from settings (escaped)' },
  { key: 'companyPhone', description: 'Company phone from settings (escaped)' },
  { key: 'urgencyColor', description: 'Banner background hex (#dc2626, #ea580c, …)' },
  { key: 'urgencyLabel', description: 'Banner text, e.g. “Expires in 5 day(s)”' },
  { key: 'clientName', description: 'Client display name' },
  { key: 'serviceLabel', description: 'Human label: Hosting, Domain, …' },
  { key: 'serviceName', description: 'Specific service name / hostname' },
  { key: 'expiryDate', description: 'Formatted expiry date' },
  { key: 'serviceDetailsTable', description: 'Full details &lt;table&gt; (rows, price, CTA) — keep in Body' },
];

/** Logo row at top of the white card. */
export const DEFAULT_REMINDER_EMAIL_HEADER_HTML = `<tr><td style="background:#ffffff;padding:28px 40px;text-align:center;border-bottom:1px solid #e5e7eb;">
{{logoBlock}}
</td></tr>`;

/** Urgency strip + greeting + {{serviceDetailsTable}} + closing note. */
export const DEFAULT_REMINDER_EMAIL_BODY_HTML = `<tr><td style="background:{{urgencyColor}};padding:10px 40px;text-align:center;">
<span style="color:#ffffff;font-size:13px;font-weight:700;letter-spacing:0.5px;">{{urgencyLabel}}</span>
</td></tr>
<tr><td style="padding:32px 40px;">
<p style="margin:0 0 8px;font-size:16px;color:#111827;">Hello <strong>{{clientName}}</strong>,</p>
<p style="margin:0 0 24px;font-size:14px;color:#6b7280;line-height:1.6;">
This is a reminder that your <strong>{{serviceLabel}}</strong> service is due for renewal.
Please review the details below and renew before the expiration date to avoid any interruption.
</p>
{{serviceDetailsTable}}
<p style="margin:0;font-size:13px;color:#9ca3af;line-height:1.6;">
If you have already renewed or would like assistance, please contact our exclusive service middle east agent.
</p>
</td></tr>`;

/** Footer inside the white card. */
export const DEFAULT_REMINDER_EMAIL_FOOTER_HTML = `<tr><td style="background:#f9fafb;padding:20px 40px;border-top:1px solid #e5e7eb;text-align:center;">
<p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.5;">Pencil for E-Marketing Ltd · Hosting &amp; Digital System Provider</p>
<p style="margin:6px 0 0;font-size:12px;color:#9ca3af;line-height:1.5;">Mahmoud El-Sabbagh Technical Support Provider in the Middle East</p>
<p style="margin:8px 0 0;font-size:11px;color:#d1d5db;">Phone: +20 100 377 8273 | Email: elsabbagh@dipencil.com</p>
</td></tr>`;
