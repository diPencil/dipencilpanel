'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useInvoiceData } from '@/context/InvoiceContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Search,
  Monitor,
  LayoutList,
  List,
  MoreVertical,
  Edit,
  Trash2,
  Globe,
  Eye,
  CheckCircle,
  AlertCircle,
  XCircle,
  User,
  Building2,
} from 'lucide-react';
import { formatCurrency } from '@/lib/formatting';
import { cn } from '@/lib/utils';
import { ConfirmDeleteDialog } from '@/components/shared/confirm-delete-dialog';
import { toast } from 'sonner';
import type { Client } from '@/lib/types';
import { getWebsiteTypeOption } from '@/lib/website-type-options';
import { WebsiteTypeIcon } from '@/components/websites/website-type-icon';

type FilterStatus = 'all' | 'active' | 'inactive' | 'suspended';

function clientBusinessDisplay(client: Client | undefined): string {
  if (!client) return '—';
  const business = client.companyName?.trim();
  return business || client.name || '—';
}

const LIST_GRID =
  'grid gap-4 border-b border-border/60 px-4 py-4 last:border-b-0 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,auto)_minmax(0,1.1fr)_minmax(0,1.35fr)] md:items-center md:gap-x-4 md:px-5 md:py-3.5 hover:bg-muted/30 transition-colors';

export function WebsitesList({ typeFilter }: { typeFilter?: string }) {
  const { websites = [], clients, deleteWebsite } = useInvoiceData();
  const router = useRouter();

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterStatus>('all');
  const [view, setView] = useState<'grid' | 'table'>('grid');
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  const baseFiltered = websites.filter((site) => {
    const client = clients.find((c) => c.id === site.clientId);
    const q = search.toLowerCase();
    const matchesSearch =
      site.name.toLowerCase().includes(q) ||
      site.domain.toLowerCase().includes(q) ||
      (client?.name ?? '').toLowerCase().includes(q) ||
      clientBusinessDisplay(client).toLowerCase().includes(q);

    const matchesType = typeFilter
      ? site.type === typeFilter || (typeFilter === 'php' && site.type === 'html')
      : true;

    return matchesSearch && matchesType;
  });

  const filtered = baseFiltered.filter((site) => {
    return filter === 'all' || site.status === filter;
  });

  const counts = {
    all: baseFiltered.length,
    active: baseFiltered.filter((w) => w.status === 'active').length,
    inactive: baseFiltered.filter((w) => w.status === 'inactive').length,
    suspended: baseFiltered.filter((w) => w.status === 'suspended').length,
  };

  const handleDelete = (site: { id: string; name: string }) => {
    deleteWebsite(site.id);
    toast.success(`${site.name} has been deleted.`);
    setDeleteTarget(null);
  };

  const FILTERS: { label: string; value: FilterStatus }[] = [
    { label: 'All', value: 'all' },
    { label: 'Active', value: 'active' },
    { label: 'Inactive', value: 'inactive' },
    { label: 'Suspended', value: 'suspended' },
  ];

  const getStatusBadge = (status: string, compact?: boolean) => {
    const compactCls = compact ? 'gap-1 py-0 px-2 h-6 text-[10px]' : 'gap-1.5 py-0.5';
    switch (status) {
      case 'active':
        return (
          <Badge variant="outline" className={cn('bg-emerald-500/10 text-emerald-600 border-emerald-200', compactCls)}>
            <CheckCircle className="h-3 w-3 shrink-0" /> Active
          </Badge>
        );
      case 'inactive':
        return (
          <Badge variant="outline" className={cn('bg-amber-500/10 text-amber-600 border-amber-200', compactCls)}>
            <XCircle className="h-3 w-3 shrink-0" /> Inactive
          </Badge>
        );
      case 'suspended':
        return (
          <Badge variant="outline" className={cn('bg-red-500/10 text-red-600 border-red-200', compactCls)}>
            <AlertCircle className="h-3 w-3 shrink-0" /> Suspended
          </Badge>
        );
      default:
        return <Badge variant="outline" className={compactCls}>{status}</Badge>;
    }
  };

  const rowActions = (site: (typeof websites)[number]) => (
    <div className="flex flex-wrap items-center justify-end gap-1.5">
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-8 px-3 text-xs font-medium"
        onClick={() => router.push(`/dashboard/websites/${site.id}`)}
      >
        <Edit className="mr-1.5 h-3.5 w-3.5" />
        Edit
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-8 px-3 text-xs font-medium"
        onClick={() => router.push(`/dashboard/websites/${site.id}?view=1`)}
      >
        <Eye className="mr-1.5 h-3.5 w-3.5" />
        View
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" aria-label="More actions">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onClick={() => setDeleteTarget({ id: site.id, name: site.name })}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search websites or clients..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          <Button variant={view === 'grid' ? 'secondary' : 'outline'} size="icon" onClick={() => setView('grid')}>
            <LayoutList className="h-4 w-4" />
          </Button>
          <Button variant={view === 'table' ? 'secondary' : 'outline'} size="icon" onClick={() => setView('table')}>
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Button
            key={f.value}
            variant={filter === f.value ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter(f.value)}
            className="gap-2"
          >
            {f.label}
            <Badge variant="secondary" className="h-4 min-w-4 px-1 text-xs">
              {counts[f.value]}
            </Badge>
          </Button>
        ))}
      </div>

      {filtered.length === 0 && (
        <Card className="border-dashed py-20 text-center">
          <Monitor className="mx-auto mb-4 h-12 w-12 text-muted-foreground/30" />
          <h3 className="mb-1 font-semibold text-foreground">No websites found</h3>
          <p className="text-sm text-muted-foreground">
            {search || filter !== 'all'
              ? 'Try adjusting your search or filter.'
              : 'Add your first website to get started.'}
          </p>
          {!search && filter === 'all' && (
            <Button className="mt-4" onClick={() => router.push('/dashboard/websites/new')}>
              Add Website
            </Button>
          )}
        </Card>
      )}

      {view === 'grid' && filtered.length > 0 && (
        <Card className="overflow-hidden border border-border/80 p-0 shadow-sm">
          <div
            className="hidden border-b border-border bg-muted/40 px-5 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground md:grid md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,auto)_minmax(0,1.1fr)_minmax(0,1.35fr)] md:gap-x-4"
            aria-hidden
          >
            <span>Website</span>
            <span>Client</span>
            <span>Business</span>
            <span className="text-center">Resources</span>
            <span>Type &amp; plan</span>
            <span className="text-right">Billing &amp; actions</span>
          </div>
          {filtered.map((site) => {
            const client = clients.find((c) => c.id === site.clientId);
            const business = clientBusinessDisplay(client);
            const typeLabel = getWebsiteTypeOption(site.type).label;
            const cycleLabel =
              site.plan.billingCycle === 'onetime'
                ? 'one-time'
                : site.plan.billingCycle === 'yearly'
                  ? '/yr'
                  : '/mo';
            return (
              <div key={site.id} className={LIST_GRID}>
                <div className="flex min-w-0 items-start gap-3">
                  <WebsiteTypeIcon type={site.type} size="md" />
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-foreground leading-tight">{site.name}</p>
                    <p className="mt-0.5 flex items-center gap-1.5 truncate text-sm text-muted-foreground">
                      <Globe className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
                      <span className="truncate">{site.domain}</span>
                    </p>
                  </div>
                </div>

                <div className="min-w-0">
                  <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground md:hidden">
                    Client
                  </p>
                  <p className="flex items-center gap-1.5 truncate text-sm font-medium text-foreground">
                    <User className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
                    <span className="truncate" title={client?.name}>
                      {client?.name ?? '—'}
                    </span>
                  </p>
                </div>

                <div className="min-w-0">
                  <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground md:hidden">
                    Business
                  </p>
                  <p className="flex items-center gap-1.5 truncate text-sm font-medium text-foreground">
                    <Building2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
                    <span className="truncate" title={business}>
                      {business}
                    </span>
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs tabular-nums md:justify-center">
                  <span>
                    <span className="text-muted-foreground">Storage </span>
                    <strong className="font-semibold text-foreground">{site.storage} GB</strong>
                  </span>
                  {site.bandwidth > 0 ? (
                    <span>
                      <span className="text-muted-foreground">BW </span>
                      <strong className="font-semibold text-foreground">{site.bandwidth} GB</strong>
                    </span>
                  ) : null}
                </div>

                <div className="min-w-0">
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground md:hidden">
                    Type &amp; plan
                  </p>
                  <div className="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
                    <Badge variant="secondary" className="h-6 w-fit shrink-0 px-2 text-[10px] font-semibold">
                      {typeLabel}
                    </Badge>
                    <span
                      className="truncate text-[11px] font-medium text-muted-foreground"
                      title={site.plan.name}
                    >
                      {site.plan.name}
                    </span>
                  </div>
                </div>

                <div className="flex min-w-0 flex-col gap-3 border-t border-border/50 pt-3 md:border-t-0 md:pt-0">
                  <div className="flex flex-wrap items-center justify-between gap-3 md:flex-col md:items-end md:justify-center md:gap-2">
                    <div className="flex items-center gap-2">{getStatusBadge(site.status, true)}</div>
                    <div className="text-left md:text-right">
                      <span className="text-sm font-bold tabular-nums text-primary">
                        {formatCurrency(site.plan.price)}
                      </span>
                      {site.plan.billingCycle === 'onetime' ? (
                        <span className="ml-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                          one-time
                        </span>
                      ) : (
                        <span className="ml-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                          {cycleLabel}
                        </span>
                      )}
                    </div>
                  </div>
                  {rowActions(site)}
                </div>
              </div>
            );
          })}
        </Card>
      )}

      {view === 'table' && filtered.length > 0 && (
        <Card className="overflow-hidden border border-border/80 shadow-sm">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border/80 bg-muted/40 hover:bg-muted/40">
                  <TableHead className="min-w-[200px] font-semibold">Website</TableHead>
                  <TableHead className="font-semibold">Client</TableHead>
                  <TableHead className="min-w-[120px] font-semibold">Business</TableHead>
                  <TableHead className="font-semibold">Type</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="font-semibold">Storage</TableHead>
                  <TableHead className="font-semibold">Price</TableHead>
                  <TableHead className="text-right font-semibold">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((site) => {
                  const client = clients.find((c) => c.id === site.clientId);
                  const business = clientBusinessDisplay(client);
                  const typeLabel = getWebsiteTypeOption(site.type).label;
                  return (
                    <TableRow key={site.id} className="border-border/60 hover:bg-muted/25">
                      <TableCell className="align-middle">
                        <div className="flex items-center gap-3">
                          <WebsiteTypeIcon type={site.type} size="sm" />
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-sm">{site.name}</p>
                            <p className="truncate text-xs text-muted-foreground">{site.domain}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="align-middle">
                        <span className="text-sm font-medium">{client?.name ?? '—'}</span>
                      </TableCell>
                      <TableCell className="align-middle">
                        <span className="line-clamp-2 text-xs font-medium text-foreground" title={business}>
                          {business}
                        </span>
                      </TableCell>
                      <TableCell className="align-middle">
                        <Badge variant="secondary" className="text-[10px] font-semibold">
                          {typeLabel}
                        </Badge>
                      </TableCell>
                      <TableCell className="align-middle">{getStatusBadge(site.status)}</TableCell>
                      <TableCell className="align-middle tabular-nums">
                        <span className="text-sm font-semibold">{site.storage} GB</span>
                      </TableCell>
                      <TableCell className="align-middle">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-sm font-bold tabular-nums text-primary">
                            {formatCurrency(site.plan.price)}
                          </span>
                          <span className="text-[10px] font-medium uppercase text-muted-foreground">
                            {site.plan.billingCycle === 'onetime' ? 'one-time' : site.plan.billingCycle}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="align-middle text-right">{rowActions(site)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      <ConfirmDeleteDialog
        isOpen={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        onConfirm={() => deleteTarget && handleDelete(deleteTarget)}
        title="Delete Website?"
        description={`Are you sure you want to delete "${deleteTarget?.name}"? All associated data will be removed. This action cannot be undone.`}
      />
    </div>
  );
}
