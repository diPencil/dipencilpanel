'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useInvoiceData } from '@/context/InvoiceContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { ChevronLeft, RotateCcw, Save } from 'lucide-react';
import {
  DEFAULT_INVOICE_EMAIL_BODY_HTML,
  DEFAULT_INVOICE_EMAIL_FOOTER_HTML,
  DEFAULT_INVOICE_EMAIL_HEADER_HTML,
  INVOICE_EMAIL_TEMPLATE_VARIABLES,
} from '@/lib/invoice-email-placeholders';
import {
  buildInvoiceEmailPreviewDocument,
  templateMatchesDefault,
} from '@/lib/invoice-email-preview';

function effectiveTemplate(stored: string | null | undefined, builtIn: string): string {
  return stored?.trim() || builtIn;
}

export default function InvoiceEmailTemplatePage() {
  const { company, updateCompany } = useInvoiceData();
  const [header, setHeader] = useState(DEFAULT_INVOICE_EMAIL_HEADER_HTML);
  const [body, setBody] = useState(DEFAULT_INVOICE_EMAIL_BODY_HTML);
  const [footer, setFooter] = useState(DEFAULT_INVOICE_EMAIL_FOOTER_HTML);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setHeader(effectiveTemplate(company.invoiceEmailHeaderHtml, DEFAULT_INVOICE_EMAIL_HEADER_HTML));
    setBody(effectiveTemplate(company.invoiceEmailBodyHtml, DEFAULT_INVOICE_EMAIL_BODY_HTML));
    setFooter(effectiveTemplate(company.invoiceEmailFooterHtml, DEFAULT_INVOICE_EMAIL_FOOTER_HTML));
  }, [company.invoiceEmailHeaderHtml, company.invoiceEmailBodyHtml, company.invoiceEmailFooterHtml]);

  const previewHtml = useMemo(
    () => buildInvoiceEmailPreviewDocument(header, body, footer, company.name),
    [header, body, footer, company.name],
  );

  const handleSave = () => {
    setSaving(true);
    try {
      updateCompany({
        invoiceEmailHeaderHtml: templateMatchesDefault(header, DEFAULT_INVOICE_EMAIL_HEADER_HTML)
          ? null
          : header.trim() || null,
        invoiceEmailBodyHtml: templateMatchesDefault(body, DEFAULT_INVOICE_EMAIL_BODY_HTML)
          ? null
          : body.trim() || null,
        invoiceEmailFooterHtml: templateMatchesDefault(footer, DEFAULT_INVOICE_EMAIL_FOOTER_HTML)
          ? null
          : footer.trim() || null,
      });
      toast.success('Invoice email template saved');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-[1600px]">
      <div className="flex flex-col gap-2">
        <Button asChild variant="ghost" size="sm" className="w-fit gap-2 -ml-2">
          <Link href="/dashboard/settings">
            <ChevronLeft className="h-4 w-4" />
            Back to Settings
          </Link>
        </Button>
        <h1 className="text-3xl font-bold">Invoice email template</h1>
        <p className="text-muted-foreground max-w-3xl">
          Edit the HTML for each section of the invoice notification email. The fields are pre-filled with the current
          defaults — change any wording, layout, or style and click <strong>Save template</strong>. Use{' '}
          <code className="text-xs bg-muted px-1 rounded">{'{{placeholder}}'}</code> variables to inject live invoice
          data.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_minmax(340px,480px)] gap-6 items-start">
        <div className="space-y-6 min-w-0 max-w-4xl">

          <Card className="p-5 border-amber-500/30 bg-amber-500/5">
            <h2 className="font-semibold text-sm mb-2">Available placeholders</h2>
            <p className="text-xs text-muted-foreground mb-3">
              Wrap in double curly braces, e.g.{' '}
              <code className="bg-muted px-1 rounded">{'{{companyName}}'}</code>.
            </p>
            <ul className="text-xs text-muted-foreground grid sm:grid-cols-2 gap-x-6 gap-y-1">
              {INVOICE_EMAIL_TEMPLATE_VARIABLES.map((v) => (
                <li key={v.key}>
                  <code className="text-foreground font-mono">{`{{${v.key}}}`}</code> — {v.description}
                </li>
              ))}
            </ul>
            <p className="text-xs mt-3 font-medium text-amber-900 dark:text-amber-200">
              Keep <code className="bg-muted px-1 rounded font-mono">{'{{itemsTableRows}}'}</code> and{' '}
              <code className="bg-muted px-1 rounded font-mono">{'{{totalsBlock}}'}</code> inside the Body to render
              invoice line items and totals.
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              All sections are <code className="bg-muted px-1 rounded">&lt;tr&gt;…&lt;/tr&gt;</code> fragments inside
              the white card table. Use inline CSS for best Gmail / Outlook compatibility.
            </p>
          </Card>

          <Card className="p-6 space-y-4">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <Label className="text-base font-semibold">Header HTML</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1"
                onClick={() => {
                  setHeader(DEFAULT_INVOICE_EMAIL_HEADER_HTML);
                  toast.message('Header reset — click Save to persist');
                }}
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reset to default
              </Button>
            </div>
            <textarea
              className="w-full min-h-[220px] font-mono text-xs p-3 rounded-md border border-input bg-background"
              value={header}
              onChange={(e) => setHeader(e.target.value)}
              spellCheck={false}
            />
            <p className="text-xs text-muted-foreground">
              Shown at the very top of the white email card (company name + logo area).
            </p>
          </Card>

          <Card className="p-6 space-y-4">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <Label className="text-base font-semibold">Body HTML</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1"
                onClick={() => {
                  setBody(DEFAULT_INVOICE_EMAIL_BODY_HTML);
                  toast.message('Body reset — click Save to persist');
                }}
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reset to default
              </Button>
            </div>
            <textarea
              className="w-full min-h-[380px] font-mono text-xs p-3 rounded-md border border-input bg-background"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              spellCheck={false}
            />
            <p className="text-xs text-muted-foreground">
              Title, greeting, CTA button, line-items table, totals, dates and agent note. Keep{' '}
              <code className="bg-muted px-1 rounded font-mono text-[11px]">{'{{itemsTableRows}}'}</code> and{' '}
              <code className="bg-muted px-1 rounded font-mono text-[11px]">{'{{totalsBlock}}'}</code> to show real
              invoice data when sending.
            </p>
          </Card>

          <Card className="p-6 space-y-4">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <Label className="text-base font-semibold">Footer HTML</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1"
                onClick={() => {
                  setFooter(DEFAULT_INVOICE_EMAIL_FOOTER_HTML);
                  toast.message('Footer reset — click Save to persist');
                }}
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reset to default
              </Button>
            </div>
            <textarea
              className="w-full min-h-[340px] font-mono text-xs p-3 rounded-md border border-input bg-background"
              value={footer}
              onChange={(e) => setFooter(e.target.value)}
              spellCheck={false}
            />
            <p className="text-xs text-muted-foreground">
              Shown below the body — disclaimer, two-column contact block, and closing.
            </p>
          </Card>

          <div className="flex flex-wrap gap-3">
            <Button onClick={handleSave} disabled={saving} className="gap-2">
              <Save className="h-4 w-4" />
              {saving ? 'Saving…' : 'Save template'}
            </Button>
            <Button asChild variant="outline">
              <Link href="/dashboard/settings">Cancel</Link>
            </Button>
          </div>
        </div>

        <Card className="p-4 xl:sticky xl:top-4 space-y-3 shadow-md border-2 border-dashed border-primary/20">
          <div>
            <h2 className="font-semibold text-sm">Live preview</h2>
            <p className="text-[11px] text-muted-foreground mt-1 leading-snug">
              Sample data (client: Pencil Studio, invoice: INV-2026-0001, one line item). Updates instantly as you
              edit. Company name comes from your workspace settings.
            </p>
          </div>
          <div className="rounded-lg border bg-muted/40 overflow-hidden">
            <iframe
              title="Invoice email live preview"
              className="w-full bg-white"
              style={{ height: 'min(85vh, 920px)', minHeight: 480 }}
              srcDoc={previewHtml}
              sandbox=""
            />
          </div>
        </Card>
      </div>
    </div>
  );
}
