'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useInvoiceData } from '@/context/InvoiceContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Plus,
  Search,
  MoreVertical,
  ExternalLink,
  RotateCcw,
  History,
  HardDrive,
  Cpu,
  Activity,
  Trash2,
  Calendar,
  Pencil,
  CirclePlay,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { formatCurrency, formatDate } from '@/lib/formatting';
import { resolveHostingPrimaryDomain } from '@/lib/hosting-domain';
import { isHostingRenewEligible } from '@/lib/hosting-renew-eligibility';
import { RenewHostingDialog } from '@/components/hosting/renew-hosting-dialog';
import { cn } from '@/lib/utils';
import type { Hosting } from '@/lib/types';

type HostingStatus = 'all' | 'active' | 'suspended' | 'expired';

export default function HostingOverviewPage() {
  const {
    hosting = [],
    clients = [],
    domains = [],
    deleteHosting,
    suspendHosting,
    reactivateHosting,
  } = useInvoiceData();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<HostingStatus>('all');
  const [suspendTarget, setSuspendTarget] = useState<Hosting | null>(null);
  const [reactivateTarget, setReactivateTarget] = useState<Hosting | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Hosting | null>(null);
  const [renewTarget, setRenewTarget] = useState<Hosting | null>(null);

  const filteredHosting = useMemo(() => {
    return (hosting || []).filter((h) => {
      const client = clients.find((c) => c.id === h.clientId);
      const primary = resolveHostingPrimaryDomain(h, domains);

      const searchStr = `${h.name} ${client?.name || ''} ${primary.display}`.toLowerCase();
      const matchesSearch = searchStr.includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || h.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [hosting, clients, domains, searchQuery, statusFilter]);

  const stats = useMemo(() => {
    return {
      total: hosting.length,
      active: hosting.filter(h => h.status === 'active').length,
      expired: hosting.filter(h => h.status === 'expired').length,
      revenue: hosting.reduce((sum, h) => sum + h.price, 0)
    };
  }, [hosting]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header and Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Web Hosting</h1>
          <p className="text-muted-foreground mt-1">Manage your hosting accounts and linked resources.</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/dashboard/hosting/new">
            <Button className="rounded-xl shadow-lg shadow-primary/20 gap-2">
              <Plus className="h-4 w-4" /> Add Hosting
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Quick View */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Accounts', value: stats.total, icon: HardDrive, color: 'text-blue-500', bg: 'bg-blue-50' },
          { label: 'Active Tasks', value: stats.active, icon: Activity, color: 'text-green-500', bg: 'bg-green-50' },
          { label: 'Expired', value: stats.expired, icon: History, color: 'text-red-500', bg: 'bg-red-50' },
          { label: 'Monthly Revenue', value: formatCurrency(stats.revenue), icon: Calendar, color: 'text-purple-500', bg: 'bg-purple-50' },
        ].map((stat, i) => (
          <Card key={i} className="p-4 border-none shadow-sm flex items-center gap-4">
             <div className={cn("h-12 w-12 rounded-xl flex items-center justify-center shrink-0", stat.bg)}>
                <stat.icon className={cn("h-6 w-6", stat.color)} />
             </div>
             <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{stat.label}</p>
                <p className="text-xl font-bold mt-0.5">{stat.value}</p>
             </div>
          </Card>
        ))}
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row gap-4 bg-card p-4 rounded-2xl border border-border/50 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search by name, client or domain..." 
            className="pl-10 h-11 rounded-xl border-border/50"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          {(['all', 'active', 'suspended', 'expired'] as HostingStatus[]).map((s) => (
            <Button
              key={s}
              variant={statusFilter === s ? "default" : "outline"}
              size="sm"
              className={cn("rounded-lg capitalize h-11 px-6", statusFilter === s ? "shadow-md" : "border-border/50")}
              onClick={() => setStatusFilter(s)}
            >
              {s}
            </Button>
          ))}
        </div>
      </div>

      {/* Hosting List — table layout similar to Domains */}
      <Card className="overflow-hidden border-border/60 shadow-sm">
        <div className="hidden overflow-x-auto lg:block">
          <table className="w-full">
            <thead className="bg-muted/60">
              <tr className="text-left text-sm">
                <th className="px-5 py-4 font-semibold">Hosting / Plan</th>
                <th className="px-5 py-4 font-semibold">Client</th>
                <th className="px-5 py-4 font-semibold">Primary Domain</th>
                <th className="px-5 py-4 font-semibold">Status</th>
                <th className="px-5 py-4 font-semibold">Resources</th>
                <th className="px-5 py-4 font-semibold">Storage</th>
                <th className="px-5 py-4 font-semibold">Expiration</th>
                <th className="px-5 py-4 font-semibold">Price</th>
                <th className="px-5 py-4 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredHosting.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-5 py-12 text-center text-muted-foreground">
                    No hosting matches your filters.
                  </td>
                </tr>
              ) : (
                filteredHosting.map((h) => {
                  const client = clients.find(c => c.id === h.clientId);
                  const primary = resolveHostingPrimaryDomain(h, domains);
                  return (
                    <tr key={h.id} className="border-t border-border/60 transition-colors hover:bg-muted/30">
                      <td className="px-5 py-4">
                        <div className="space-y-1">
                          <div className="font-semibold">{h.name}</div>
                          <div className="text-xs text-muted-foreground">{h.planName}</div>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-sm">{client?.name || 'Unassigned'}</td>
                      <td className="px-5 py-4 text-sm">
                        <Link href={primary.detailHref} className="font-semibold text-primary hover:underline truncate block">{primary.display}</Link>
                      </td>
                      <td className="px-5 py-4">{
                        h.status === 'active' ? <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">Active</Badge>
                        : h.status === 'suspended' ? <Badge variant="secondary">Suspended</Badge>
                        : <Badge className="bg-rose-50 text-rose-700 border-rose-200">Expired</Badge>
                      }</td>
                      <td className="px-5 py-4 text-sm">{h.resources.cpu} / {h.resources.ram}</td>
                      <td className="px-5 py-4 text-sm">{h.resources.storage}</td>
                      <td className="px-5 py-4 text-sm">{formatDate(h.expiryDate)}</td>
                      <td className="px-5 py-4 text-lg font-black">{formatCurrency(h.price)}<span className="text-[10px] font-bold text-muted-foreground uppercase ml-1">/{h.billingCycle === 'monthly' ? 'mo' : 'yr'}</span></td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Link href={`/dashboard/hosting/${h.id}`}>
                            <Button variant="ghost" size="icon" className="h-8 w-8" title="Manage">
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          </Link>
                          <Button variant="ghost" size="icon" className="h-8 w-8" title="Edit" onClick={() => window.location.assign(`/dashboard/hosting/${h.id}?edit=1`)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          {isHostingRenewEligible(h) ? (
                            <Button variant="ghost" size="icon" className="h-8 w-8" title="Renew" onClick={() => setRenewTarget(h)}>
                              <RotateCcw className="h-4 w-4" />
                            </Button>
                          ) : null}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="rounded-full h-8 w-8">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuItem asChild>
                                <Link href={`/dashboard/hosting/${h.id}`} className="cursor-pointer"><ExternalLink className="h-4 w-4 mr-2" /> Manage</Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => window.location.assign(`/dashboard/hosting/${h.id}?edit=1`)}>
                                <Pencil className="h-4 w-4 mr-2" /> Edit
                              </DropdownMenuItem>
                              {h.status === 'suspended' ? (
                                <DropdownMenuItem onClick={() => setReactivateTarget(h)}>
                                  <CirclePlay className="h-4 w-4 mr-2" /> Reactivate
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem onClick={() => setSuspendTarget(h)}>
                                  <History className="h-4 w-4 mr-2" /> Suspend
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-destructive" onClick={() => setDeleteTarget(h)}>
                                <Trash2 className="h-4 w-4 mr-2" /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile / compact list */}
        <div className="space-y-3 p-4 lg:hidden">
          {filteredHosting.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">No hosting matches your filters.</div>
          ) : (
            filteredHosting.map((h) => {
              const client = clients.find(c => c.id === h.clientId);
              const primary = resolveHostingPrimaryDomain(h, domains);
              return (
                <Card key={h.id} className="p-4 shadow-sm">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-semibold">{h.name}</div>
                      <div className="text-xs text-muted-foreground">{client?.name || 'Unassigned'} • {h.planName}</div>
                      <div className="text-xs text-muted-foreground mt-2">{primary.display}</div>
                    </div>
                    <div className="text-right">
                      <div>{h.status === 'active' ? <Badge className="bg-emerald-50 text-emerald-700">Active</Badge> : h.status === 'suspended' ? <Badge variant="secondary">Suspended</Badge> : <Badge className="bg-rose-50 text-rose-700">Expired</Badge>}</div>
                      <div className="mt-2 text-sm font-black">{formatCurrency(h.price)}<span className="text-[10px] font-bold text-muted-foreground uppercase ml-1">/{h.billingCycle === 'monthly' ? 'mo' : 'yr'}</span></div>
                    </div>
                  </div>
                </Card>
              );
            })
          )}
        </div>
      </Card>

      <AlertDialog open={!!suspendTarget} onOpenChange={(open) => !open && setSuspendTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Suspend this hosting account?</AlertDialogTitle>
            <AlertDialogDescription>
              The service for <strong>{suspendTarget?.name}</strong> will be marked suspended. Linked billing may be
              paused. You can reactivate it later from the same menu.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-amber-600 text-white hover:bg-amber-600/90"
              onClick={() => {
                if (suspendTarget) {
                  suspendHosting(suspendTarget.id);
                  setSuspendTarget(null);
                }
              }}
            >
              Yes, suspend
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!reactivateTarget} onOpenChange={(open) => !open && setReactivateTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reactivate hosting?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{reactivateTarget?.name}</strong> will return to active status. If a subscription is linked, it
              will be set active with auto-renew enabled.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (reactivateTarget) {
                  reactivateHosting(reactivateTarget.id);
                  setReactivateTarget(null);
                }
              }}
            >
              Yes, reactivate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete hosting account?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes <strong>{deleteTarget?.name}</strong> and cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleteTarget) {
                  deleteHosting(deleteTarget.id);
                  setDeleteTarget(null);
                }
              }}
            >
              Yes, delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <RenewHostingDialog
        open={!!renewTarget}
        onOpenChange={(open) => {
          if (!open) setRenewTarget(null);
        }}
        hostingId={renewTarget?.id ?? null}
      />
    </div>
  );
}
