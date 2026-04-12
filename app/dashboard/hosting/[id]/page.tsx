'use client';

import React, { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useInvoiceData } from '@/context/InvoiceContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Globe,
  ChevronLeft,
  Settings,
  Mail,
  Zap,
  Activity,
  Cpu,
  HardDrive,
  RotateCcw,
  History,
  ShieldCheck,
  CreditCard,
  ExternalLink,
  ChevronRight,
  Info,
  Calendar,
  MoreVertical,
  Trash2,
  XCircle,
  Pencil,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatCurrency, formatDate, formatDateForInput } from '@/lib/formatting';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { calculateInvoiceTotals } from '@/lib/invoice-utils';
import type { Hosting, InvoiceItem } from '@/lib/types';

function parseCapacityGb(text: string): number | null {
  const m = text.match(/([\d.]+)\s*(GB|TB)/i);
  if (!m) return null;
  const n = Number(m[1]);
  if (!Number.isFinite(n)) return null;
  return m[2].toUpperCase() === 'TB' ? n * 1024 : n;
}

function stablePercent(seed: string, salt: string): number {
  let h = 0;
  const s = seed + salt;
  for (let i = 0; i < s.length; i++) {
    h = Math.imul(31, h) + s.charCodeAt(i);
  }
  return 28 + (Math.abs(h) % 52);
}

function usageLineFromCapGb(capGb: number, capDisplay: string, seed: string, salt: string): { line: string; pct: number } {
  const pct = stablePercent(seed, salt);
  const usedGb = capGb * (pct / 100);
  const usedStr = capGb >= 1024 ? `${(usedGb / 1024).toFixed(1)} TB` : `${usedGb.toFixed(1)} GB`;
  return { line: `${usedStr} / ${capDisplay}`, pct };
}

function HostingDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    hosting = [],
    clients = [],
    domains = [],
    emails = [],
    vps = [],
    subscriptions = [],
    invoices = [],
    deleteHosting,
    suspendHosting,
    renewHosting,
    updateHosting,
    addInvoice,
    company,
    currentCompany,
  } = useInvoiceData();

  const hostingId = params.id as string;
  const h = useMemo(() => hosting.find((x) => x.id === hostingId), [hosting, hostingId]);
  const client = useMemo(() => clients.find((c) => c.id === h?.clientId), [clients, h]);
  const subscription = useMemo(
    () => subscriptions.find((s) => s.id === h?.subscriptionId),
    [subscriptions, h],
  );

  const linkedEmails = useMemo(
    () => emails.filter((e) => h?.linkedServices.emailIds.includes(e.id)),
    [emails, h],
  );
  const linkedVps = useMemo(
    () => vps.filter((v) => h?.linkedServices.vpsIds.includes(v.id)),
    [vps, h],
  );

  const clientDomains = useMemo(
    () => (client ? domains.filter((d) => d.clientId === client.id) : []),
    [domains, client],
  );

  const primaryDomain = useMemo(() => {
    if (!h || !clientDomains.length) return null;
    if (h.domainId) {
      const byId = clientDomains.find((d) => d.id === h.domainId);
      if (byId) return byId;
    }
    return clientDomains.length === 1 ? clientDomains[0] : null;
  }, [h, clientDomains]);

  const invoiceCurrency = h?.currency ?? currentCompany?.currency ?? company.currency ?? 'USD';

  const lastHostingInvoice = useMemo(() => {
    if (!h) return undefined;
    const related = invoices
      .filter((inv) => {
        if (inv.clientId !== h.clientId) return false;
        if (h.subscriptionId && inv.subscriptionId === h.subscriptionId) return true;
        if (inv.notes?.includes(h.name)) return true;
        return inv.items.some(
          (it) =>
            it.description.toLowerCase().includes('hosting') &&
            (it.description.includes(h.planName) || it.description.includes(h.name)),
        );
      })
      .sort((a, b) => new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime());
    return related[0];
  }, [invoices, h]);

  const serviceCounts = useMemo(() => {
    if (!client) {
      return { domains: 0, hosting: 0, email: 0, vps: 0, total: 0 };
    }
    const d = domains.filter((x) => x.clientId === client.id).length;
    const ho = hosting.filter((x) => x.clientId === client.id).length;
    const em = emails.filter((x) => x.clientId === client.id).length;
    const vp = vps.filter((x) => x.clientId === client.id).length;
    return { domains: d, hosting: ho, email: em, vps: vp, total: d + ho + em + vp };
  }, [client, domains, hosting, emails, vps]);

  const resourceMetrics = useMemo(() => {
    if (!h) return [];
    const storageCap = parseCapacityGb(h.resources.storage);
    const bandwidthCap = parseCapacityGb(h.resources.bandwidth);
    const storageMetric =
      storageCap != null
        ? usageLineFromCapGb(storageCap, h.resources.storage, h.id, 'stor')
        : { line: h.resources.storage || '—', pct: stablePercent(h.id, 'stor') };
    const bandwidthMetric =
      bandwidthCap != null
        ? usageLineFromCapGb(bandwidthCap, h.resources.bandwidth, h.id, 'bw')
        : { line: h.resources.bandwidth || '—', pct: stablePercent(h.id, 'bw') };

    return [
      {
        label: 'Cloud CPU',
        value: stablePercent(h.id, 'cpu'),
        text: h.resources.cpu,
        icon: Cpu,
        color: 'from-blue-500 to-blue-600',
      },
      {
        label: 'Memory',
        value: stablePercent(h.id, 'ram'),
        text: h.resources.ram,
        icon: Zap,
        color: 'from-purple-500 to-purple-600',
      },
      {
        label: 'NVMe Storage',
        value: storageMetric.pct,
        text: storageMetric.line,
        icon: HardDrive,
        color: 'from-orange-500 to-orange-600',
      },
      {
        label: 'Data Transfer',
        value: bandwidthMetric.pct,
        text: bandwidthMetric.line,
        icon: Globe,
        color: 'from-green-500 to-green-600',
      },
    ];
  }, [h]);

  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPlanName, setEditPlanName] = useState('');
  const [editType, setEditType] = useState<Hosting['type']>('web');
  const [editPrice, setEditPrice] = useState('');
  const [editBillingCycle, setEditBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [editExpiry, setEditExpiry] = useState('');
  const [editCpu, setEditCpu] = useState('');
  const [editRam, setEditRam] = useState('');
  const [editStorage, setEditStorage] = useState('');
  const [editBandwidth, setEditBandwidth] = useState('');
  const [editCurrency, setEditCurrency] = useState('USD');

  useEffect(() => {
    if (searchParams.get('edit') === '1') {
      setEditOpen(true);
      router.replace(`/dashboard/hosting/${hostingId}`, { scroll: false });
    }
  }, [searchParams, router, hostingId]);

  useEffect(() => {
    if (!editOpen || !h) return;
    setEditName(h.name);
    setEditPlanName(h.planName);
    setEditType(h.type);
    setEditPrice(String(h.price));
    setEditBillingCycle(h.billingCycle);
    setEditExpiry(formatDateForInput(h.expiryDate));
    setEditCpu(h.resources.cpu);
    setEditRam(h.resources.ram);
    setEditStorage(h.resources.storage);
    setEditBandwidth(h.resources.bandwidth);
    setEditCurrency(h.currency ?? invoiceCurrency);
  }, [editOpen, h, invoiceCurrency]);

  if (!h) {
    return (
      <div className="flex flex-col items-center justify-center p-20 space-y-4">
        <XCircle className="h-12 w-12 text-destructive" />
        <h1 className="text-2xl font-bold">Hosting not found</h1>
        <Link href="/dashboard/hosting">
          <Button variant="outline">Back to Hosting</Button>
        </Link>
      </div>
    );
  }

  const handleDelete = () => {
    deleteHosting(h.id);
    toast.success('Hosting account deleted');
    router.push('/dashboard/hosting');
  };

  const handleSaveEdit = () => {
    const price = Number.parseFloat(editPrice);
    if (!Number.isFinite(price) || price < 0) {
      toast.error('Enter a valid price');
      return;
    }
    updateHosting(h.id, {
      name: editName.trim(),
      planName: editPlanName.trim(),
      type: editType,
      price,
      billingCycle: editBillingCycle,
      expiryDate: new Date(editExpiry).toISOString(),
      resources: {
        cpu: editCpu.trim(),
        ram: editRam.trim(),
        storage: editStorage.trim(),
        bandwidth: editBandwidth.trim(),
      },
      currency: editCurrency,
    });
    toast.success('Hosting updated');
    setEditOpen(false);
  };

  const handleManualInvoice = () => {
    const taxRate = company.taxRate ?? 0;
    const item: InvoiceItem = {
      id: `line-${Date.now()}`,
      description: `Web hosting — ${h.planName} (${h.name})`,
      quantity: 1,
      price: h.price,
      discount: 0,
      vat: taxRate,
    };
    const totals = calculateInvoiceTotals([item]);
    const created = addInvoice({
      clientId: h.clientId,
      companyId: h.companyId,
      invoiceKind: 'client',
      counterpartyName: null,
      counterpartyAddress: null,
      issueDate: new Date().toISOString(),
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      nextBillingDate: h.expiryDate,
      currency: invoiceCurrency,
      status: 'pending',
      paymentStatus: 'unpaid',
      items: [item],
      notes: `Hosting service — ${h.name} (${h.id})`,
      serviceType: 'hosting',
      serviceId: h.id,
      serviceName: h.name,
      subscriptionId: h.subscriptionId,
      ...totals,
    });
    if (created) {
      toast.success('Invoice created');
      router.push(`/dashboard/billing/invoices/${created.id}`);
    }
  };

  const recurringFeeLabel = h.billingCycle === 'monthly' ? 'Monthly fee' : 'Yearly fee';
  const billingCycleUpper = h.billingCycle === 'monthly' ? 'MONTHLY' : 'YEARLY';
  const paymentModeLabel =
    subscription && subscription.autoRenew === false ? 'Manual payment' : 'Automatic payment';

  const subscriptionHref = h.subscriptionId
    ? `/dashboard/billing/subscriptions/${h.subscriptionId}`
    : '/dashboard/billing/subscriptions';

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-[1600px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/hosting">
            <Button variant="ghost" size="icon" className="rounded-xl h-10 w-10 border border-border/50">
              <ChevronLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
              <HardDrive className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">{h.name}</h1>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest leading-none mt-1">
                Hosting Account
              </p>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="default"
            className="rounded-xl gap-2 font-bold px-6 shadow-sm"
            onClick={() => setEditOpen(true)}
          >
            <Pencil className="h-4 w-4" /> Edit
          </Button>
          <Button
            type="button"
            variant="outline"
            className="rounded-xl gap-2 font-bold px-6 shadow-sm"
            onClick={() =>
              toast.message('Control panel', {
                description: 'Add your provider control-panel URL in company or hosting settings when available.',
              })
            }
          >
            <Settings className="h-4 w-4" /> Control Panel
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="rounded-xl h-10 w-10 border-border/50 shadow-sm">
                <MoreVertical className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 p-2 rounded-2xl shadow-xl">
              <DropdownMenuLabel className="mb-2 uppercase text-[10px] font-black tracking-widest text-muted-foreground/60">
                Account Operations
              </DropdownMenuLabel>
              <DropdownMenuItem onClick={() => setEditOpen(true)} className="rounded-xl py-2.5">
                <Pencil className="h-4 w-4 mr-3" /> Edit details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => renewHosting(h.id)} className="rounded-xl py-2.5">
                <RotateCcw className="h-4 w-4 mr-3" /> Renew Cycle
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => suspendHosting(h.id)} className="rounded-xl py-2.5 text-amber-600">
                <History className="h-4 w-4 mr-3" /> Suspend Service
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleDelete} className="rounded-xl py-2.5 text-destructive font-bold focus:bg-destructive focus:text-white">
                <Trash2 className="h-4 w-4 mr-3" /> Terminate Account
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit hosting</DialogTitle>
            <DialogDescription>Update plan, billing, expiry, and resource labels for this account.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="host-name">Account name</Label>
              <Input id="host-name" value={editName} onChange={(e) => setEditName(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="host-plan">Plan name</Label>
              <Input id="host-plan" value={editPlanName} onChange={(e) => setEditPlanName(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label>Type</Label>
                <Select value={editType} onValueChange={(v) => setEditType(v as Hosting['type'])}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="web">Web</SelectItem>
                    <SelectItem value="wordpress">WordPress</SelectItem>
                    <SelectItem value="node">Node</SelectItem>
                    <SelectItem value="cloud">Cloud</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Billing cycle</Label>
                <Select
                  value={editBillingCycle}
                  onValueChange={(v) => setEditBillingCycle(v as 'monthly' | 'yearly')}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label htmlFor="host-price">Price</Label>
                <Input id="host-price" type="number" min={0} step="0.01" value={editPrice} onChange={(e) => setEditPrice(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label>Currency</Label>
                <Select value={editCurrency} onValueChange={setEditCurrency}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                    <SelectItem value="SAR">SAR</SelectItem>
                    <SelectItem value="EGP">EGP</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="host-expiry">Expiry date</Label>
              <Input id="host-expiry" type="date" value={editExpiry} onChange={(e) => setEditExpiry(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="host-cpu">CPU label</Label>
              <Input id="host-cpu" value={editCpu} onChange={(e) => setEditCpu(e.target.value)} placeholder="e.g. Shared" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="host-ram">Memory label</Label>
              <Input id="host-ram" value={editRam} onChange={(e) => setEditRam(e.target.value)} placeholder="e.g. 768 MB" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="host-storage">Storage label</Label>
              <Input id="host-storage" value={editStorage} onChange={(e) => setEditStorage(e.target.value)} placeholder="e.g. 10 GB SSD" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="host-bw">Bandwidth label</Label>
              <Input id="host-bw" value={editBandwidth} onChange={(e) => setEditBandwidth(e.target.value)} placeholder="e.g. 100 GB" />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={handleSaveEdit}>
              Save changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <Card className="p-8 border-none bg-primary/5 shadow-sm relative overflow-hidden ring-1 ring-primary/20">
            <div className="absolute top-0 right-0 p-8 opacity-10">
              <Activity className="h-32 w-32" />
            </div>
            <div className="flex flex-col md:flex-row items-center gap-8 relative z-10">
              <div className="flex-1 space-y-4 text-center md:text-left">
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-4">
                  <Badge className="bg-green-500 border-none px-4 py-1 h-7 font-black tracking-widest shadow-md flex items-center gap-1.5">
                    <ShieldCheck className="h-3.5 w-3.5" /> {h.status.toUpperCase()}
                  </Badge>
                  <Badge variant="outline" className="h-7 px-4 font-black tracking-widest border-primary/20 bg-primary/5 uppercase text-primary">
                    {h.type.toUpperCase()}
                  </Badge>
                </div>
                <div>
                  <h2 className="text-3xl font-black mb-2">{h.planName} Plan</h2>
                  <p className="text-muted-foreground">
                    Service is running optimally on {h.type} hosting clusters. All resources are within limits.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-12 px-8 py-4 bg-card rounded-3xl shadow-sm border border-border/50">
                <div className="text-center">
                  <p className="text-[10px] uppercase font-black text-muted-foreground tracking-widest mb-1">Price</p>
                  <p className="text-2xl font-black">{formatCurrency(h.price, invoiceCurrency)}</p>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase">{billingCycleUpper}</p>
                </div>
                <div className="w-px h-12 bg-border/50" />
                <div className="text-center">
                  <p className="text-[10px] uppercase font-black text-muted-foreground tracking-widest mb-1">Expires</p>
                  <p className="text-2xl font-black tracking-tight">{formatDate(h.expiryDate).split(',')[0]}</p>
                  <Link
                    href={subscriptionHref}
                    className="text-blue-500 text-[10px] font-bold uppercase hover:underline inline-block mt-1"
                  >
                    View subscription
                  </Link>
                </div>
              </div>
            </div>
          </Card>

          <div className="space-y-4">
            <div className="flex items-end justify-between">
              <h3 className="text-xl font-bold px-2 tracking-tight">Resource Utilization</h3>
              <Button variant="ghost" className="text-xs uppercase font-black text-primary gap-1.5 h-8" asChild>
                <Link href="/dashboard/billing">
                  View billing &amp; renewals <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {resourceMetrics.map((r, i) => (
                <Card key={i} className="p-6 border-border/50 shadow-sm group hover:scale-[1.02] transition-transform">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 bg-muted rounded-xl flex items-center justify-center text-muted-foreground group-hover:text-primary transition-colors">
                        <r.icon className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm font-bold tracking-tight">{r.label}</p>
                        <p className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">{r.text}</p>
                      </div>
                    </div>
                    <span className="text-xl font-black">{r.value}%</span>
                  </div>
                  <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                    <div className={cn('h-full rounded-full bg-linear-to-r', r.color)} style={{ width: `${r.value}%` }} />
                  </div>
                </Card>
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground px-2">
              Usage bars are estimates from plan limits until your provider sends live metrics.
            </p>
          </div>

          <div className="space-y-4">
            <h3 className="text-xl font-bold px-2 tracking-tight">Integrated Services</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="p-6 bg-card border-none shadow-sm relative overflow-hidden group border border-border/10 ring-1 ring-border/5">
                <div className="absolute top-0 left-0 w-1 h-full bg-blue-500" />
                <div className="flex flex-col h-full space-y-4">
                  <div className="flex items-center gap-3">
                    <Globe className="h-5 w-5 text-blue-500" />
                    <h4 className="font-bold text-sm">Primary Domain</h4>
                  </div>
                  <div className="flex-1">
                    <p className="font-black text-lg tracking-tight uppercase">
                      {primaryDomain ? `${primaryDomain.name}${primaryDomain.tld}` : 'Not linked'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Status:{' '}
                      <span className="text-green-500 font-bold uppercase">
                        {primaryDomain?.status ?? '—'}
                      </span>
                    </p>
                    {clientDomains.length > 1 && !primaryDomain && (
                      <p className="text-[10px] text-muted-foreground mt-2">
                        This client has {clientDomains.length} domains — open Domains to choose which one to attach.
                      </p>
                    )}
                  </div>
                  <Button variant="ghost" size="sm" className="w-full h-9 rounded-lg gap-2 text-[10px] uppercase font-bold text-blue-600 hover:bg-blue-50" asChild>
                    <Link href={primaryDomain ? `/dashboard/domains/${primaryDomain.id}` : '/dashboard/domains/dns'}>
                      {primaryDomain ? 'Domain details' : 'DNS management'} <ExternalLink className="h-3 w-3" />
                    </Link>
                  </Button>
                </div>
              </Card>

              <Card className="p-6 bg-card border-none shadow-sm relative overflow-hidden group border border-border/10 ring-1 ring-border/5">
                <div className="absolute top-0 left-0 w-1 h-full bg-purple-500" />
                <div className="flex flex-col h-full space-y-4">
                  <div className="flex items-center gap-3">
                    <Mail className="h-5 w-5 text-purple-500" />
                    <h4 className="font-bold text-sm">Business Email</h4>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-baseline gap-2">
                      <p className="font-black text-2xl tracking-tight leading-none uppercase">{linkedEmails.length}</p>
                      <span className="text-xs font-bold text-muted-foreground uppercase">Accounts</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Plan: Starter Email</p>
                  </div>
                  <Button variant="ghost" size="sm" className="w-full h-9 rounded-lg gap-2 text-[10px] uppercase font-bold text-purple-600 hover:bg-purple-50" asChild>
                    <Link href="/dashboard/emails">
                      Manage accounts <ExternalLink className="h-3 w-3" />
                    </Link>
                  </Button>
                </div>
              </Card>

              <Card className="p-6 bg-card border-none shadow-sm relative overflow-hidden group border border-border/10 ring-1 ring-border/5">
                <div className="absolute top-0 left-0 w-1 h-full bg-orange-500" />
                <div className="flex flex-col h-full space-y-4">
                  <div className="flex items-center gap-3">
                    <Zap className="h-5 w-5 text-orange-500" />
                    <h4 className="font-bold text-sm">Dedicated VPS</h4>
                  </div>
                  <div className="flex-1">
                    <p className="font-black text-lg tracking-tight uppercase">{linkedVps[0]?.name || 'No VPS Active'}</p>
                    {linkedVps[0] && (
                      <div className="flex items-center gap-1.5 mt-2">
                        <Badge className="bg-orange-500 h-4 text-[8px] uppercase px-1.5 focus:ring-0">{linkedVps[0].planName}</Badge>
                      </div>
                    )}
                  </div>
                  <Button variant="ghost" size="sm" className="w-full h-9 rounded-lg gap-2 text-[10px] uppercase font-bold text-orange-600 hover:bg-orange-50" asChild>
                    <Link href="/dashboard/vps">
                      VPS console <ExternalLink className="h-3 w-3" />
                    </Link>
                  </Button>
                </div>
              </Card>
            </div>
          </div>
        </div>

        <div className="space-y-8">
          <Card className="p-1 border border-border/50 overflow-hidden rounded-3xl bg-card">
            <div className="p-6 space-y-6">
              <div className="flex flex-col items-center text-center space-y-3 pb-6 border-b border-border/50">
                <div className="h-20 w-20 rounded-3xl bg-primary/10 flex items-center justify-center text-primary font-black text-3xl">
                  {client?.name.substring(0, 2).toUpperCase() || 'NA'}
                </div>
                <div>
                  <h4 className="text-xl font-bold tracking-tight">{client?.name || 'Unknown Client'}</h4>
                  <p className="text-xs text-muted-foreground">{client?.email || 'No email'}</p>
                </div>
                {client?.id ? (
                  <Link href={`/dashboard/clients/${client.id}`}>
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-xl h-8 px-6 text-[10px] uppercase font-bold tracking-widest bg-muted/50 border-none hover:bg-primary hover:text-white transition-all"
                    >
                      Profile
                    </Button>
                  </Link>
                ) : null}
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between text-xs font-medium">
                  <span className="text-muted-foreground uppercase tracking-widest text-[10px] font-black underline decoration-primary decoration-2 underline-offset-4">
                    Active services
                  </span>
                  <span className="text-xs font-black">{serviceCounts.total} Total</span>
                </div>
                <div className="space-y-2">
                  {[
                    { icon: Globe, label: 'Domains', count: serviceCounts.domains, href: '/dashboard/domains' },
                    { icon: HardDrive, label: 'Hosting', count: serviceCounts.hosting, href: '/dashboard/hosting' },
                    { icon: Mail, label: 'EMail', count: serviceCounts.email, href: '/dashboard/emails' },
                    { icon: Zap, label: 'VPS', count: serviceCounts.vps, href: '/dashboard/vps' },
                  ].map((s, i) => (
                    <Link
                      key={i}
                      href={s.href}
                      className="flex items-center justify-between group cursor-pointer hover:bg-muted p-2 rounded-xl transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <s.icon className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                        <span className="text-xs font-bold text-muted-foreground group-hover:text-foreground">{s.label}</span>
                      </div>
                      <span className="h-5 w-8 rounded-full bg-muted flex items-center justify-center text-[10px] font-black group-hover:bg-primary group-hover:text-white transition-all">
                        {s.count}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </Card>

          <Card className="overflow-hidden border border-border/50 rounded-3xl shadow-sm">
            <div className="bg-card p-6 pb-2">
              <h3 className="font-black text-sm tracking-widest uppercase mb-4 flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-primary" /> Billing info
              </h3>
              <div className="space-y-6">
                <div className="p-5 bg-primary/5 rounded-2xl border border-primary/10">
                  <p className="text-[10px] uppercase font-black text-muted-foreground tracking-widest mb-2">Next billing date</p>
                  <div className="flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-primary" />
                    <p className="text-2xl font-black">{formatDate(h.expiryDate).split(',')[0]}</p>
                  </div>
                  <p className="text-xs text-primary font-bold mt-2 flex items-center gap-1.5 leading-none">
                    <History className="h-3 w-3" /> {paymentModeLabel}
                  </p>
                </div>

                <div className="space-y-4 px-2">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground font-medium">{recurringFeeLabel}</span>
                    <span className="font-bold">{formatCurrency(h.price, invoiceCurrency)}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground font-medium">Last invoice</span>
                    {lastHostingInvoice ? (
                      <Link
                        href={`/dashboard/billing/invoices/${lastHostingInvoice.id}`}
                        className="text-blue-500 font-bold underline"
                      >
                        {lastHostingInvoice.number}
                      </Link>
                    ) : (
                      <span className="text-muted-foreground text-xs">None yet</span>
                    )}
                  </div>
                  <div className="h-px bg-border/50" />
                  <div className="bg-muted/50 p-4 rounded-xl flex items-start gap-3">
                    <Info className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                    <p className="text-[10px] text-muted-foreground leading-relaxed font-medium">
                      Account may be suspended if payment is not received within 3 days of invoice issue.
                    </p>
                  </div>
                </div>

                <Button
                  type="button"
                  className="w-full h-14 rounded-2xl font-black text-lg shadow-lg shadow-primary/20 mb-4 transition-transform hover:scale-[1.02]"
                  onClick={handleManualInvoice}
                >
                  Generate manual invoice
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function HostingDetailsPageWithSuspense() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center p-20 text-muted-foreground text-sm">Loading hosting…</div>
      }
    >
      <HostingDetailsPage />
    </Suspense>
  );
}
