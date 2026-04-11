'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useInvoiceData } from '@/context/InvoiceContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Search,
  Monitor,
  LayoutList,
  List,
  MoreVertical,
  Edit,
  Trash2,
  Globe,
  Zap,
  CheckCircle,
  AlertCircle,
  XCircle,
  Code2,
  FileCode,
  User,
  Building2,
} from 'lucide-react';
import { formatCurrency } from '@/lib/formatting';
import { cn } from '@/lib/utils';
import { ConfirmDeleteDialog } from '@/components/shared/confirm-delete-dialog';
import { toast } from 'sonner';

type FilterStatus = 'all' | 'active' | 'inactive' | 'suspended';

export function WebsitesList({ typeFilter }: { typeFilter?: string }) {
  const { websites = [], clients, allCompanies = [], deleteWebsite } = useInvoiceData();
  const router = useRouter();

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterStatus>('all');
  const [view, setView] = useState<'grid' | 'table'>('grid');
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);

  const baseFiltered = websites.filter((site) => {
    const matchesSearch =
      site.name.toLowerCase().includes(search.toLowerCase()) ||
      site.domain.toLowerCase().includes(search.toLowerCase()) ||
      (clients.find((c) => c.id === site.clientId)?.name ?? '').toLowerCase().includes(search.toLowerCase());
    
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

  const handleDelete = (site: any) => {
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

  function TypeIconBox({ type }: { type: string }) {
    const wrap = 'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-white shadow-sm ring-1 ring-black/5';
    switch (type) {
      case 'wordpress':
        return (
          <div className={cn(wrap, 'bg-[#21759b]')}>
            <span className="text-sm font-black tracking-tight">W</span>
          </div>
        );
      case 'node':
        return (
          <div className={cn(wrap, 'bg-emerald-600')}>
            <Zap className="h-5 w-5" strokeWidth={2.25} />
          </div>
        );
      case 'php':
        return (
          <div className={cn(wrap, 'bg-violet-600')}>
            <FileCode className="h-5 w-5" strokeWidth={2} />
          </div>
        );
      case 'html':
        return (
          <div className={cn(wrap, 'bg-slate-600')}>
            <Code2 className="h-5 w-5" strokeWidth={2} />
          </div>
        );
      default:
        return (
          <div className={cn(wrap, 'bg-muted-foreground')}>
            <Globe className="h-5 w-5" />
          </div>
        );
    }
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search websites or clients..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant={view === 'grid' ? 'secondary' : 'outline'}
            size="icon"
            onClick={() => setView('grid')}
          >
            <LayoutList className="h-4 w-4" />
          </Button>
          <Button
            variant={view === 'table' ? 'secondary' : 'outline'}
            size="icon"
            onClick={() => setView('table')}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Filter tabs */}
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

      {/* Empty State */}
      {filtered.length === 0 && (
        <Card className="py-20 text-center border-dashed">
          <Monitor className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="font-semibold text-foreground mb-1">No websites found</h3>
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

      {/* List view (Hostinger-style horizontal rows) */}
      {view === 'grid' && filtered.length > 0 && (
        <Card className="overflow-hidden border border-border/70 shadow-sm p-0">
          {filtered.map((site) => {
            const client = clients.find((c) => c.id === site.clientId);
            const companyName = allCompanies.find((c) => c.id === site.companyId)?.name ?? '—';
            const cycleLabel =
              site.plan.billingCycle === 'onetime'
                ? 'one-time'
                : site.plan.billingCycle === 'yearly'
                  ? '/yr'
                  : '/mo';
            return (
              <div
                key={site.id}
                className="group flex flex-col gap-3 border-b border-border/60 px-4 py-3.5 last:border-b-0 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-4 sm:gap-y-2 sm:px-5 sm:py-3 hover:bg-muted/35 transition-colors"
              >
                <div className="flex min-w-0 flex-1 items-start gap-3 sm:items-center">
                  <TypeIconBox type={site.type} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-foreground leading-tight group-hover:text-primary transition-colors">
                      {site.name}
                    </p>
                    <p className="mt-0.5 flex items-center gap-1.5 truncate text-sm text-muted-foreground">
                      <Globe className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
                      <span className="truncate">{site.domain}</span>
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pl-[52px] text-[11px] text-muted-foreground sm:pl-0 sm:contents">
                  <div className="flex min-w-0 max-w-[140px] items-center gap-1.5 sm:max-w-[120px]">
                    <User className="h-3.5 w-3.5 shrink-0 opacity-60" aria-hidden />
                    <span className="truncate font-medium text-foreground/80" title={client?.name}>
                      {client?.name ?? '—'}
                    </span>
                  </div>
                  <div className="flex min-w-0 max-w-[160px] items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5 shrink-0 opacity-60" aria-hidden />
                    <span className="truncate font-medium text-foreground/80" title={companyName}>
                      {companyName}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 whitespace-nowrap tabular-nums">
                    <span>
                      <span className="text-muted-foreground/80">Storage </span>
                      <span className="font-semibold text-foreground">{site.storage} GB</span>
                    </span>
                    {site.bandwidth > 0 ? (
                      <span className="hidden md:inline">
                        <span className="text-muted-foreground/80">BW </span>
                        <span className="font-semibold text-foreground">{site.bandwidth} GB</span>
                      </span>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="h-6 px-2 text-[10px] font-semibold capitalize">
                      {site.type}
                    </Badge>
                    <span className="hidden max-w-[100px] truncate text-[11px] font-medium text-foreground/70 lg:inline" title={site.plan.name}>
                      {site.plan.name}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/40 pt-3 sm:ml-auto sm:flex-nowrap sm:justify-end sm:gap-4 sm:border-t-0 sm:pt-0 sm:shrink-0">
                  <div className="flex items-center gap-3 sm:gap-4">
                    {getStatusBadge(site.status, true)}
                    <div className="text-left sm:text-right">
                      <span className="text-sm font-bold tabular-nums text-primary">{formatCurrency(site.plan.price)}</span>
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
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 rounded-md px-3 text-xs font-medium"
                      onClick={() => router.push(`/dashboard/websites/${site.id}`)}
                    >
                      <Edit className="mr-1.5 h-3.5 w-3.5" />
                      Manage
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-md text-destructive hover:bg-destructive/10"
                      onClick={() => setDeleteTarget(site)}
                      aria-label={`Delete ${site.name}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Table View */}
      {view === 'table' && filtered.length > 0 && (
        <Card className="overflow-hidden border-none ring-1 ring-border/50">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="font-bold">Website</TableHead>
                <TableHead className="font-bold">Client</TableHead>
                <TableHead className="font-bold">Company</TableHead>
                <TableHead className="font-bold">Type</TableHead>
                <TableHead className="font-bold">Status</TableHead>
                <TableHead className="font-bold">Storage</TableHead>
                <TableHead className="font-bold">Price</TableHead>
                <TableHead className="text-right font-bold">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((site) => {
                const client = clients.find((c) => c.id === site.clientId);
                return (
                  <TableRow key={site.id} className="group hover:bg-muted/20">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "h-8 w-8 rounded-lg flex items-center justify-center text-white text-[10px] font-bold shadow-sm",
                          site.type === 'wordpress' ? "bg-blue-500" : 
                          site.type === 'node' ? "bg-green-600" : "bg-orange-500"
                        )}>
                          {site.type.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-sm leading-tight">{site.name}</p>
                          <p className="text-xs text-muted-foreground leading-tight mt-0.5">{site.domain}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm font-medium">{client?.name ?? '-'}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-muted-foreground font-medium">
                        {allCompanies.find(c => c.id === site.companyId)?.name ?? '-'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="capitalize">{site.type}</Badge>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(site.status)}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm font-semibold">{site.storage} GB</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-primary">{formatCurrency(site.plan.price)}</span>
                        <span className="text-[10px] text-muted-foreground uppercase font-medium">
                          {site.plan.billingCycle === 'onetime' ? 'one-time' : site.plan.billingCycle}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => router.push(`/dashboard/websites/${site.id}`)}
                        className="rounded-full h-8 w-8 p-0"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}

      <ConfirmDeleteDialog
        isOpen={!!deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        onConfirm={() => deleteTarget && handleDelete(deleteTarget)}
        title="Delete Website?"
        description={`Are you sure you want to delete "${deleteTarget?.name}"? All associated data will be removed. This action cannot be undone.`}
      />
    </div>
  );
}

