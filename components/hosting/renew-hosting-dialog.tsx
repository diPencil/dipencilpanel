'use client';

import React, { useCallback, useEffect, useId, useState } from 'react';
import { useInvoiceData } from '@/context/InvoiceContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Hosting } from '@/lib/types';

function toInputDate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function addBillingPeriod(start: Date, cycle: Hosting['billingCycle']) {
  const end = new Date(start);
  if (cycle === 'yearly') end.setFullYear(end.getFullYear() + 1);
  else end.setMonth(end.getMonth() + 1);
  return end;
}

export type RenewHostingDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hostingId: string | null;
  onSuccess?: () => void;
};

export function RenewHostingDialog({
  open,
  onOpenChange,
  hostingId,
  onSuccess,
}: RenewHostingDialogProps) {
  const formId = useId();
  const { getHosting, renewHostingWithSchedule } = useInvoiceData();
  const [renewCycle, setRenewCycle] = useState<Hosting['billingCycle']>('monthly');
  const [renewIssue, setRenewIssue] = useState('');
  const [renewDue, setRenewDue] = useState('');
  const [renewExpire, setRenewExpire] = useState('');
  const [renewSubmitting, setRenewSubmitting] = useState(false);

  const resetFormForHosting = useCallback(
    (hid: string) => {
      const host = getHosting(hid);
      const cycle: Hosting['billingCycle'] =
        host?.billingCycle === 'yearly' ? 'yearly' : 'monthly';
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      setRenewCycle(cycle);
      setRenewIssue(toInputDate(today));
      setRenewDue(toInputDate(addDays(today, 7)));
      setRenewExpire(toInputDate(addBillingPeriod(today, cycle)));
    },
    [getHosting],
  );

  useEffect(() => {
    if (open && hostingId) {
      resetFormForHosting(hostingId);
    }
  }, [open, hostingId, resetFormForHosting]);

  const handleRenewCycleChange = (value: Hosting['billingCycle']) => {
    setRenewCycle(value);
    const start = new Date(`${renewIssue}T12:00:00`);
    if (!Number.isNaN(start.getTime())) {
      setRenewExpire(toInputDate(addBillingPeriod(start, value)));
    }
  };

  const handleConfirm = async () => {
    if (!hostingId) return;
    setRenewSubmitting(true);
    const ok = await renewHostingWithSchedule(hostingId, {
      billingCycle: renewCycle,
      issueDate: renewIssue,
      dueDate: renewDue,
      expiryDate: renewExpire,
    });
    setRenewSubmitting(false);
    if (ok) {
      onOpenChange(false);
      onSuccess?.();
    }
  };

  const host = hostingId ? getHosting(hostingId) : undefined;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Renew hosting</DialogTitle>
          <DialogDescription>
            {host
              ? `${host.name} — creates a renewal invoice and sets the account to active with the new expiry date.`
              : 'Creates a renewal invoice and sets the hosting account to active with the new expiry date.'}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label>Billing period</Label>
            <Select
              value={renewCycle}
              onValueChange={(v) => handleRenewCycleChange(v as Hosting['billingCycle'])}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="yearly">Yearly</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor={`${formId}-issue`}>Issue date</Label>
            <Input
              id={`${formId}-issue`}
              type="date"
              value={renewIssue}
              onChange={(e) => setRenewIssue(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor={`${formId}-due`}>Due date</Label>
            <Input
              id={`${formId}-due`}
              type="date"
              value={renewDue}
              onChange={(e) => setRenewDue(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor={`${formId}-expire`}>Expire date</Label>
            <Input
              id={`${formId}-expire`}
              type="date"
              value={renewExpire}
              onChange={(e) => setRenewExpire(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={renewSubmitting}
          >
            Cancel
          </Button>
          <Button type="button" onClick={() => void handleConfirm()} disabled={renewSubmitting}>
            {renewSubmitting ? 'Saving…' : 'Create invoice & renew'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
