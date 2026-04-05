'use client';

import React, { useEffect, useState } from 'react';
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
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { REGISTRAR_NAMESERVERS } from '@/lib/constants';

const REGISTRARS = Object.keys(REGISTRAR_NAMESERVERS);

export interface EditDomainDNSDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  domainId: string | null;
}

export function EditDomainDNSDialog({ open, onOpenChange, domainId }: EditDomainDNSDialogProps) {
  const { getDomain, updateDomain } = useInvoiceData();
  const domain = domainId ? getDomain(domainId) : undefined;

  const [nameservers, setNameservers] = useState<string[]>(['', '']);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!domain) return;
    const ns = domain.nameservers ?? [];
    // Always show at least 2 rows
    setNameservers(ns.length >= 2 ? [...ns] : [...ns, ...Array(2 - ns.length).fill('')]);
  }, [domain, open]);

  const set = (idx: number, val: string) =>
    setNameservers((prev) => prev.map((v, i) => (i === idx ? val : v)));

  const addRow = () => setNameservers((prev) => [...prev, '']);

  const remove = (idx: number) =>
    setNameservers((prev) => prev.filter((_, i) => i !== idx));

  const autofill = (registrar: string) => {
    const ns = REGISTRAR_NAMESERVERS[registrar];
    if (ns) setNameservers([...ns]);
  };

  const handleSave = async () => {
    if (!domain) return;
    const cleaned = nameservers.map((s) => s.trim()).filter(Boolean);
    setSaving(true);
    try {
      await updateDomain(domain.id, { nameservers: cleaned });
      toast.success('Nameservers updated');
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  if (!domain) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit nameservers</DialogTitle>
          <DialogDescription>
            {domain.name}{domain.tld} — update the DNS nameservers for this domain.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Quick autofill */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">
              Quick autofill from registrar
            </Label>
            <div className="flex flex-wrap gap-1.5">
              {REGISTRARS.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => autofill(r)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-dashed border-border text-xs text-muted-foreground hover:border-primary hover:text-primary hover:bg-primary/5 transition-colors"
                >
                  <RotateCcw className="h-3 w-3" />
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* Nameserver rows */}
          <div className="space-y-2">
            <Label>Nameservers</Label>
            {nameservers.map((ns, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <Badge variant="outline" className="shrink-0 text-xs w-6 h-6 flex items-center justify-center p-0 rounded-full">
                  {idx + 1}
                </Badge>
                <Input
                  value={ns}
                  onChange={(e) => set(idx, e.target.value)}
                  placeholder={`ns${idx + 1}.example.com`}
                  className="font-mono text-sm"
                />
                {nameservers.length > 2 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                    onClick={() => remove(idx)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs"
              onClick={addRow}
            >
              <Plus className="h-3.5 w-3.5" />
              Add nameserver
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={() => void handleSave()} disabled={saving}>
            {saving ? 'Saving…' : 'Save nameservers'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
