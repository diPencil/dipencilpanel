'use client';

import React, { useState } from 'react';
import { useInvoiceData } from '@/context/InvoiceContext';
import { AppCard } from './app-card';
import type { MobileApp } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Card } from '@/components/ui/card';
import {
  Search, Smartphone, Grid3x3, List, Globe, HardDrive, Server, Mail,
} from 'lucide-react';
import { AppStatusBadge, AppTypeBadge, AppPlanBadge, AppFrameworkBadge } from './app-badge';
import { formatCurrency } from '@/lib/formatting';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ConfirmDeleteDialog } from '@/components/shared/confirm-delete-dialog';

type FilterStatus = 'all' | 'live' | 'development' | 'suspended' | 'expired';

export function AppsList() {
  const { mobileApps, clients, domains, hosting, vps, emails, allCompanies = [], deleteMobileApp, setMobileAppStatus } = useInvoiceData();
  const router = useRouter();

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterStatus>('all');
  const [view, setView] = useState<'grid' | 'table'>('grid');
  const [deleteTarget, setDeleteTarget] = useState<MobileApp | null>(null);

  const filtered = mobileApps.filter((app) => {
    const matchesSearch =
      app.name.toLowerCase().includes(search.toLowerCase()) ||
      (clients.find((c) => c.id === app.clientId)?.name ?? '').toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === 'all' || app.status === filter;
    return matchesSearch && matchesFilter;
  });

  const counts = {
    all: mobileApps.length,
    live: mobileApps.filter((a) => a.status === 'live').length,
    development: mobileApps.filter((a) => a.status === 'development').length,
    suspended: mobileApps.filter((a) => a.status === 'suspended').length,
    expired: mobileApps.filter((a) => a.status === 'expired').length,
  };

  const handleDelete = (app: MobileApp) => {
    deleteMobileApp(app.id);
    toast.success(`${app.name} has been deleted.`);
    setDeleteTarget(null);
  };

  const FILTERS: { label: string; value: FilterStatus }[] = [
    { label: 'All', value: 'all' },
    { label: 'Live', value: 'live' },
    { label: 'Development', value: 'development' },
    { label: 'Suspended', value: 'suspended' },
    { label: 'Expired', value: 'expired' },
  ];

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by app name or client..."
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
            <Grid3x3 className="h-4 w-4" />
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

      {/* Empty state */}
      {filtered.length === 0 && (
        <Card className="py-20 text-center border-dashed">
          <Smartphone className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="font-semibold text-foreground mb-1">No applications found</h3>
          <p className="text-sm text-muted-foreground">
            {search || filter !== 'all'
              ? 'Try adjusting your search or filter.'
              : 'Get started by adding your first mobile application.'}
          </p>
          {!search && filter === 'all' && (
            <Button className="mt-4" onClick={() => router.push('/dashboard/mobile-apps/new')}>
              Add Application
            </Button>
          )}
        </Card>
      )}

      {/* Grid View */}
      {view === 'grid' && filtered.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.map((app) => {
            const client = clients.find((c) => c.id === app.clientId);
            const domain = domains.find((d) => d.id === app.domainId);
            const h = hosting.find((h) => h.id === app.hostingId);
            const v = vps.find((v) => v.id === app.vpsId);
            const emailCount = app.emailIds.filter((eid) => emails.some((e) => e.id === eid)).length;
            const company = allCompanies.find(c => c.id === app.companyId);
            return (
              <AppCard
                key={app.id}
                app={app}
                client={client}
                company={company}
                domain={domain}
                hosting={h}
                vps={v}
                emailCount={emailCount}
                onEdit={(a) => router.push(`/dashboard/mobile-apps/${a.id}`)}
                onDelete={(a) => setDeleteTarget(a)}
                onStatusChange={(id, status) => {
                  setMobileAppStatus(id, status);
                  toast.success(`App status updated to ${status}`);
                }}
              />
            );
          })}
        </div>
      )}

      {/* Table View */}
      {view === 'table' && filtered.length > 0 && (
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>App</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Platform</TableHead>
                <TableHead>Framework</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Domain</TableHead>
                <TableHead>Server</TableHead>
                <TableHead>Emails</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((app) => {
                const client = clients.find((c) => c.id === app.clientId);
                const domain = domains.find((d) => d.id === app.domainId);
                const h = hosting.find((h) => h.id === app.hostingId);
                const v = vps.find((v) => v.id === app.vpsId);
                const emailCount = app.emailIds.filter((eid) => emails.some((e) => e.id === eid)).length;
                return (
                  <TableRow key={app.id} className="group">
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Smartphone className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{app.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{client?.name ?? '-'}</TableCell>
                    <TableCell className="text-xs text-muted-foreground font-medium">
                      {allCompanies.find(c => c.id === app.companyId)?.name ?? '-'}
                    </TableCell>
                    <TableCell><AppTypeBadge type={app.appType} /></TableCell>
                    <TableCell><AppFrameworkBadge framework={app.framework} /></TableCell>
                    <TableCell><AppStatusBadge status={app.status} /></TableCell>
                    <TableCell><AppPlanBadge plan={app.plan} /></TableCell>
                    <TableCell>
                      {domain ? (
                        <div className="flex items-center gap-1 text-sm">
                          <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                          {domain.name}{domain.tld}
                        </div>
                      ) : (
                        <span className="text-xs text-amber-600">None</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {h ? (
                        <div className="flex items-center gap-1 text-sm">
                          <HardDrive className="h-3.5 w-3.5 text-muted-foreground" />
                          {h.planName}
                        </div>
                      ) : v ? (
                        <div className="flex items-center gap-1 text-sm">
                          <Server className="h-3.5 w-3.5 text-muted-foreground" />
                          {v.planName}
                        </div>
                      ) : (
                        <span className="text-xs text-amber-600">None</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <Mail className={cn('h-3.5 w-3.5', emailCount > 0 ? 'text-muted-foreground' : 'text-muted-foreground/40')} />
                        {emailCount > 0 ? emailCount : '-'}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(app.price)}
                      <span className="text-xs text-muted-foreground">/{app.billingCycle === 'yearly' ? 'yr' : 'mo'}</span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => router.push(`/dashboard/mobile-apps/${app.id}`)}
                      >
                        Manage
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
        title="Delete Application?"
        description={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`}
      />
    </div>
  );
}
