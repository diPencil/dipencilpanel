'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertCircle, CheckCircle, ExternalLink, Globe, XCircle } from 'lucide-react';
import { useInvoiceData } from '@/context/InvoiceContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Website } from '@/lib/types';
import { formatCurrency } from '@/lib/formatting';
import { getWebsiteTypeOption } from '@/lib/website-type-options';
import { WebsiteTypeIcon } from '@/components/websites/website-type-icon';
import { cn } from '@/lib/utils';

function billingCycleLabel(cycle: Website['plan']['billingCycle']): string {
  switch (cycle) {
    case 'monthly':
      return 'Monthly';
    case 'yearly':
      return 'Yearly';
    case 'onetime':
      return 'One-time';
    default:
      return cycle;
  }
}

function StatusBadge({ status }: { status: Website['status'] }) {
  const cls = 'gap-1.5 py-0.5 capitalize';
  switch (status) {
    case 'active':
      return (
        <Badge variant="outline" className={cn('bg-emerald-500/10 text-emerald-600 border-emerald-200', cls)}>
          <CheckCircle className="h-3.5 w-3.5 shrink-0" />
          Active
        </Badge>
      );
    case 'inactive':
      return (
        <Badge variant="outline" className={cn('bg-amber-500/10 text-amber-600 border-amber-200', cls)}>
          <XCircle className="h-3.5 w-3.5 shrink-0" />
          Inactive
        </Badge>
      );
    case 'suspended':
      return (
        <Badge variant="outline" className={cn('bg-red-500/10 text-red-600 border-red-200', cls)}>
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          Suspended
        </Badge>
      );
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

function DetailBlock({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="min-w-0 text-[15px] font-medium leading-snug text-foreground">{children}</div>
    </div>
  );
}

export function WebsiteDetailsSummary({ website }: { website: Website }) {
  const router = useRouter();
  const { clients } = useInvoiceData();
  const client = clients.find((c) => c.id === website.clientId);
  const typeLabel = getWebsiteTypeOption(website.type).label;
  const clientName = client?.name ?? '—';
  const business = client?.companyName?.trim() || client?.name || '—';
  const domainHref = `https://${website.domain.replace(/^https?:\/\//i, '')}`;

  return (
    <Card className="overflow-hidden border-border/80 shadow-sm">
      <div className="border-b border-border bg-muted/40 px-6 py-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <WebsiteTypeIcon type={website.type} size="lg" />
            <div className="min-w-0 space-y-1">
              <h2 className="text-xl font-semibold tracking-tight text-foreground">{website.name}</h2>
              <a
                href={domainHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex max-w-full items-center gap-1.5 text-sm text-primary hover:underline"
              >
                <Globe className="h-3.5 w-3.5 shrink-0 opacity-80" aria-hidden />
                <span className="truncate">{website.domain}</span>
                <ExternalLink className="h-3 w-3 shrink-0 opacity-60" aria-hidden />
              </a>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2 sm:flex-col sm:items-end">
            <Badge variant="secondary" className="font-semibold">
              {typeLabel}
            </Badge>
            <StatusBadge status={website.status} />
          </div>
        </div>
      </div>

      <div className="px-6 py-6">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
          <DetailBlock label="Client">{clientName}</DetailBlock>
          <DetailBlock label="Business">{business}</DetailBlock>
          <DetailBlock label="Plan">{website.plan.name}</DetailBlock>
          <DetailBlock label="Storage">{website.storage} GB</DetailBlock>
          <DetailBlock label="Bandwidth">{website.bandwidth} GB</DetailBlock>
          <DetailBlock label="Billing cycle">{billingCycleLabel(website.plan.billingCycle)}</DetailBlock>
          <DetailBlock label="Plan price">
            <span className="tabular-nums text-lg font-semibold text-primary">
              {formatCurrency(website.plan.price)}
            </span>
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              {website.plan.billingCycle === 'monthly'
                ? '/ month'
                : website.plan.billingCycle === 'yearly'
                  ? '/ year'
                  : ''}
            </span>
          </DetailBlock>
        </div>

        <div className="mt-8 flex flex-wrap gap-2 border-t border-border pt-6">
          <Button type="button" asChild>
            <Link href={`/dashboard/websites/${website.id}`}>Edit website</Link>
          </Button>
          <Button type="button" variant="outline" onClick={() => router.push('/dashboard/websites')}>
            Back to list
          </Button>
        </div>
      </div>
    </Card>
  );
}
