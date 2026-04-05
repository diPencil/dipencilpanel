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

type BillingCycle = 'monthly' | 'yearly';

function addBillingPeriod(start: Date, cycle: BillingCycle) {
  const end = new Date(start);
  if (cycle === 'yearly') end.setFullYear(end.getFullYear() + 1);
  else end.setMonth(end.getMonth() + 1);
  return end;
}

export type RenewDomainDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  domainId: string | null;
  domainName: string;
  onSuccess?: () => void;
};

export function RenewDomainDialog({
  open,
  onOpenChange,
  domainId,
  domainName,
  onSuccess,
}: RenewDomainDialogProps) {
  const formId = useId();
  const { renewDomainWithSchedule } = useInvoiceData();
  const [cycle, setCycle] = useState<BillingCycle>('yearly');
  const [issueDate, setIssueDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [expireDate, setExpireDate] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const reset = useCallback(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    setCycle('yearly');
    setIssueDate(toInputDate(today));
    setDueDate(toInputDate(addDays(today, 7)));
    setExpireDate(toInputDate(addBillingPeriod(today, 'yearly')));
  }, []);

  useEffect(() => {
    if (open) reset();
  }, [open, reset]);

  const handleCycleChange = (value: BillingCycle) => {
    setCycle(value);
    const start = new Date(`${issueDate}T12:00:00`);
    if (!isNaN(start.getTime())) {
      setExpireDate(toInputDate(addBillingPeriod(start, value)));
    }
  };

  const handleConfirm = async () => {
    if (!domainId) return;
    setSubmitting(true);
    const ok = await renewDomainWithSchedule(domainId, {
      billingCycle: cycle,
      issueDate,
      dueDate,
      expiryDate: expireDate,
    });
    setSubmitting(false);
    if (ok) {
      onOpenChange(false);
      onSuccess?.();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Renew domain</DialogTitle>
          <DialogDescription>
            {domainName
              ? `${domainName} — creates a renewal invoice and updates the domain expiry date.`
              : 'Creates a renewal invoice and updates the domain expiry date.'}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label>Billing period</Label>
            <Select value={cycle} onValueChange={(v) => handleCycleChange(v as BillingCycle)}>
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
              value={issueDate}
              onChange={(e) => setIssueDate(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor={`${formId}-due`}>Due date</Label>
            <Input
              id={`${formId}-due`}
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor={`${formId}-expire`}>Expire date</Label>
            <Input
              id={`${formId}-expire`}
              type="date"
              value={expireDate}
              onChange={(e) => setExpireDate(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={() => void handleConfirm()} disabled={submitting}>
            {submitting ? 'Saving…' : 'Create invoice & renew'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
