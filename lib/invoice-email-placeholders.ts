/**
 * Invoice notification email: custom header/footer HTML with `{{variable}}` placeholders.
 * Values are pre-escaped for HTML text; blocks like {{logoBlock}} and {{ctaRow}} are trusted server HTML.
 */

export const INVOICE_EMAIL_TEMPLATE_VARIABLES: { key: string; description: string }[] = [
  { key: 'companyName', description: 'Company name (from workspace settings)' },
  { key: 'clientName', description: 'Invoice recipient name' },
  { key: 'clientEmail', description: 'Recipient email address' },
  { key: 'invoiceNumber', description: 'Invoice number (e.g. INV-2026-0001)' },
  { key: 'issueDate', description: 'Issue date (formatted)' },
  { key: 'dueDate', description: 'Due date (formatted)' },
  { key: 'nextBillingDate', description: 'Next billing / renewal date (formatted, empty if not set)' },
  { key: 'nextBillingBlock', description: 'Full " · Next billing: …" segment — empty string if no date set (used in body template)' },
  { key: 'paymentNote', description: '"and complete payment by the due date." when unpaid/pending — empty string when already paid' },
  { key: 'currency', description: 'Currency code (USD, EUR, …)' },
  { key: 'totalPlain', description: 'Total as "123.45 USD"' },
  { key: 'subtotalPlain', description: 'Subtotal excl. tax, plain amount' },
  { key: 'vatPlain', description: 'VAT / taxes, plain amount' },
  { key: 'logoUrl', description: 'Absolute logo URL (safe for href/src attributes)' },
  { key: 'logoBlock', description: 'Ready-to-use &lt;img&gt; or fallback title (HTML)' },
  { key: 'viewUrl', description: 'Link to open the invoice in the panel (may be empty)' },
  { key: 'ctaRow', description: 'Full &lt;tr&gt;…&lt;/tr&gt; for the purple “View invoice” button (or empty)' },
  { key: 'accentColor', description: 'Brand accent hex (e.g. #6d28d9)' },
  {
    key: 'itemsTableRows',
    description: 'Generated &lt;tr&gt; rows for each invoice line (description, qty×price, line total) — body template only',
  },
  {
    key: 'totalsBlock',
    description:
      'Generated block: subtotal (excl. tax), taxes, total due — keep this placeholder where the money summary should appear',
  },
];

/** مرجع: إيه اللي بيظهر في الميل وأي قالب تعدّله (عربي للواجهة). */
export type InvoiceEmailGuideSection = {
  id: 'header' | 'body' | 'footer';
  titleAr: string;
  titleEn: string;
  rows: { whatAr: string; whereAr: string; placeholder?: string }[];
};

export const INVOICE_EMAIL_TEMPLATE_GUIDE: InvoiceEmailGuideSection[] = [
  {
    id: 'header',
    titleAr: 'الهيدر — Header HTML',
    titleEn: 'أعلى البطاقة البيضاء (قبل عنوان الفاتورة)',
    rows: [
      {
        whatAr: 'اسم الشركة بخط عريض في أعلى الميل',
        whereAr: 'قالب الهيدر — يتبدّل تلقائياً من إعدادات الشركة (اسم الووركسبيس)',
        placeholder: '{{companyName}}',
      },
      {
        whatAr: 'شعار الفاتورة أو نص بديل إذا مفيش صورة',
        whereAr: 'قالب الهيدر — الصورة من إعدادات Invoice logo / Logo',
        placeholder: '{{logoBlock}}',
      },
      {
        whatAr: 'لو مفيش صورة خالص: يظهر اسم ثابت في السيرفر (حالياً «Pencil Studio») مش من إعدادات الشركة',
        whereAr: 'ملف إرسال الميل — لتغييره لاحقاً لازم يتعدّل الكود أو يضاف placeholder',
      },
    ],
  },
  {
    id: 'body',
    titleAr: 'الجسم — Body HTML',
    titleEn: 'العنوان، التحية، الجدول، المجاميع، التواريخ، ملاحظة الوكيل',
    rows: [
      {
        whatAr: 'العنوان الكبير (مثل: Your invoice is ready)',
        whereAr: 'نص ثابت داخل قالب الجسم — غيّره من حقل Body كما تحب',
      },
      {
        whatAr: 'التحية + اسم العميل (Hello …)',
        whereAr: 'قالب الجسم — الاسم من بيانات العميل على الفاتورة',
        placeholder: '{{clientName}}',
      },
      {
        whatAr: 'زر «View invoice» البنفسجي (لو فيه رابط للبانل)',
        whereAr: 'قالب الجسم — يُولَّد من السيرفر',
        placeholder: '{{ctaRow}}',
      },
      {
        whatAr: 'خط فاصل رمادي',
        whereAr: 'HTML ثابت في قالب الجسم (div بارتفاع 1px)',
      },
      {
        whatAr: 'عنوان قسم الملخص (Your order summary) + رقم الفاتورة',
        whereAr: 'العنوان ثابت في القالب؛ الرقم من الفاتورة',
        placeholder: '{{invoiceNumber}}',
      },
      {
        whatAr: 'رؤوس أعمدة الجدول (Product / Price)',
        whereAr: 'نص ثابت في قالب الجسم — غيّرها للعربي أو غيره',
      },
      {
        whatAr: 'صفوف البنود (الوصف، الكمية × السعر، المجموع)',
        whereAr: 'قالب الجسم — لا تحذف هذا الموضع',
        placeholder: '{{itemsTableRows}}',
      },
      {
        whatAr: 'المجاميع: Subtotal، Taxes، Total due',
        whereAr: 'قالب الجسم — لا تحذف هذا الموضع',
        placeholder: '{{totalsBlock}}',
      },
      {
        whatAr: 'تواريخ الإصدار والاستحقاق (Issued · Due)',
        whereAr: 'قالب الجسم — من الفاتورة',
        placeholder: '{{issueDate}} · {{dueDate}}',
      },
      {
        whatAr: 'نص التواصل مع وكيل Hostinger (Mahmoud El Sabbagh…)',
        whereAr: 'نص ثابت حالياً داخل قالب الجسم — عدّله من حقل Body إذا حابب',
      },
    ],
  },
  {
    id: 'footer',
    titleAr: 'الفوتر — Footer HTML',
    titleEn: 'بعد ملاحظة الوكيل: إعادة اسم الشركة، إخلاء مسؤولية، عمودين، Pencil Studio',
    rows: [
      {
        whatAr: 'خط فاصل ثم اسم الشركة كبير في المنتصف',
        whereAr: 'قالب الفوتر',
        placeholder: '{{companyName}}',
      },
      {
        whatAr: 'جملة «You are receiving this message because … sent you an invoice»',
        whereAr: 'قالب الفوتر — اسم الشركة يتكرر',
        placeholder: '{{companyName}}',
      },
      {
        whatAr: 'العمود الأيسر: Thank you for your business + اسم الشركة + نص التجديد',
        whereAr: 'قالب الفوتر — جزء من النص ثابت، الاسم ديناميكي',
        placeholder: '{{companyName}}',
      },
      {
        whatAr: 'العمود الأيمن: اسم المهندس، Technical Agent — diPencil، التليفون، الإيميل',
        whereAr: 'قالب الفوتر — كلها نص ثابت في HTML الافتراضي (غيّرها يدوياً من حقل Footer)',
      },
      {
        whatAr: 'Pencil Studio | Technology Agents in the Middle East + الجملة الختامية',
        whereAr: 'قالب الفوتر — نص ثابت في القالب الافتراضي',
      },
    ],
  },
];

const PLACEHOLDER_RE = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;

export function applyInvoiceEmailPlaceholders(template: string, map: Record<string, string>): string {
  return template.replace(PLACEHOLDER_RE, (_, key: string) => map[key] ?? '');
}

/** Default header: logo. Edit in Settings → Invoice email template. */
export const DEFAULT_INVOICE_EMAIL_HEADER_HTML = `<tr>
  <td align="center" style="padding:32px 40px 20px;">
    <img src="https://hpanel.hostinger.com/assets/images/logos/hostinger-black.svg" alt="{{companyName}}" width="120" style="max-width:120px;height:auto;display:block;margin:0 auto;border:0;" />
  </td>
</tr>`;

/**
 * Default body: title, greeting, CTA, order summary table (headers + {{itemsTableRows}}), {{totalsBlock}}, dates, agent note.
 * Edit wording and layout; keep {{itemsTableRows}} and {{totalsBlock}} so line items and amounts stay automatic.
 */
export const DEFAULT_INVOICE_EMAIL_BODY_HTML = `<tr>
  <td style="padding:0 40px 12px;text-align:center;">
    <h1 style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:26px;font-weight:700;color:#111827;line-height:1.25;">Your invoice is ready</h1>
  </td>
</tr>
<tr>
  <td style="padding:0 40px 28px;text-align:center;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.55;color:#6b7280;">
    Hello {{clientName}}, here is a summary of your invoice. Please review the details below{{paymentNote}}
  </td>
</tr>
{{ctaRow}}
<tr>
  <td style="padding:0 40px;"><div style="height:1px;background:#e5e7eb;line-height:1px;font-size:1px;">&nbsp;</div></td>
</tr>
<tr>
  <td style="padding:28px 40px 8px;font-family:Arial,Helvetica,sans-serif;font-size:18px;font-weight:700;color:#111827;">Your order summary</td>
</tr>
<tr>
  <td style="padding:0 40px 16px;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#6b7280;">Invoice: <strong style="color:#111827;">{{invoiceNumber}}</strong></td>
</tr>
<tr>
  <td style="padding:0 40px 8px;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
      <tr>
        <th align="left" style="padding:0 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.04em;">Product</th>
        <th align="right" style="padding:0 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.04em;">Price</th>
      </tr>
      {{itemsTableRows}}
    </table>
  </td>
</tr>
{{totalsBlock}}
<tr>
  <td style="padding:0 40px 28px;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.5;color:#6b7280;">
    Issued: {{issueDate}} &middot; Due: {{dueDate}}{{nextBillingBlock}}
  </td>
</tr>
<tr>
  <td style="padding:0 40px 28px;font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:1.45;color:#6b7280;">
    If you would like assistance with renewal or have any questions, please contact our exclusive service middle east agent.
  </td>
</tr>`;

/** Default footer: divider, company name, contact columns, Pencil closing. */
export const DEFAULT_INVOICE_EMAIL_FOOTER_HTML = `<tr>
  <td style="padding:0 40px;"><div style="height:1px;background:#e5e7eb;line-height:1px;font-size:1px;">&nbsp;</div></td>
</tr>
<tr>
  <td style="padding:0 40px 28px;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
      <tr>
        <td width="50%" valign="top" style="padding:0 20px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.6;color:#6b7280;">
          <p style="margin:0 0 4px;color:#111827;font-weight:700;font-size:13px;">{{companyName}}</p>
          <p style="margin:0;">For renewal help or billing questions, contact our service team.</p>
        </td>
        <td width="50%" valign="top" style="padding:0 0 0 20px;border-left:1px solid #e5e7eb;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.4;color:#6b7280;">
          <p style="margin:0 0 2px;font-weight:700;color:#111827;font-size:13px;">Engineer Mahmoud El-Sabbagh</p>
          <p style="margin:0 0 2px;">Technical Agent &mdash; diPencil</p>
          <p style="margin:0 0 2px;">Phone: <a href="tel:+201003778273" style="color:#6d28d9;text-decoration:none;">+20 100 377 8273</a></p>
          <p style="margin:0;">Email: <a href="mailto:elsabbagh@dipencil.com" style="color:#6d28d9;text-decoration:underline;">elsabbagh@dipencil.com</a></p>
        </td>
      </tr>
    </table>
  </td>
</tr>
<tr>
  <td style="padding:0 40px;"><div style="height:1px;background:#e5e7eb;line-height:1px;font-size:1px;">&nbsp;</div></td>
</tr>
<tr>
  <td align="center" style="padding:20px 40px 36px;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.65;color:#6b7280;">
    <p style="margin:0 0 6px;font-weight:600;color:#111827;font-size:13px;">Pencil Studio <span style="color:#9ca3af;font-weight:400;">|</span> Technology Agents in the Middle East</p>
    <p style="margin:0;">Feel free to contact us for more information about our service options. Thank you for your business.</p>
  </td>
</tr>`;
