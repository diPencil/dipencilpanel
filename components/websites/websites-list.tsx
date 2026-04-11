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
  Search, Monitor, Grid3x3, List, MoreVertical, Edit, Trash2, Globe, HardDrive, Zap, CheckCircle, AlertCircle, XCircle
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-200 gap-1.5 py-0.5">
            <CheckCircle className="h-3 w-3" /> Active
          </Badge>
        );
      case 'inactive':
        return (
          <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-200 gap-1.5 py-0.5">
            <XCircle className="h-3 w-3" /> Inactive
          </Badge>
        );
      case 'suspended':
        return (
          <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-200 gap-1.5 py-0.5">
            <AlertCircle className="h-3 w-3" /> Suspended
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

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

      {/* Grid View */}
      {view === 'grid' && filtered.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.map((site) => {
            const client = clients.find((c) => c.id === site.clientId);
            return (
              <Card key={site.id} className="p-5 hover:shadow-lg transition-all group border-none ring-1 ring-border/50">
                <div className="flex items-start justify-between mb-4">
                  <div className={cn(
                    "h-12 w-12 rounded-2xl flex items-center justify-center text-white font-bold shadow-sm",
                    site.type === 'wordpress' ? "bg-blue-500" : 
                    site.type === 'node' ? "bg-green-600" : "bg-orange-500"
                  )}>
                    {site.type.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => router.push(`/dashboard/websites/${site.id}`)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-destructive hover:bg-destructive/10" onClick={() => setDeleteTarget(site)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="mb-4">
                  <h3 className="text-lg font-bold truncate group-hover:text-primary transition-colors">{site.name}</h3>
                  <p className="text-sm text-muted-foreground truncate flex items-center gap-1.5">
                    <Globe className="h-3.5 w-3.5" />
                    {site.domain}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="bg-muted/40 p-2.5 rounded-xl border border-border/50">
                    <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Storage</p>
                    <p className="text-sm font-semibold">{site.storage} GB</p>
                  </div>
                  <div className="bg-muted/40 p-2.5 rounded-xl border border-border/50">
                    <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Company</p>
                    <p className="text-sm font-semibold truncate">{allCompanies.find(c => c.id === site.companyId)?.name ?? '-'}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-border/50">
                  {getStatusBadge(site.status)}
                  <div className="text-right">
                    <span className="text-sm font-bold text-primary">{formatCurrency(site.plan.price)}</span>
                    {site.plan.billingCycle === 'onetime' ? (
                      <span className="text-[10px] text-muted-foreground font-medium uppercase ml-1">one-time</span>
                    ) : (
                      <span className="text-[10px] text-muted-foreground font-medium uppercase ml-0.5">
                        /{site.plan.billingCycle === 'yearly' ? 'yr' : 'mo'}
                      </span>
                    )}
                  </div>
                </div>
              </Card>
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

