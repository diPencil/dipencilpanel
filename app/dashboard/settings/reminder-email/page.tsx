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
  DEFAULT_REMINDER_EMAIL_BODY_HTML,
  DEFAULT_REMINDER_EMAIL_FOOTER_HTML,
  DEFAULT_REMINDER_EMAIL_HEADER_HTML,
  REMINDER_EMAIL_TEMPLATE_VARIABLES,
} from '@/lib/reminder-email-template';
import {
  buildReminderEmailPreviewDocument,
  templateMatchesDefault,
} from '@/lib/reminder-email-preview';

function effectiveTemplate(stored: string | null | undefined, builtIn: string): string {
  return stored?.trim() || builtIn;
}

export default function ReminderEmailTemplatePage() {
  const { company, updateCompany } = useInvoiceData();
  const [header, setHeader] = useState(DEFAULT_REMINDER_EMAIL_HEADER_HTML);
  const [body, setBody] = useState(DEFAULT_REMINDER_EMAIL_BODY_HTML);
  const [footer, setFooter] = useState(DEFAULT_REMINDER_EMAIL_FOOTER_HTML);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setHeader(
      effectiveTemplate(company.reminderEmailHeaderHtml, DEFAULT_REMINDER_EMAIL_HEADER_HTML),
    );
    setBody(effectiveTemplate(company.reminderEmailBodyHtml, DEFAULT_REMINDER_EMAIL_BODY_HTML));
    setFooter(
      effectiveTemplate(company.reminderEmailFooterHtml, DEFAULT_REMINDER_EMAIL_FOOTER_HTML),
    );
  }, [
    company.reminderEmailHeaderHtml,
    company.reminderEmailBodyHtml,
    company.reminderEmailFooterHtml,
  ]);

  const previewHtml = useMemo(
    () => buildReminderEmailPreviewDocument(header, body, footer, company.name),
    [header, body, footer, company.name],
  );

  const handleSave = () => {
    setSaving(true);
    try {
      updateCompany({
        reminderEmailHeaderHtml: templateMatchesDefault(header, DEFAULT_REMINDER_EMAIL_HEADER_HTML)
          ? null
          : header.trim() || null,
        reminderEmailBodyHtml: templateMatchesDefault(body, DEFAULT_REMINDER_EMAIL_BODY_HTML)
          ? null
          : body.trim() || null,
        reminderEmailFooterHtml: templateMatchesDefault(footer, DEFAULT_REMINDER_EMAIL_FOOTER_HTML)
          ? null
          : footer.trim() || null,
      });
      toast.success('Reminder email template saved');
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
        <h1 className="text-3xl font-bold">Reminder email template</h1>
        <p className="text-muted-foreground max-w-3xl">
          Edit the HTML for subscription renewal reminders sent from{' '}
          <strong>Subscription Reminders</strong>. The service details table (type, name, expiry, price) is built
          automatically — keep <code className="text-xs bg-muted px-1 rounded">{'{{serviceDetailsTable}}'}</code> in
          the Body where the box should appear.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_minmax(340px,480px)] gap-6 items-start">
        <div className="space-y-6 min-w-0 max-w-4xl">
          <Card className="p-5 border-amber-500/30 bg-amber-500/5">
            <h2 className="font-semibold text-sm mb-2">Available placeholders</h2>
            <p className="text-xs text-muted-foreground mb-3">
              Wrap in double curly braces, e.g.{' '}
              <code className="bg-muted px-1 rounded">{'{{clientName}}'}</code>.
            </p>
            <ul className="text-xs text-muted-foreground grid sm:grid-cols-2 gap-x-6 gap-y-1">
              {REMINDER_EMAIL_TEMPLATE_VARIABLES.map((v) => (
                <li key={v.key}>
                  <code className="text-foreground font-mono">{`{{${v.key}}}`}</code> — {v.description}
                </li>
              ))}
            </ul>
            <p className="text-xs mt-3 font-medium text-amber-900 dark:text-amber-200">
              Keep <code className="bg-muted px-1 rounded font-mono">{'{{serviceDetailsTable}}'}</code> in the Body
              unless you replace it with your own HTML table.
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Sections are <code className="bg-muted px-1 rounded">&lt;tr&gt;…&lt;/tr&gt;</code> fragments inside the
              white card. Use inline CSS for email clients.
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
                  setHeader(DEFAULT_REMINDER_EMAIL_HEADER_HTML);
                  toast.message('Header reset — click Save to persist');
                }}
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reset to default
              </Button>
            </div>
            <textarea
              className="w-full min-h-[180px] font-mono text-xs p-3 rounded-md border border-input bg-background"
              value={header}
              onChange={(e) => setHeader(e.target.value)}
              spellCheck={false}
            />
            <p className="text-xs text-muted-foreground">
              Top of the card — usually the logo (<code className="bg-muted px-1 rounded text-[11px]">{'{{logoBlock}}'}</code>).
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
                  setBody(DEFAULT_REMINDER_EMAIL_BODY_HTML);
                  toast.message('Body reset — click Save to persist');
                }}
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reset to default
              </Button>
            </div>
            <textarea
              className="w-full min-h-[360px] font-mono text-xs p-3 rounded-md border border-input bg-background"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              spellCheck={false}
            />
            <p className="text-xs text-muted-foreground">
              Urgency bar uses <code className="bg-muted px-1 rounded text-[11px]">{'{{urgencyColor}}'}</code> and{' '}
              <code className="bg-muted px-1 rounded text-[11px]">{'{{urgencyLabel}}'}</code>. Greeting uses{' '}
              <code className="bg-muted px-1 rounded text-[11px]">{'{{clientName}}'}</code>,{' '}
              <code className="bg-muted px-1 rounded text-[11px]">{'{{serviceLabel}}'}</code>, etc.
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
                  setFooter(DEFAULT_REMINDER_EMAIL_FOOTER_HTML);
                  toast.message('Footer reset — click Save to persist');
                }}
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reset to default
              </Button>
            </div>
            <textarea
              className="w-full min-h-[220px] font-mono text-xs p-3 rounded-md border border-input bg-background"
              value={footer}
              onChange={(e) => setFooter(e.target.value)}
              spellCheck={false}
            />
            <p className="text-xs text-muted-foreground">
              You can use <code className="bg-muted px-1 rounded text-[11px]">{'{{companyName}}'}</code>,{' '}
              <code className="bg-muted px-1 rounded text-[11px]">{'{{companyEmail}}'}</code>,{' '}
              <code className="bg-muted px-1 rounded text-[11px]">{'{{companyPhone}}'}</code> for dynamic lines if you
              add them to the template.
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
              Sample hosting reminder (Pencil Studio, expires in 5 days). Updates as you edit.
            </p>
          </div>
          <div className="rounded-lg border bg-muted/40 overflow-hidden">
            <iframe
              title="Reminder email live preview"
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
