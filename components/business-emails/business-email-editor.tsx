'use client';

import React, { useState, useEffect } from 'react';
import { useInvoiceData } from '@/context/InvoiceContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { FileText, Handshake, Rocket, MessageSquare } from 'lucide-react';
import {
  createBusinessEmail,
  updateBusinessEmail,
  type BusinessEmailRecord,
  type BusinessEmailType,
} from '@/app/actions/business-emails';

export const EMAIL_TYPES: {
  value: BusinessEmailType;
  label: string;
  icon: React.ReactNode;
  color: string;
}[] = [
  {
    value: 'quotation',
    label: 'Quotation',
    icon: <FileText className="h-4 w-4" />,
    color: 'text-blue-600 bg-blue-50 border-blue-200',
  },
  {
    value: 'contract',
    label: 'Contract',
    icon: <Handshake className="h-4 w-4" />,
    color: 'text-purple-600 bg-purple-50 border-purple-200',
  },
  {
    value: 'project_start',
    label: 'Project Start',
    icon: <Rocket className="h-4 w-4" />,
    color: 'text-green-600 bg-green-50 border-green-200',
  },
  {
    value: 'custom',
    label: 'Custom Email',
    icon: <MessageSquare className="h-4 w-4" />,
    color: 'text-gray-600 bg-gray-50 border-gray-200',
  },
];

export const TEMPLATES: Record<BusinessEmailType, { subject: string; body: string }> = {
  quotation: {
    subject: 'Service Quotation — [Client Name]',
    body: `Dear [Client Name],

Thank you for your interest in our services. We are pleased to provide you with the following quotation:

Services Included:
- [Service 1] — $[Price]
- [Service 2] — $[Price]

Total: $[Total Amount]
Validity: This quote is valid for 30 days from the date of this email.

Payment Terms: 50% upfront, 50% upon completion.

Please don't hesitate to reach out if you have any questions or need adjustments.

Visual art engineer Mahmoud Elsabbagh @Pencil Studio Team.`,
  },
  contract: {
    subject: 'Service Agreement — [Client Name]',
    body: `Dear [Client Name],

We are pleased to move forward with our agreement for the services outlined below.

Agreement Summary:
- Services: [Service Description]
- Duration: [Start Date] to [End Date]
- Total Value: $[Amount]
- Payment Schedule: [Payment Terms]

Terms & Conditions:
1. All work will be completed as per the agreed scope.
2. Any additional requirements will be quoted separately.
3. Client feedback must be provided within [X] business days.

Please review and confirm your acceptance by replying to this email, if you have any questions follow our Studio mail: info@dipencil.com

Visual art engineer Mahmoud Elsabbagh @Pencil Studio Team.`,
  },
  project_start: {
    subject: 'Project Kick-off — [Project Name]',
    body: `Dear [Client Name],

We are excited to officially kick off your project. Here are the key details:

Project Overview:
- Project: [Project Name]
- Start Date: [Date]
- Expected Completion: [Date]
- Project Manager: [Name]

Timeline & Milestones:
1. [Milestone 1] — [Date]
2. [Milestone 2] — [Date]
3. [Milestone 3] — [Date]

Deliverables:
- [Deliverable 1]
- [Deliverable 2]

Communication: We will provide weekly progress updates. Please feel free to reach out at any time.

Visual art engineer Mahmoud Elsabbagh @Pencil Studio Team.`,
  },
  custom: {
    subject: '',
    body: '',
  },
};

export function BusinessEmailEditor({
  email,
  companyId,
  onSaved,
  onCancel,
  syncKey,
}: {
  email: BusinessEmailRecord | null;
  companyId: string;
  onSaved: (email: BusinessEmailRecord) => void;
  onCancel: () => void;
  /** Re-sync form state when dialog opens or record changes */
  syncKey?: string | number | boolean;
}) {
  const { clients } = useInvoiceData();
  const [type, setType] = useState<BusinessEmailType>(email?.type ?? 'quotation');
  const [clientId, setClientId] = useState<string>(email?.clientId ?? 'none');
  const [subject, setSubject] = useState(email?.subject ?? '');
  const [body, setBody] = useState(email?.body ?? '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setType(email?.type ?? 'quotation');
    setClientId(email?.clientId ? email.clientId : 'none');
    setSubject(email?.subject ?? '');
    setBody(email?.body ?? '');
  }, [syncKey, email]);

  const applyTemplate = (t: BusinessEmailType) => {
    setType(t);
    if (!email) {
      setSubject(TEMPLATES[t].subject);
      setBody(TEMPLATES[t].body);
    }
  };

  const resetToTemplate = () => {
    if (TEMPLATES[type].body) {
      setSubject(TEMPLATES[type].subject || subject);
      setBody(TEMPLATES[type].body);
    }
  };

  const handleSave = async () => {
    if (!subject.trim()) {
      toast.error('Subject is required');
      return;
    }
    setSaving(true);
    try {
      const input = {
        clientId: clientId === 'none' ? null : clientId,
        type,
        subject: subject.trim(),
        body: body.trim(),
      };
      if (email) {
        const res = await updateBusinessEmail(email.id, companyId, input);
        if (res.success && res.data) {
          onSaved(res.data);
          toast.success('Email updated');
        } else toast.error(res.error);
      } else {
        const res = await createBusinessEmail({ ...input, companyId });
        if (res.success && res.data) {
          onSaved(res.data);
          toast.success('Email saved as draft');
        } else toast.error(res.error);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="space-y-4 py-1">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {EMAIL_TYPES.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => applyTemplate(t.value)}
              className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border text-xs font-medium transition-all ${type === t.value ? `${t.color} ring-2 ring-primary` : 'border-border hover:bg-muted/60'}`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Client
            </Label>
            <Select value={clientId} onValueChange={setClientId}>
              <SelectTrigger>
                <SelectValue placeholder="Select client" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">
                  <span className="text-muted-foreground">No client</span>
                </SelectItem>
                {clients.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Type
            </Label>
            <Select value={type} onValueChange={(v) => applyTemplate(v as BusinessEmailType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EMAIL_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label
            htmlFor="be-subject"
            className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
          >
            Subject
          </Label>
          <Input
            id="be-subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Email subject…"
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label
              htmlFor="be-body"
              className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
            >
              Message
            </Label>
            {type !== 'custom' && (
              <button
                type="button"
                onClick={resetToTemplate}
                className="text-xs text-primary hover:underline flex items-center gap-1 opacity-70 hover:opacity-100 transition-opacity"
              >
                ↺ Reset to template
              </button>
            )}
          </div>
          <textarea
            id="be-body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={14}
            placeholder="Write your message here…"
            className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm leading-relaxed resize-y focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 font-mono"
          />
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-4 border-t border-border mt-4">
        <Button variant="outline" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          <FileText className="h-4 w-4" />
          {saving ? 'Saving…' : 'Save Draft'}
        </Button>
      </div>
    </>
  );
}
