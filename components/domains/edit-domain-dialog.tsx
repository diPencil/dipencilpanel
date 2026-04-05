'use client';

import React, { useEffect, useId, useState } from 'react';
import { useInvoiceData } from '@/context/InvoiceContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { REGISTRAR_NAMESERVERS } from '@/lib/constants';

const REGISTRARS = Object.keys(REGISTRAR_NAMESERVERS);

function toInputDate(d: string | Date) {
  const dt = new Date(d);
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const day = String(dt.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export interface EditDomainDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  domainId: string | null;
}

export function EditDomainDialog({ open, onOpenChange, domainId }: EditDomainDialogProps) {
  const id = useId();
  const { getDomain, updateDomain, clients = [] } = useInvoiceData();
  const domain = domainId ? getDomain(domainId) : undefined;

  const [registrar, setRegistrar] = useState('');
  const [status, setStatus] = useState<'active' | 'expiring' | 'expired' | 'suspended'>('active');
  const [expiryDate, setExpiryDate] = useState('');
  const [autoRenew, setAutoRenew] = useState(true);
  const [planName, setPlanName] = useState('');
  const [price, setPrice] = useState('');
  const [clientId, setClientId] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!domain) return;
    setRegistrar(domain.registrar ?? 'Hostinger');
    setStatus(domain.status ?? 'active');
    setExpiryDate(toInputDate(domain.expiryDate));
    setAutoRenew(domain.autoRenew ?? true);
    setPlanName(domain.planName ?? '');
    setPrice(String(domain.price ?? ''));
    setClientId(domain.clientId ?? '');
    setNotes(domain.notes ?? '');
  }, [domain, open]);

  const handleSave = async () => {
    if (!domain) return;
    setSaving(true);
    try {
      await updateDomain(domain.id, {
        registrar,
        status,
        expiryDate: new Date(expiryDate).toISOString(),
        autoRenew,
        planName,
        price: parseFloat(price) || 0,
        clientId,
        notes,
      });
      toast.success('Domain updated');
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  if (!domain) return null;

  const domainFull = `${domain.name}${domain.tld}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit domain</DialogTitle>
          <DialogDescription>{domainFull}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          {/* Client */}
          <div className="grid gap-1.5">
            <Label htmlFor={`${id}-client`}>Client</Label>
            <Select value={clientId} onValueChange={setClientId}>
              <SelectTrigger id={`${id}-client`}>
                <SelectValue placeholder="Select client" />
              </SelectTrigger>
              <SelectContent>
                {clients.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Registrar */}
          <div className="grid gap-1.5">
            <Label htmlFor={`${id}-registrar`}>Registrar</Label>
            <Select value={registrar} onValueChange={setRegistrar}>
              <SelectTrigger id={`${id}-registrar`}>
                <SelectValue placeholder="Select registrar" />
              </SelectTrigger>
              <SelectContent>
                {REGISTRARS.map((r) => (
                  <SelectItem key={r} value={r}>{r}</SelectItem>
                ))}
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Status */}
          <div className="grid gap-1.5">
            <Label htmlFor={`${id}-status`}>Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
              <SelectTrigger id={`${id}-status`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="expiring">Expiring soon</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Expiry date + Price row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor={`${id}-expiry`}>Expiry date</Label>
              <Input
                id={`${id}-expiry`}
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor={`${id}-price`}>Price (USD/yr)</Label>
              <Input
                id={`${id}-price`}
                type="number"
                min="0"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
            </div>
          </div>

          {/* Plan name */}
          <div className="grid gap-1.5">
            <Label htmlFor={`${id}-plan`}>Plan name</Label>
            <Input
              id={`${id}-plan`}
              value={planName}
              onChange={(e) => setPlanName(e.target.value)}
              placeholder="e.g. Web: Single"
            />
          </div>

          {/* Auto renew */}
          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div>
              <p className="text-sm font-medium">Auto-renew</p>
              <p className="text-xs text-muted-foreground">Automatically renew before expiry</p>
            </div>
            <Switch checked={autoRenew} onCheckedChange={setAutoRenew} />
          </div>

          {/* Notes */}
          <div className="grid gap-1.5">
            <Label htmlFor={`${id}-notes`}>Notes</Label>
            <Textarea
              id={`${id}-notes`}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Internal notes..."
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={() => void handleSave()} disabled={saving}>
            {saving ? 'Saving…' : 'Save changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
