'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { downloadTextFile, delay, rowsToCsv, safeJsonStringify } from '@/lib/dashboard-export';
import { toast } from 'sonner';
import type {
  Client,
  Domain,
  Email,
  Hosting,
  Invoice,
  MobileApp,
  Payment,
  Subscription,
  VPS,
  Website,
} from '@/lib/types';

export type DashboardExportPayload = {
  invoices: Invoice[];
  clients: Client[];
  subscriptions: Subscription[];
  domains: Domain[];
  websites: Website[];
  hosting: Hosting[];
  vps: VPS[];
  emails: Email[];
  payments: Payment[];
  mobileApps: MobileApp[];
};

type ExportKey = keyof DashboardExportPayload;

const LABELS: Record<ExportKey, string> = {
  invoices: 'Invoices',
  clients: 'Clients',
  subscriptions: 'Subscriptions',
  domains: 'Domains',
  websites: 'Websites',
  hosting: 'Hosting',
  vps: 'VPS',
  emails: 'Email accounts',
  payments: 'Payments',
  mobileApps: 'Mobile apps',
};

function stampName(prefix: string, ext: string) {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const ts = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}`;
  return `${prefix}-${ts}.${ext}`;
}

export function DashboardExportDialog({
  open,
  onOpenChange,
  data,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: DashboardExportPayload;
}) {
  const options = useMemo(() => {
    return (Object.keys(LABELS) as ExportKey[]).map((key) => ({
      key,
      label: LABELS[key],
      count: data[key]?.length ?? 0,
    }));
  }, [data]);

  const [selected, setSelected] = useState<Set<ExportKey>>(() => new Set());
  const [format, setFormat] = useState<'json' | 'csv'>('json');
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    if (open) {
      setSelected(new Set());
      setFormat('json');
    }
  }, [open]);

  const toggle = (key: ExportKey, checked: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(key);
      else next.delete(key);
      return next;
    });
  };

  const selectAllWithData = () => {
    const next = new Set<ExportKey>();
    for (const { key, count } of options) {
      if (count > 0) next.add(key);
    }
    setSelected(next);
  };

  const handleExport = async () => {
    if (selected.size === 0) {
      toast.error('Choose at least one dataset to export.');
      return;
    }
    if (isExporting) return;
    setIsExporting(true);

    try {
      if (format === 'json') {
        const payload: Record<string, unknown> = {
          exportedAt: new Date().toISOString(),
        };
        for (const key of selected) {
          payload[key] = data[key] ?? [];
        }
        const json = safeJsonStringify(payload, 2);
        downloadTextFile(
          stampName('dashboard-export', 'json'),
          json,
          'application/json;charset=utf-8',
        );
        toast.success('Export downloaded (JSON).');
        onOpenChange(false);
        return;
      }

      // CSV: one file per selected table (pause between saves — avoids browser blocking 2+ downloads)
      let files = 0;
      let isFirstFile = true;
      for (const key of selected) {
        const rows = data[key] ?? [];
        if (rows.length === 0) continue;
        const csv = rowsToCsv(rows as unknown as Record<string, unknown>[]);
        if (!csv) continue;
        if (!isFirstFile) {
          await delay(280);
        }
        isFirstFile = false;
        downloadTextFile(
          stampName(`${String(key)}-export`, 'csv'),
          `\uFEFF${csv}`,
          'text/csv;charset=utf-8',
        );
        files += 1;
      }
      if (files === 0) {
        toast.error('Selected datasets are empty — nothing to export as CSV.');
        return;
      }
      toast.success(files === 1 ? 'CSV downloaded.' : `${files} CSV files downloaded.`);
      onOpenChange(false);
    } catch (e) {
      console.error(e);
      toast.error('Export failed. Check the console for details.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Export report</DialogTitle>
          <DialogDescription>
            Pick the tables that have data in your workspace, then choose JSON (one file) or CSV (one file per table).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="flex justify-end">
            <Button type="button" variant="secondary" size="sm" onClick={selectAllWithData}>
              Select all with data
            </Button>
          </div>

          <div className="grid gap-3 max-h-[240px] overflow-y-auto pr-1">
            {options.map(({ key, label, count }) => (
              <div key={key} className="flex items-center gap-3">
                <Checkbox
                  id={`export-${key}`}
                  checked={selected.has(key)}
                  onCheckedChange={(v) => toggle(key, v === true)}
                  disabled={count === 0}
                />
                <Label
                  htmlFor={`export-${key}`}
                  className={`flex flex-1 cursor-pointer justify-between text-sm font-normal ${count === 0 ? 'text-muted-foreground' : ''}`}
                >
                  <span>{label}</span>
                  <span className="text-muted-foreground tabular-nums">{count}</span>
                </Label>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Format</p>
            <RadioGroup value={format} onValueChange={(v) => setFormat(v as 'json' | 'csv')} className="grid gap-2">
              <div className="flex items-center gap-2">
                <RadioGroupItem value="json" id="fmt-json" />
                <Label htmlFor="fmt-json" className="font-normal cursor-pointer">
                  JSON — single file (good for backup / developers)
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="csv" id="fmt-csv" />
                <Label htmlFor="fmt-csv" className="font-normal cursor-pointer">
                  CSV — one spreadsheet per table (Excel-friendly)
                </Label>
              </div>
            </RadioGroup>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isExporting}>
            Cancel
          </Button>
          <Button type="button" onClick={() => void handleExport()} disabled={isExporting}>
            {isExporting ? 'Preparing…' : 'Download'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
