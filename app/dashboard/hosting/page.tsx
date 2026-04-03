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
  Filter, 
  MoreVertical, 
  ExternalLink, 
  RotateCcw, 
  History,
  HardDrive,
  Cpu,
  Activity,
  Trash2,
  Calendar
} from 'lucide-react';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatCurrency, formatDate } from '@/lib/formatting';
import { cn } from '@/lib/utils';

type HostingStatus = 'all' | 'active' | 'suspended' | 'expired';

export default function HostingOverviewPage() {
  const { hosting = [], clients = [], domains = [], deleteHosting, suspendHosting, renewHosting } = useInvoiceData();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<HostingStatus>('all');

  const filteredHosting = useMemo(() => {
    return (hosting || []).filter(h => {
      const client = clients.find(c => c.id === h.clientId);
      const domain = domains.find(d => d.id === h.domainId);
      
      const searchStr = `${h.name} ${client?.name || ''} ${domain?.name || ''}`.toLowerCase();
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

      {/* Hosting List */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {filteredHosting.length > 0 ? (
          filteredHosting.map((h) => {
            const client = clients.find(c => c.id === h.clientId);
            const domain = domains.find(d => d.id === h.domainId);
            
            return (
              <Card key={h.id} className="group overflow-hidden border-border/50 hover:shadow-xl transition-all duration-300 ring-1 ring-border/5">
                 <div className="p-6">
                    <div className="flex items-start justify-between mb-6">
                       <div className="flex items-center gap-4">
                          <div className={cn(
                            "h-14 w-14 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 duration-500",
                            h.status === 'active' ? 'bg-green-50 text-green-600' : 
                            h.status === 'suspended' ? 'bg-amber-50 text-amber-600' : 'bg-red-50 text-red-600'
                          )}>
                             <HardDrive className="h-7 w-7" />
                          </div>
                          <div>
                             <h3 className="font-bold text-lg leading-tight">{h.name}</h3>
                             <div className="flex items-center gap-2 mt-1">
                                <Badge variant="outline" className={cn(
                                  "capitalize text-[10px] py-0 h-5 border-none font-bold",
                                  h.status === 'active' ? 'bg-green-100 text-green-700' : 
                                  h.status === 'suspended' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                                )}>
                                  {h.status}
                                </Badge>
                                <span className="text-xs text-muted-foreground font-medium">• {h.planName}</span>
                             </div>
                          </div>
                       </div>
                       
                       <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                             <Button variant="ghost" size="icon" className="rounded-full h-10 w-10">
                                <MoreVertical className="h-5 w-5" />
                             </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                             <DropdownMenuLabel>Actions</DropdownMenuLabel>
                             <DropdownMenuItem asChild>
                                <Link href={`/dashboard/hosting/${h.id}`} className="cursor-pointer">
                                   <ExternalLink className="h-4 w-4 mr-2" /> Manage
                                </Link>
                             </DropdownMenuItem>
                             <DropdownMenuItem onClick={() => renewHosting(h.id)}>
                                <RotateCcw className="h-4 w-4 mr-2" /> Renew
                             </DropdownMenuItem>
                             <DropdownMenuItem onClick={() => suspendHosting(h.id)} className="text-amber-600">
                                <History className="h-4 w-4 mr-2" /> Suspend
                             </DropdownMenuItem>
                             <DropdownMenuSeparator />
                             <DropdownMenuItem onClick={() => deleteHosting(h.id)} className="text-destructive">
                                <Trash2 className="h-4 w-4 mr-2" /> Delete
                             </DropdownMenuItem>
                          </DropdownMenuContent>
                       </DropdownMenu>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-6">
                       <div className="space-y-1">
                          <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest leading-none">Client</p>
                          <p className="font-semibold truncate">{client?.name || 'Unassigned'}</p>
                       </div>
                       <div className="space-y-1">
                          <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest leading-none">Primary Domain</p>
                          <Link href={`/dashboard/domains`} className="font-semibold text-primary hover:underline truncate block">
                             {domain ? `${domain.name}${domain.tld}` : 'No domain'}
                          </Link>
                       </div>
                    </div>

                    <div className="flex items-center gap-4 p-4 bg-muted/40 rounded-xl mb-6">
                       <div className="flex-1 flex items-center gap-3">
                          <Cpu className="h-4 w-4 text-muted-foreground" />
                          <div>
                             <p className="text-[10px] text-muted-foreground uppercase font-bold">Resources</p>
                             <p className="text-xs font-bold">{h.resources.cpu} / {h.resources.ram}</p>
                          </div>
                       </div>
                       <div className="w-px h-8 bg-border/50" />
                       <div className="flex-1 flex items-center gap-3 pl-2">
                          <HardDrive className="h-4 w-4 text-muted-foreground" />
                          <div>
                             <p className="text-[10px] text-muted-foreground uppercase font-bold">Storage</p>
                             <p className="text-xs font-bold">{h.resources.storage}</p>
                          </div>
                       </div>
                    </div>

                    <div className="flex items-center justify-between border-t border-border/50 pt-4">
                       <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                          <Calendar className="h-3.5 w-3.5" />
                          Expires: <span className={cn(h.status === 'expired' && "text-red-500")}>{formatDate(h.expiryDate)}</span>
                       </div>
                       <p className="text-lg font-black">{formatCurrency(h.price)}<span className="text-[10px] font-bold text-muted-foreground uppercase ml-1">/{h.billingCycle === 'monthly' ? 'mo' : 'yr'}</span></p>
                    </div>
                 </div>
              </Card>
            );
          })
        ) : (
          <div className="col-span-full border-2 border-dashed border-border rounded-3xl p-20 flex flex-col items-center justify-center text-center space-y-4">
             <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center">
                <HardDrive className="h-10 w-10 text-muted-foreground" />
             </div>
             <div>
                <h3 className="text-2xl font-bold">No hosting found</h3>
                <p className="text-muted-foreground mt-1 max-w-sm">Try adjusting your filters or search query to find your hosting accounts.</p>
             </div>
             <Button variant="outline" className="rounded-xl px-8" onClick={() => { setSearchQuery(''); setStatusFilter('all'); }}>Clear Filters</Button>
          </div>
        )}
      </div>
    </div>
  );
}
