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
import type { Subscription } from '@/lib/types';

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

function addBillingPeriod(start: Date, cycle: Subscription['billingCycle']) {
  const end = new Date(start);
  if (cycle === 'yearly') end.setFullYear(end.getFullYear() + 1);
  else end.setMonth(end.getMonth() + 1);
  return end;
}

export type RenewSubscriptionDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subscriptionId: string | null;
  /** Shown in the description (e.g. service name) */
  serviceName: string;
  /** Called after a successful renewal (e.g. refetch list) */
  onSuccess?: () => void;
};

export function RenewSubscriptionDialog({
  open,
  onOpenChange,
  subscriptionId,
  serviceName,
  onSuccess,
}: RenewSubscriptionDialogProps) {
  const formId = useId();
  const { getSubscription, renewSubscriptionWithSchedule } = useInvoiceData();
  const [renewCycle, setRenewCycle] = useState<Subscription['billingCycle']>('monthly');
  const [renewIssue, setRenewIssue] = useState('');
  const [renewDue, setRenewDue] = useState('');
  const [renewExpire, setRenewExpire] = useState('');
  const [renewSubmitting, setRenewSubmitting] = useState(false);

  const resetFormForSubscription = useCallback(
    (subId: string) => {
      const sub = getSubscription(subId);
      const cycle: Subscription['billingCycle'] =
        sub?.billingCycle === 'yearly' ? 'yearly' : 'monthly';
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      setRenewCycle(cycle);
      setRenewIssue(toInputDate(today));
      setRenewDue(toInputDate(addDays(today, 7)));
      setRenewExpire(toInputDate(addBillingPeriod(today, cycle)));
    },
    [getSubscription],
  );

  useEffect(() => {
    if (open && subscriptionId) {
      resetFormForSubscription(subscriptionId);
    }
  }, [open, subscriptionId, resetFormForSubscription]);

  const handleRenewCycleChange = (value: Subscription['billingCycle']) => {
    setRenewCycle(value);
    const start = new Date(`${renewIssue}T12:00:00`);
    if (!isNaN(start.getTime())) {
      setRenewExpire(toInputDate(addBillingPeriod(start, value)));
    }
  };

  const handleConfirm = async () => {
    if (!subscriptionId) return;
    setRenewSubmitting(true);
    const ok = await renewSubscriptionWithSchedule(subscriptionId, {
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Renew subscription</DialogTitle>
          <DialogDescription>
            {serviceName
              ? `${serviceName} — creates a renewal invoice and sets the subscription to active with the new end date.`
              : 'Creates a renewal invoice and sets the subscription to active with the new end date.'}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label>Billing period</Label>
            <Select
              value={renewCycle}
              onValueChange={(v) => handleRenewCycleChange(v as Subscription['billingCycle'])}
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
