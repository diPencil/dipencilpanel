'use client';

import React from 'react';
import Link from 'next/link';
import { useInvoiceData } from '@/context/InvoiceContext';
import { Card } from '@/components/ui/card';
import { ArrowRight, HardDrive } from 'lucide-react';
import { getStorageSummary } from '@/lib/storage-utils';

export function DiskUsageWidget() {
  const { hosting = [], vps = [] } = useInvoiceData();

  const summary = getStorageSummary(hosting, vps);
  const hostingWidth = summary.totalStorage > 0 ? summary.hostingShare : 0;
  const vpsWidth = summary.totalStorage > 0 ? summary.vpsShare : 0;

  return (
    <Link href="/dashboard/resources/storage" className="block group">
      <Card className="p-6 h-full border-border/50 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 cursor-pointer">
        <div className="flex items-center gap-4">
          <div className="shrink-0">
            <div className="flex items-center justify-center h-16 w-16 rounded-full bg-blue-100 dark:bg-blue-900/50 ring-1 ring-blue-500/10">
              <HardDrive className="h-8 w-8 text-blue-600 dark:text-blue-300" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline justify-between gap-3 mb-2">
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Disk Usage</h3>
                <p className="text-2xl font-bold leading-none mt-1">{summary.totalStorage} GB</p>
              </div>
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Allocated</span>
            </div>

            <div className="flex h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-blue-600 transition-all duration-300"
                style={{ width: `${hostingWidth}%` }}
              />
              <div
                className="h-full bg-emerald-500 transition-all duration-300"
                style={{ width: `${vpsWidth}%` }}
              />
            </div>

            <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
              <span>{summary.hostingStorage} GB Hosting</span>
              <span>{summary.vpsStorage} GB VPS</span>
            </div>

            <p className="text-xs text-muted-foreground mt-2">
              {summary.totalServices} storage records tracked across hosting and VPS.
            </p>

            <div className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-primary group-hover:underline">
              View storage overview <ArrowRight className="h-3.5 w-3.5" />
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
}

