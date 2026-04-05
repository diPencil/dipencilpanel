'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { useInvoiceData } from '@/context/InvoiceContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Globe, Plus, Search, Trash2, RotateCcw, Monitor, Mail, Server, Info, Edit, Copy, Send } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/formatting';
import { cn } from '@/lib/utils';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
import { REGISTRAR_NAMESERVERS } from '@/lib/constants';
import { toast } from 'sonner';
import { RenewDomainDialog } from '@/components/domains/renew-domain-dialog';
import { EditDomainDialog } from '@/components/domains/edit-domain-dialog';
import { EditDomainDNSDialog } from '@/components/domains/edit-domain-dns-dialog';
import { SendReminderDialog } from '@/components/reminders/send-reminder-dialog';
import { sendReminderEmail, type ReminderItem } from '@/app/actions/reminder-emails';

type DomainFilter = 'all' | 'active' | 'expired' | 'expiring';

function getDaysUntilExpiry(expiryDate: string) {
  return Math.ceil((new Date(expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

function getDomainStatus(expiryDate: string, status: string) {
  if (status === 'suspended') return 'suspended';

  const daysUntilExpiry = getDaysUntilExpiry(expiryDate);
  if (daysUntilExpiry < 0 || status === 'expired') return 'expired';
  if (daysUntilExpiry <= 30) return 'expiring';
  return 'active';
}

export default function DomainsPage() {
  const { domains = [], clients = [], websites = [], emails = [], vps = [], deleteDomain, updateDomain, currentCompany } = useInvoiceData();
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<DomainFilter>('all');
  const [renewTarget, setRenewTarget] = useState<{ id: string; name: string } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [reminderTarget, setReminderTarget] = useState<ReminderItem | null>(null);
  const [isSendingReminder, setIsSendingReminder] = useState(false);
  const [editTarget, setEditTarget] = useState<string | null>(null);
  const [dnsTarget, setDnsTarget] = useState<string | null>(null);

  const domainRows = useMemo(() => {
    return (domains || []).map((domain) => {
      const computedStatus = getDomainStatus(domain.expiryDate, domain.status);
      const clientName = clients.find((client) => client.id === domain.clientId)?.name ?? 'Unassigned';
      const linkedWebsites = (domain.linkedServices?.websiteIds || [])
        .map((id) => websites.find((website) => website.id === id)?.name)
        .filter(Boolean) as string[];
      const linkedEmails = (domain.linkedServices?.emailIds || [])
        .map((id) => emails.find((email) => email.id === id)?.name)
        .filter(Boolean) as string[];
      const linkedVps = (domain.linkedServices?.vpsIds || [])
        .map((id) => vps.find((server) => server.id === id)?.name)
        .filter(Boolean) as string[];

      return {
        ...domain,
        clientName,
        computedStatus,
        linkedNames: [...linkedWebsites.map((name) => `Website: ${name}`), ...linkedEmails.map((name) => `Email: ${name}`), ...linkedVps.map((name) => `VPS: ${name}`)],
      };
    });
  }, [clients, domains, emails, vps, websites]);

  const filteredDomains = useMemo(() => {
    return domainRows.filter((domain) => {
      const searchMatch =
        `${domain.name}${domain.tld}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
        domain.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        domain.registrar.toLowerCase().includes(searchQuery.toLowerCase());
      const filterMatch = filter === 'all' || domain.computedStatus === filter;
      return searchMatch && filterMatch;
    });
  }, [domainRows, filter, searchQuery]);

  const counts = useMemo(() => ({
    all: domainRows.length,
    active: domainRows.filter((domain) => domain.computedStatus === 'active').length,
    expired: domainRows.filter((domain) => domain.computedStatus === 'expired').length,
    expiring: domainRows.filter((domain) => domain.computedStatus === 'expiring').length,
  }), [domainRows]);

  const handleRenew = (domain: typeof domainRows[0]) => {
    setRenewTarget({ id: domain.id, name: `${domain.name}${domain.tld}` });
  };

  const handleDelete = (id: string) => {
    setDeleteTarget(id);
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    deleteDomain(deleteTarget);
    setDeleteTarget(null);
    toast.success('Domain deleted');
  };

  const handleSendReminder = (domain: typeof domainRows[0]) => {
    const client = clients.find((c) => c.id === domain.clientId);
    const item: ReminderItem = {
      serviceId: domain.id,
      serviceType: 'domain',
      serviceName: `${domain.name}${domain.tld}`,
      clientId: domain.clientId ?? '',
      clientName: client?.name ?? domain.clientName,
      clientEmail: client?.email ?? '',
      expiryDate: domain.expiryDate,
      daysLeft: getDaysUntilExpiry(domain.expiryDate),
      price: domain.price ?? 0,
      currency: 'USD',
      subscriptionId: domain.subscriptionId ?? null,
      lastSentAt: null,
    };
    setReminderTarget(item);
  };

  const handleSendReminderConfirm = async (item: ReminderItem, ccEmails: string[]) => {
    setIsSendingReminder(true);
    try {
      await sendReminderEmail(currentCompany?.id ?? '', item, undefined, ccEmails);
      toast.success('Reminder sent');
      setReminderTarget(null);
    } catch {
      toast.error('Failed to send reminder');
    } finally {
      setIsSendingReminder(false);
    }
  };

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-50">Active</Badge>;
      case 'expiring':
        return <Badge className="bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-50">Expiring soon</Badge>;
      case 'expired':
        return <Badge className="bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-50">Expired</Badge>;
      case 'suspended':
        return <Badge variant="secondary">Suspended</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const renderServiceBadges = (names: string[]) => {
    if (!names.length) {
      return <span className="text-xs text-muted-foreground">No links</span>;
    }

    return (
      <div className="flex flex-wrap gap-1.5">
        {names.map((name) => (
          <Badge key={name} variant="outline" className="bg-muted/50">
            {name}
          </Badge>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm">
            <Globe className="h-3.5 w-3.5" />
            Domain Management
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Domain Portfolio</h1>
            <p className="text-muted-foreground mt-1">Track registrations, renewals, DNS, and linked services in one place.</p>
          </div>
        </div>

        <Link href="/dashboard/domains/new" className="w-full lg:w-auto">
          <Button className="w-full gap-2 lg:w-auto">
            <Plus className="h-4 w-4" />
            Add new domain
          </Button>
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Total domains</p>
          <p className="mt-2 text-2xl font-bold">{counts.all}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Active</p>
          <p className="mt-2 text-2xl font-bold text-emerald-600">{counts.active}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Expiring soon</p>
          <p className="mt-2 text-2xl font-bold text-amber-600">{counts.expiring}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Expired</p>
          <p className="mt-2 text-2xl font-bold text-rose-600">{counts.expired}</p>
        </Card>
      </div>

      <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full lg:max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search domain, client, or registrar"
            className="pl-9"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {(['all', 'active', 'expired', 'expiring'] as DomainFilter[]).map((option) => (
            <Button
              key={option}
              variant={filter === option ? 'default' : 'outline'}
              onClick={() => setFilter(option)}
              className="capitalize"
            >
              {option === 'expiring' ? 'Expiring soon' : option}
            </Button>
          ))}
        </div>
      </div>

      <Card className="overflow-hidden border-border/60 shadow-sm">
        <div className="hidden overflow-x-auto lg:block">
          <table className="w-full">
            <thead className="bg-muted/60">
              <tr className="text-left text-sm">
                <th className="px-5 py-4 font-semibold">Domain Name</th>
                <th className="px-5 py-4 font-semibold">Client Name</th>
                <th className="px-5 py-4 font-semibold">Status</th>
                <th className="px-5 py-4 font-semibold">Expiration Date</th>
                <th className="px-5 py-4 font-semibold">Auto-renew</th>
                <th className="px-5 py-4 font-semibold">Plan</th>
                <th className="px-5 py-4 font-semibold">Linked Services</th>
                <th className="px-5 py-4 font-semibold text-center">DNS</th>
                <th className="px-5 py-4 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredDomains.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center text-muted-foreground">
                    No domains match your filters.
                  </td>
                </tr>
              ) : (
                filteredDomains.map((domain) => {
                  const daysUntilExpiry = getDaysUntilExpiry(domain.expiryDate);

                  return (
                    <tr key={domain.id} className="border-t border-border/60 transition-colors hover:bg-muted/30">
                      <td className="px-5 py-4">
                        <div className="space-y-1">
                          <div className="font-semibold">{domain.name}{domain.tld}</div>
                          <div className="text-xs text-muted-foreground">{domain.registrar}</div>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-sm">{domain.clientName}</td>
                      <td className="px-5 py-4">{renderStatusBadge(domain.computedStatus)}</td>
                      <td className="px-5 py-4 text-sm">
                        <div className="space-y-1">
                          <div>{formatDate(domain.expiryDate)}</div>
                          <div className={cn('text-xs', daysUntilExpiry <= 30 ? 'text-amber-600' : 'text-muted-foreground')}>
                            {daysUntilExpiry > 0 ? `${daysUntilExpiry} days left` : 'Expired'}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <Switch
                          checked={domain.autoRenew}
                          onCheckedChange={(checked) => updateDomain(domain.id, { autoRenew: checked })}
                        />
                      </td>
                      <td className="px-5 py-4 text-sm">
                        <div className="space-y-1">
                          <div className="font-medium">{domain.planName}</div>
                          <div className="text-xs text-muted-foreground">{formatCurrency(domain.price, 'USD')} / year</div>
                        </div>
                      </td>
                      <td className="px-5 py-4">{renderServiceBadges(domain.linkedNames)}</td>
                      <td className="px-5 py-4">
                        <div className="flex justify-center">
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 rounded-full hover:bg-primary/10 hover:text-primary">
                                <Info className="h-4 w-4" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-80 p-0 overflow-hidden shadow-xl border-border/50" align="center">
                              <div className="bg-primary/5 p-4 border-b border-border/50 flex justify-between items-center">
                                <h4 className="font-bold text-sm tracking-tight">DNS/Nameservers</h4>
                                <Button variant="ghost" size="sm" className="h-7 text-[10px] uppercase font-bold text-primary hover:bg-primary/10" onClick={() => setDnsTarget(domain.id)}>Edit</Button>
                              </div>
                              <div className="p-4 space-y-3">
                                {domain.nameservers && domain.nameservers.length > 0 ? (
                                  domain.nameservers.map((ns, idx) => (
                                    <div key={idx} className="flex items-center justify-between group/ns p-2 rounded-lg hover:bg-muted/50 transition-colors">
                                      <code className="text-xs font-mono text-muted-foreground">{ns}</code>
                                      <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        className="h-6 w-6 p-0 opacity-0 group-hover/ns:opacity-100 transition-opacity"
                                        onClick={() => {
                                          navigator.clipboard.writeText(ns);
                                          toast.success('Copied to clipboard');
                                        }}
                                      >
                                        <Copy className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  ))
                                ) : (
                                  <p className="text-xs text-muted-foreground italic text-center py-2">No nameservers configured</p>
                                )}
                                
                                {domain.registrar && REGISTRAR_NAMESERVERS[domain.registrar] && (
                                  <div className="pt-2">
                                     <p className="text-[10px] uppercase font-bold text-muted-foreground mb-2">Default for {domain.registrar}:</p>
                                     <div className="bg-muted p-2 rounded-lg space-y-1">
                                        {REGISTRAR_NAMESERVERS[domain.registrar].map((ns, idx) => (
                                          <div key={idx} className="text-[10px] font-mono text-muted-foreground/70">{ns}</div>
                                        ))}
                                     </div>
                                  </div>
                                )}
                              </div>
                            </PopoverContent>
                          </Popover>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <Link href={`/dashboard/domains/${domain.id}`}>
                            <Button variant="outline" size="sm">Manage</Button>
                          </Link>
                          <Button variant="outline" size="sm" onClick={() => setEditTarget(domain.id)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => handleRenew(domain)}>
                            <RotateCcw className="mr-2 h-4 w-4" />
                            Renew
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => handleSendReminder(domain)}>
                            <Send className="mr-2 h-4 w-4" />
                            Reminder
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDelete(domain.id)} className="text-destructive hover:text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="space-y-3 p-4 lg:hidden">
          {filteredDomains.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              No domains match your filters.
            </div>
          ) : (
            filteredDomains.map((domain) => {
              const daysUntilExpiry = getDaysUntilExpiry(domain.expiryDate);

              return (
                <Card key={domain.id} className="p-4 shadow-sm">
                  <div className="space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-semibold">{domain.name}{domain.tld}</div>
                        <div className="text-xs text-muted-foreground">{domain.clientName}</div>
                      </div>
                      {renderStatusBadge(domain.computedStatus)}
                    </div>

                    <div className="grid gap-3 text-sm sm:grid-cols-2">
                      <div>
                        <div className="text-xs uppercase tracking-wide text-muted-foreground">Expiration</div>
                        <div className="mt-1">{formatDate(domain.expiryDate)}</div>
                        <div className="text-xs text-muted-foreground">{daysUntilExpiry > 0 ? `${daysUntilExpiry} days left` : 'Expired'}</div>
                      </div>
                      <div>
                        <div className="text-xs uppercase tracking-wide text-muted-foreground">Plan</div>
                        <div className="mt-1 font-medium">{domain.planName}</div>
                        <div className="text-xs text-muted-foreground">{formatCurrency(domain.price, 'USD')} / year</div>
                      </div>
                    </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="text-xs uppercase tracking-wide text-muted-foreground">Linked services</div>
                          <Popover>
                            <PopoverTrigger asChild>
                               <Button variant="outline" size="sm" className="h-7 text-[10px] gap-1.5 rounded-full">
                                  <Info className="h-3 w-3" /> DNS/Nameservers
                               </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[calc(100vw-2rem)] mx-4 sm:w-80 p-0 overflow-hidden shadow-xl border-border/50">
                               <div className="bg-primary/5 p-4 border-b border-border/50 flex justify-between items-center">
                                <h4 className="font-bold text-sm tracking-tight">DNS/Nameservers</h4>
                                <Button variant="ghost" size="sm" className="h-7 text-[10px] uppercase font-bold text-primary hover:bg-primary/10" onClick={() => setDnsTarget(domain.id)}>Edit</Button>
                              </div>
                              <div className="p-4 space-y-3">
                                {domain.nameservers && domain.nameservers.length > 0 ? (
                                  domain.nameservers.map((ns, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                                      <code className="text-xs font-mono text-muted-foreground">{ns}</code>
                                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => navigator.clipboard.writeText(ns)}>
                                        <Copy className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  ))
                                ) : (
                                  <p className="text-xs text-muted-foreground italic text-center py-2">No nameservers configured</p>
                                )}
                              </div>
                            </PopoverContent>
                          </Popover>
                        </div>
                        {renderServiceBadges(domain.linkedNames)}
                      </div>

                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>Auto-renew</span>
                        <Switch
                          checked={domain.autoRenew}
                          onCheckedChange={(checked) => updateDomain(domain.id, { autoRenew: checked })}
                        />
                      </div>
                      <div className="flex flex-wrap justify-end gap-2">
                        <Link href={`/dashboard/domains/${domain.id}`}>
                          <Button variant="outline" size="sm">Manage</Button>
                        </Link>
                        <Button variant="outline" size="sm" onClick={() => setEditTarget(domain.id)}>Edit</Button>
                        <Button variant="outline" size="sm" onClick={() => handleRenew(domain)}>Renew</Button>
                        <Button variant="outline" size="sm" onClick={() => handleSendReminder(domain)}>
                          <Send className="mr-1.5 h-3.5 w-3.5" />
                          Reminder
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(domain.id)} className="text-destructive hover:text-destructive">Delete</Button>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })
          )}
        </div>
      </Card>

      {/* Edit domain dialog */}
      <EditDomainDialog
        open={!!editTarget}
        onOpenChange={(open) => { if (!open) setEditTarget(null); }}
        domainId={editTarget}
      />

      {/* Edit DNS nameservers dialog */}
      <EditDomainDNSDialog
        open={!!dnsTarget}
        onOpenChange={(open) => { if (!open) setDnsTarget(null); }}
        domainId={dnsTarget}
      />

      {/* Renew domain dialog */}
      <RenewDomainDialog
        open={!!renewTarget}
        onOpenChange={(open) => { if (!open) setRenewTarget(null); }}
        domainId={renewTarget?.id ?? null}
        domainName={renewTarget?.name ?? ''}
      />

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete domain?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the domain and cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Send reminder dialog */}
      <SendReminderDialog
        item={reminderTarget}
        open={!!reminderTarget}
        onOpenChange={(open) => { if (!open) setReminderTarget(null); }}
        onSend={handleSendReminderConfirm}
        isSending={isSendingReminder}
      />
    </div>
  );
}