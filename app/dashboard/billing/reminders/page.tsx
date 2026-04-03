'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useInvoiceData } from '@/context/InvoiceContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import {
  Send, Search, RefreshCw, Globe, HardDrive,
  Server, Mail, Monitor, Smartphone, AlertTriangle,
  Clock, CheckCircle, Filter,
} from 'lucide-react';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { RenewSubscriptionDialog } from '@/components/subscriptions/renew-subscription-dialog';
import { SendReminderDialog } from '@/components/reminders/send-reminder-dialog';
import { getReminderItems, sendReminderEmail, type ReminderItem, type ServiceType } from '@/app/actions/reminder-emails';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SERVICE_ICONS: Record<ServiceType, React.ReactNode> = {
  domain: <Globe className="h-4 w-4" />,
  hosting: <HardDrive className="h-4 w-4" />,
  vps: <Server className="h-4 w-4" />,
  email: <Mail className="h-4 w-4" />,
  website: <Monitor className="h-4 w-4" />,
  mobile_app: <Smartphone className="h-4 w-4" />,
};

const SERVICE_LABELS: Record<ServiceType, string> = {
  domain: 'Domain',
  hosting: 'Hosting',
  vps: 'VPS',
  email: 'Email',
  website: 'Website',
  mobile_app: 'Mobile App',
};

function UrgencyBadge({ days }: { days: number }) {
  if (days < 0) return <Badge className="bg-red-500/15 text-red-600 border-red-500/25 gap-1"><AlertTriangle className="h-3 w-3" /> Expired</Badge>;
  if (days === 0) return <Badge className="bg-red-500/15 text-red-600 border-red-500/25 gap-1"><AlertTriangle className="h-3 w-3" /> Today</Badge>;
  if (days <= 7) return <Badge className="bg-orange-500/15 text-orange-600 border-orange-500/25 gap-1"><Clock className="h-3 w-3" /> {days}d left</Badge>;
  if (days <= 30) return <Badge className="bg-yellow-500/15 text-yellow-600 border-yellow-500/25 gap-1"><Clock className="h-3 w-3" /> {days}d left</Badge>;
  return <Badge className="bg-blue-500/15 text-blue-600 border-blue-500/25 gap-1"><Clock className="h-3 w-3" /> {days}d left</Badge>;
}

function formatDateShort(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function RemindersPage() {
  const { company } = useInvoiceData();
  const [items, setItems] = useState<ReminderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'all' | ServiceType>('all');
  const [filterUrgency, setFilterUrgency] = useState<'all' | 'expired' | 'today' | '7d' | '30d'>('all');

  const [renewTarget, setRenewTarget] = useState<ReminderItem | null>(null);
  const [sendReminderItem, setSendReminderItem] = useState<ReminderItem | null>(null);

  const load = useCallback(async () => {
    if (!company.id) return;
    setLoading(true);
    const res = await getReminderItems(company.id);
    if (res.success) setItems(res.data);
    else toast.error('Failed to load reminders');
    setLoading(false);
  }, [company.id]);

  useEffect(() => { void load(); }, [load]);

  const filtered = useMemo(() => {
    return items.filter((item) => {
      if (filterType !== 'all' && item.serviceType !== filterType) return false;
      if (filterUrgency === 'expired' && item.daysLeft >= 0) return false;
      if (filterUrgency === 'today' && item.daysLeft !== 0) return false;
      if (filterUrgency === '7d' && (item.daysLeft < 0 || item.daysLeft > 7)) return false;
      if (filterUrgency === '30d' && (item.daysLeft < 0 || item.daysLeft > 30)) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!item.clientName.toLowerCase().includes(q) && !item.serviceName.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [items, filterType, filterUrgency, search]);

  // Summary counts
  const counts = useMemo(() => ({
    expired: items.filter((i) => i.daysLeft < 0).length,
    today: items.filter((i) => i.daysLeft === 0).length,
    week: items.filter((i) => i.daysLeft >= 0 && i.daysLeft <= 7).length,
    month: items.filter((i) => i.daysLeft >= 0 && i.daysLeft <= 30).length,
  }), [items]);

  const openSendReminder = useCallback((item: ReminderItem) => {
    if (!item.clientEmail?.trim()) {
      toast.error('Client has no email address');
      return;
    }
    setSendReminderItem(item);
  }, []);

  const handleSendReminderConfirm = async (item: ReminderItem, ccEmails: string[]) => {
    setSendingId(item.serviceId);
    try {
      const res = await sendReminderEmail(company.id, item, undefined, ccEmails);
      if (res.success) {
        const ccText = ccEmails.length > 0 ? ` + ${ccEmails.length} CC` : '';
        toast.success(`Reminder sent to ${item.clientEmail}${ccText}`);
        setSendReminderItem(null);
        setItems((prev) =>
          prev.map((i) =>
            i.serviceId === item.serviceId ? { ...i, lastSentAt: new Date().toISOString() } : i,
          ),
        );
      } else {
        toast.error(res.error ?? 'Failed to send');
      }
    } finally {
      setSendingId(null);
    }
  };

  const openRenewDialog = useCallback((item: ReminderItem) => {
    if (!item.subscriptionId) return;
    setRenewTarget(item);
  }, []);

  return (
    <TooltipProvider delayDuration={300}>
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Subscription Reminders
          </h1>
          <p className="text-muted-foreground mt-1">
            Services expiring within 60 days — send renewal reminders to clients
          </p>
        </div>
        <Button variant="outline" onClick={load} disabled={loading} className="gap-2 self-start">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Expired', count: counts.expired, color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900', urgency: 'expired' as const },
          { label: 'Today', count: counts.today, color: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-900', urgency: 'today' as const },
          { label: 'Within 7 days', count: counts.week, color: 'text-yellow-600', bg: 'bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-900', urgency: '7d' as const },
          { label: 'Within 30 days', count: counts.month, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900', urgency: '30d' as const },
        ].map((s) => (
          <Card
            key={s.label}
            className={`p-4 cursor-pointer border transition-all hover:shadow-md ${s.bg} ${filterUrgency === s.urgency ? 'ring-2 ring-primary' : ''}`}
            onClick={() => setFilterUrgency((prev) => prev === s.urgency ? 'all' : s.urgency)}
          >
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{s.label}</p>
            <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.count}</p>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by client or service..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={filterType} onValueChange={(v) => setFilterType(v as typeof filterType)}>
          <SelectTrigger className="w-44">
            <Filter className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Services</SelectItem>
            <SelectItem value="domain">Domains</SelectItem>
            <SelectItem value="hosting">Hosting</SelectItem>
            <SelectItem value="vps">VPS</SelectItem>
            <SelectItem value="email">Email</SelectItem>
            <SelectItem value="website">Websites</SelectItem>
            <SelectItem value="mobile_app">Mobile Apps</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card className="border-border/50 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Client</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Service</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Expiry Date</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Status</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Last Sent</th>
                <th className="px-5 py-3.5 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-muted-foreground">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 opacity-40" />
                    Loading reminders…
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-muted-foreground">
                    <CheckCircle className="h-8 w-8 mx-auto mb-2 opacity-20" />
                    <p className="font-medium">No expiring services found</p>
                    <p className="text-sm mt-1">All services are in good standing or no data matches your filter.</p>
                  </td>
                </tr>
              ) : (
                filtered.map((item) => (
                  <tr key={`${item.serviceType}-${item.serviceId}`} className="hover:bg-muted/30 transition-colors">
                    {/* Client */}
                    <td className="px-5 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">{item.clientName}</span>
                        <span className="text-xs text-muted-foreground">{item.clientEmail}</span>
                      </div>
                    </td>
                    {/* Service */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">{SERVICE_ICONS[item.serviceType]}</span>
                        <div className="flex flex-col">
                          <span className="text-sm font-medium">{item.serviceName}</span>
                          <span className="text-xs text-muted-foreground">{SERVICE_LABELS[item.serviceType]}</span>
                        </div>
                      </div>
                    </td>
                    {/* Expiry */}
                    <td className="px-5 py-4">
                      <span className="text-sm">{formatDateShort(item.expiryDate)}</span>
                    </td>
                    {/* Urgency */}
                    <td className="px-5 py-4">
                      <UrgencyBadge days={item.daysLeft} />
                    </td>
                    {/* Last Sent */}
                    <td className="px-5 py-4">
                      {item.lastSentAt ? (
                        <span className="text-xs text-muted-foreground">{formatDateShort(item.lastSentAt)}</span>
                      ) : (
                        <span className="text-xs text-muted-foreground/50">Never</span>
                      )}
                    </td>
                    {/* Actions */}
                    <td className="px-5 py-4 text-right">
                      <div className="inline-flex items-center justify-end gap-0.5">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              disabled={sendingId === item.serviceId}
                              onClick={() => openSendReminder(item)}
                              aria-label={item.lastSentAt ? 'Resend reminder' : 'Send reminder'}
                            >
                              <Send className={`h-4 w-4 ${sendingId === item.serviceId ? 'opacity-40' : ''}`} />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="left">
                            {sendingId === item.serviceId ? 'Sending…' : item.lastSentAt ? 'Resend reminder' : 'Send reminder'}
                          </TooltipContent>
                        </Tooltip>
                        {item.subscriptionId ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => openRenewDialog(item)}
                                aria-label="Renew and create invoice"
                              >
                                <RefreshCw className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="left">Renew and invoice</TooltipContent>
                          </Tooltip>
                        ) : (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="inline-flex">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  disabled
                                  aria-label="Renewal unavailable"
                                >
                                  <RefreshCw className="h-4 w-4 opacity-40" />
                                </Button>
                              </span>
                            </TooltipTrigger>
                            <TooltipContent side="left">Renewal needs a linked subscription</TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {filtered.length > 0 && (
          <div className="px-5 py-3 border-t border-border/50 bg-muted/30 text-xs text-muted-foreground">
            Showing {filtered.length} of {items.length} expiring service(s)
          </div>
        )}
      </Card>

      <SendReminderDialog
        item={sendReminderItem}
        open={!!sendReminderItem}
        onOpenChange={(open) => {
          if (!open) setSendReminderItem(null);
        }}
        onSend={handleSendReminderConfirm}
        isSending={!!sendReminderItem && sendingId === sendReminderItem.serviceId}
      />

      <RenewSubscriptionDialog
        open={!!renewTarget}
        onOpenChange={(open) => {
          if (!open) setRenewTarget(null);
        }}
        subscriptionId={renewTarget?.subscriptionId ?? null}
        serviceName={renewTarget?.serviceName ?? ''}
        onSuccess={() => void load()}
      />
    </div>
    </TooltipProvider>
  );
}
