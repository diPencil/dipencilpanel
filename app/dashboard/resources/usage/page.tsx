'use client';

import React, { useMemo, useState } from 'react';
import { useInvoiceData } from '@/context/InvoiceContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatCurrency } from '@/lib/formatting';
import { isSubscriptionActiveForKpis } from '@/lib/subscription-display-status';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  PieChart,
  Pie,
  Legend,
  LineChart,
  Line,
  Area,
  AreaChart,
} from 'recharts';
import {
  Users,
  Globe,
  HardDrive,
  Server,
  Mail,
  Smartphone,
  Monitor,
  DollarSign,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  Clock,
  Filter,
  Activity,
  Zap,
  Database,
  BarChart2,
} from 'lucide-react';

// ─── Constants ────────────────────────────────────────────────────────────────

const CHART_COLORS = [
  '#6366f1', // indigo
  '#22c55e', // green
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // violet
  '#06b6d4', // cyan
  '#f97316', // orange
  '#ec4899', // pink
];

const SERVICE_TYPES = [
  { value: 'all', label: 'All Services' },
  { value: 'domain', label: 'Domains' },
  { value: 'hosting', label: 'Hosting' },
  { value: 'vps', label: 'VPS' },
  { value: 'email', label: 'Email' },
  { value: 'mobile_app', label: 'Mobile Apps' },
  { value: 'website', label: 'Websites' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtGB(gb: number): string {
  if (gb >= 1000) return `${(gb / 1000).toFixed(1)} TB`;
  return `${gb.toFixed(gb < 10 ? 1 : 0)} GB`;
}

function parseNum(v: number | string | undefined | null): number {
  if (typeof v === 'number') return v;
  if (!v) return 0;
  const m = String(v).match(/(\d+(?:\.\d+)?)/);
  return m ? Number(m[1]) : 0;
}

function daysUntil(date: string | Date): number {
  const d = new Date(date);
  const now = new Date();
  return Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function groupByMonth(
  items: { createdAt: string | Date }[],
  monthsBack = 6,
): { month: string; count: number }[] {
  const now = new Date();
  const result: { month: string; count: number }[] = [];
  for (let i = monthsBack - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
    const count = items.filter((item) => {
      const c = new Date(item.createdAt);
      return c.getFullYear() === d.getFullYear() && c.getMonth() === d.getMonth();
    }).length;
    result.push({ month: key, count });
  }
  return result;
}

function groupRevenueByMonth(
  payments: { date: string | Date; amount: number }[],
  monthsBack = 6,
): { month: string; revenue: number }[] {
  const now = new Date();
  const result: { month: string; revenue: number }[] = [];
  for (let i = monthsBack - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
    const revenue = payments
      .filter((p) => {
        const c = new Date(p.date);
        return c.getFullYear() === d.getFullYear() && c.getMonth() === d.getMonth();
      })
      .reduce((s, p) => s + p.amount, 0);
    result.push({ month: key, revenue: parseFloat(revenue.toFixed(2)) });
  }
  return result;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function KpiCard({
  icon,
  label,
  value,
  sub,
  color,
  badge,
  alert,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  color: string;
  badge?: string;
  alert?: boolean;
}) {
  return (
    <Card className="border-border/50 shadow-sm">
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${color}`}>{icon}</div>
          {badge && (
            <Badge variant="outline" className="text-xs">
              {badge}
            </Badge>
          )}
          {alert && <AlertTriangle className="h-4 w-4 text-amber-500" />}
        </div>
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className="text-2xl font-bold mt-0.5">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      </CardContent>
    </Card>
  );
}

function ServiceAnalyticsCard({
  icon,
  title,
  rows,
  color,
}: {
  icon: React.ReactNode;
  title: string;
  rows: { label: string; value: string | number; sub?: string; pct?: number; color?: string }[];
  color: string;
}) {
  return (
    <Card className="border-border/50 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <div className={`h-7 w-7 rounded-lg flex items-center justify-center ${color}`}>{icon}</div>
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="pb-4 space-y-3">
        {rows.map((row, i) => (
          <div key={i}>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-muted-foreground">{row.label}</span>
              <span className="font-semibold">{row.value}</span>
            </div>
            {row.sub && <p className="text-xs text-muted-foreground -mt-0.5 mb-1">{row.sub}</p>}
            {row.pct !== undefined && (
              <Progress
                value={row.pct}
                className="h-1.5"
                style={row.color ? { '--progress-color': row.color } as React.CSSProperties : undefined}
              />
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function InsightAlert({
  type,
  title,
  description,
}: {
  type: 'warning' | 'info' | 'error';
  title: string;
  description: string;
}) {
  const styles = {
    warning: 'border-amber-500/30 bg-amber-500/5 text-amber-700 dark:text-amber-400',
    info: 'border-blue-500/30 bg-blue-500/5 text-blue-700 dark:text-blue-400',
    error: 'border-red-500/30 bg-red-500/5 text-red-700 dark:text-red-400',
  };
  const icons = {
    warning: <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />,
    info: <Activity className="h-4 w-4 shrink-0 mt-0.5" />,
    error: <Zap className="h-4 w-4 shrink-0 mt-0.5" />,
  };

  return (
    <div className={`flex gap-2.5 p-3.5 rounded-xl border text-sm ${styles[type]}`}>
      {icons[type]}
      <div>
        <p className="font-semibold">{title}</p>
        <p className="text-xs mt-0.5 opacity-80">{description}</p>
      </div>
    </div>
  );
}

function ChartTooltip({
  active,
  payload,
  label,
  currency,
  isCurrency,
}: {
  active?: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload?: any[];
  label?: string;
  currency?: string;
  isCurrency?: boolean;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-xl shadow-lg p-3 text-sm min-w-[120px]">
      <p className="font-semibold mb-1.5">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }} className="text-xs">
          {p.name}:{' '}
          <span className="font-bold text-foreground">
            {isCurrency ? formatCurrency(p.value, currency) : p.value}
          </span>
        </p>
      ))}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function UsageAnalyticsPage() {
  const {
    clients = [],
    domains = [],
    hosting = [],
    vps = [],
    emails = [],
    mobileApps = [],
    websites = [],
    subscriptions = [],
    payments = [],
    invoices = [],
    allCompanies = [],
    company,
  } = useInvoiceData();

  const currency = company?.currency || 'USD';

  // ── Filters ───────────────────────────────────────────────────────────────

  const [filterCompany, setFilterCompany] = useState<string>('all');
  const [filterClient, setFilterClient] = useState<string>('all');
  const [filterService, setFilterService] = useState<string>('all');
  const [filterDateFrom, setFilterDateFrom] = useState<string>('');
  const [filterDateTo, setFilterDateTo] = useState<string>('');

  // Determine which companyId to filter by
  const targetCompanyId = filterCompany !== 'all' ? filterCompany : company?.id;

  // Filtered clients for the company
  const companyClients = useMemo(
    () => clients.filter((c) => !targetCompanyId || c.companyId === targetCompanyId),
    [clients, targetCompanyId],
  );

  const clientFilter = (clientId: string) =>
    (filterClient === 'all' || clientId === filterClient);

  const dateFilter = (createdAt: string | Date) => {
    const d = new Date(createdAt);
    if (filterDateFrom && d < new Date(filterDateFrom)) return false;
    if (filterDateTo && d > new Date(filterDateTo + 'T23:59:59')) return false;
    return true;
  };

  // Filtered data sets
  const fDomains = useMemo(
    () => domains.filter((d) => (!targetCompanyId || d.companyId === targetCompanyId) && clientFilter(d.clientId) && dateFilter(d.createdAt)),
    [domains, targetCompanyId, filterClient, filterDateFrom, filterDateTo],
  );
  const fHosting = useMemo(
    () => hosting.filter((h) => (!targetCompanyId || h.companyId === targetCompanyId) && clientFilter(h.clientId) && dateFilter(h.createdAt)),
    [hosting, targetCompanyId, filterClient, filterDateFrom, filterDateTo],
  );
  const fVPS = useMemo(
    () => vps.filter((v) => (!targetCompanyId || v.companyId === targetCompanyId) && clientFilter(v.clientId) && dateFilter(v.createdAt)),
    [vps, targetCompanyId, filterClient, filterDateFrom, filterDateTo],
  );
  const fEmails = useMemo(
    () => emails.filter((e) => (!targetCompanyId || e.companyId === targetCompanyId) && clientFilter(e.clientId) && dateFilter(e.createdAt)),
    [emails, targetCompanyId, filterClient, filterDateFrom, filterDateTo],
  );
  const fMobileApps = useMemo(
    () => mobileApps.filter((a) => (!targetCompanyId || a.companyId === targetCompanyId) && clientFilter(a.clientId) && dateFilter(a.createdAt)),
    [mobileApps, targetCompanyId, filterClient, filterDateFrom, filterDateTo],
  );
  const fWebsites = useMemo(
    () => websites.filter((w) => (!targetCompanyId || w.companyId === targetCompanyId) && clientFilter(w.clientId) && dateFilter(w.createdAt)),
    [websites, targetCompanyId, filterClient, filterDateFrom, filterDateTo],
  );
  const fSubscriptions = useMemo(
    () => subscriptions.filter((s) => {
      if (targetCompanyId && s.companyId !== targetCompanyId) return false;
      if (!clientFilter(s.clientId)) return false;
      if (filterService !== 'all' && s.serviceType !== filterService) return false;
      return true;
    }),
    [subscriptions, targetCompanyId, filterClient, filterService],
  );
  const fPayments = useMemo(
    () => payments.filter((p) => {
      if (targetCompanyId && p.companyId !== targetCompanyId) return false;
      if (!clientFilter(p.clientId)) return false;
      if (!dateFilter(p.date)) return false;
      return true;
    }),
    [payments, targetCompanyId, filterClient, filterDateFrom, filterDateTo],
  );

  // ── KPI computations ─────────────────────────────────────────────────────

  const activeSubscriptions = fSubscriptions.filter(isSubscriptionActiveForKpis);
  const expiredSubscriptions = fSubscriptions.filter(
    (s) => s.status === 'expired' || s.status === 'cancelled',
  );

  const totalRevenue = fPayments.reduce((s, p) => s + p.amount, 0);

  const now = new Date();
  const in30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const expiringSoon = useMemo(
    () =>
      fSubscriptions.filter(
        (s) => s.status === 'active' && s.expiryDate && new Date(s.expiryDate) <= in30,
      ),
    [fSubscriptions],
  );

  const expiringSoonDomains = useMemo(
    () =>
      fDomains.filter(
        (d) => d.expiryDate && new Date(d.expiryDate) <= in30 && d.status === 'active',
      ),
    [fDomains],
  );

  // ── Service detail analytics ──────────────────────────────────────────────

  const activeHosting = fHosting.filter((h) => h.status === 'active');
  const expiredHosting = fHosting.filter((h) => h.status === 'expired' || h.status === 'suspended');
  const hostingStorageGB = activeHosting.reduce(
    (s, h) => s + parseNum(h.resources?.storage),
    0,
  );
  const hostingBandwidthGB = activeHosting.reduce(
    (s, h) => s + parseNum(h.resources?.bandwidth),
    0,
  );

  const activeVPS = fVPS.filter((v) => v.status === 'active');
  const vpsTotalCPU = activeVPS.reduce((s, v) => s + parseNum(v.cpu), 0);
  const vpsTotalRAM = activeVPS.reduce((s, v) => s + parseNum(v.ram), 0);
  const vpsTotalDisk = activeVPS.reduce((s, v) => s + parseNum(v.storage), 0);

  const activeEmails = fEmails; // Email type has no status field — treat all as active
  const emailStorageMB = fEmails.reduce((s, e) => s + parseNum(e.storage), 0);

  const activeDomains = fDomains.filter((d) => d.status === 'active');
  const renewingSoon = expiringSoonDomains.length;

  const activeApps = fMobileApps.filter((a) => a.status === 'live');
  const devApps = fMobileApps.filter((a) => a.status === 'development');

  const activeWebsites = fWebsites.filter((w) => w.status === 'active');
  const websiteStorageGB = fWebsites.reduce((s, w) => s + parseNum(w.storage), 0);
  const websiteByType = {
    wordpress: fWebsites.filter((w) => w.type === 'wordpress').length,
    node: fWebsites.filter((w) => w.type === 'node').length,
    php: fWebsites.filter((w) => w.type === 'php' || w.type === 'html').length,
  };

  // ── Revenue by service from paid invoices ─────────────────────────────────

  const paidInvoices = invoices.filter(
    (inv) =>
      inv.paymentStatus === 'paid' &&
      (!targetCompanyId || inv.companyId === targetCompanyId) &&
      clientFilter(inv.clientId),
  );

  const revenueByService = useMemo(() => {
    const map: Record<string, number> = {
      domain: 0,
      hosting: 0,
      vps: 0,
      email: 0,
      mobile_app: 0,
      website: 0,
    };
    paidInvoices.forEach((inv) => {
      const match = fSubscriptions.find((s) => s.id === inv.subscriptionId);
      if (match) {
        const t = match.serviceType;
        if (t in map) map[t] += inv.total;
      }
    });
    return map;
  }, [paidInvoices, fSubscriptions]);

  const revenueBarData = [
    { name: 'Domains', revenue: parseFloat(revenueByService.domain.toFixed(2)) },
    { name: 'Hosting', revenue: parseFloat(revenueByService.hosting.toFixed(2)) },
    { name: 'VPS', revenue: parseFloat(revenueByService.vps.toFixed(2)) },
    { name: 'Email', revenue: parseFloat(revenueByService.email.toFixed(2)) },
    { name: 'Apps', revenue: parseFloat(revenueByService.mobile_app.toFixed(2)) },
    { name: 'Websites', revenue: parseFloat(revenueByService.website.toFixed(2)) },
  ];

  const revenuePieData = revenueBarData.filter((d) => d.revenue > 0);

  // ── Service distribution pie ──────────────────────────────────────────────

  const serviceDistPie = [
    { name: 'Domains', count: fDomains.length },
    { name: 'Hosting', count: fHosting.length },
    { name: 'VPS', count: fVPS.length },
    { name: 'Email', count: fEmails.length },
    { name: 'Mobile Apps', count: fMobileApps.length },
    { name: 'Websites', count: fWebsites.length },
  ].filter((d) => d.count > 0);

  // ── Growth charts ─────────────────────────────────────────────────────────

  const clientGrowth = useMemo(() => groupByMonth(companyClients, 6), [companyClients]);
  const revenueGrowth = useMemo(() => groupRevenueByMonth(fPayments, 6), [fPayments]);

  // ── Expiration feed ───────────────────────────────────────────────────────

  const expirationFeed = useMemo(() => {
    const items: {
      id: string;
      label: string;
      type: string;
      expiryDate: string | Date;
      clientId: string;
      daysLeft: number;
    }[] = [];

    const sub30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    fDomains.forEach((d) => {
      if (d.expiryDate && new Date(d.expiryDate) <= sub30 && d.status === 'active') {
        items.push({ id: `d-${d.id}`, label: d.name, type: 'Domain', expiryDate: d.expiryDate, clientId: d.clientId, daysLeft: daysUntil(d.expiryDate) });
      }
    });
    fHosting.forEach((h) => {
      if (h.expiryDate && new Date(h.expiryDate) <= sub30 && h.status === 'active') {
        items.push({ id: `h-${h.id}`, label: h.name, type: 'Hosting', expiryDate: h.expiryDate, clientId: h.clientId, daysLeft: daysUntil(h.expiryDate) });
      }
    });
    fVPS.forEach((v) => {
      if (v.renewalDate && new Date(v.renewalDate) <= sub30 && v.status === 'active') {
        items.push({ id: `v-${v.id}`, label: v.name, type: 'VPS', expiryDate: v.renewalDate, clientId: v.clientId, daysLeft: daysUntil(v.renewalDate) });
      }
    });
    fEmails.forEach((e) => {
      if (e.renewalDate && new Date(e.renewalDate) <= sub30) {
        items.push({ id: `e-${e.id}`, label: e.name, type: 'Email', expiryDate: e.renewalDate, clientId: e.clientId, daysLeft: daysUntil(e.renewalDate) });
      }
    });

    return items.sort((a, b) => a.daysLeft - b.daysLeft).slice(0, 12);
  }, [fDomains, fHosting, fVPS, fEmails]);

  const clientNameMap = useMemo(
    () => new Map(clients.map((c) => [c.id, c.name])),
    [clients],
  );

  // ── Smart insights ────────────────────────────────────────────────────────

  const insights = useMemo(() => {
    const list: { type: 'warning' | 'info' | 'error'; title: string; description: string }[] = [];

    if (expiringSoon.length > 0) {
      list.push({
        type: 'warning',
        title: `${expiringSoon.length} subscription${expiringSoon.length !== 1 ? 's' : ''} expiring within 30 days`,
        description: 'Review and renew to avoid service interruption.',
      });
    }
    if (expiringSoonDomains.length > 0) {
      list.push({
        type: 'warning',
        title: `${expiringSoonDomains.length} domain${expiringSoonDomains.length !== 1 ? 's' : ''} expiring soon`,
        description: 'Renew domains before expiry to avoid losing them.',
      });
    }
    const hostingPct = fHosting.length > 0 ? (activeHosting.length / fHosting.length) * 100 : 0;
    if (fHosting.length > 0 && hostingPct < 50) {
      list.push({
        type: 'error',
        title: `Only ${Math.round(hostingPct)}% of hosting accounts are active`,
        description: 'High number of expired or suspended hosting services.',
      });
    }
    if (activeSubscriptions.length === 0 && fSubscriptions.length > 0) {
      list.push({
        type: 'error',
        title: 'No active subscriptions',
        description: 'All subscriptions appear expired or cancelled.',
      });
    }
    if (vpsTotalDisk > 0 && vpsTotalDisk > 2000) {
      list.push({
        type: 'info',
        title: `${fmtGB(vpsTotalDisk)} VPS disk allocated`,
        description: 'Consider reviewing VPS plans for optimization.',
      });
    }
    if (insight_noRevenue(revenueByService)) {
      list.push({
        type: 'info',
        title: 'No revenue tracked for some services',
        description: 'Ensure subscriptions have linked paid invoices.',
      });
    }

    return list;
  }, [expiringSoon, expiringSoonDomains, fHosting, activeHosting, fSubscriptions, activeSubscriptions, vpsTotalDisk, revenueByService]);

  function insight_noRevenue(rev: Record<string, number>) {
    return Object.values(rev).every((v) => v === 0) && paidInvoices.length > 0;
  }

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Usage Analytics</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Full BI dashboard — service usage, revenue, growth, and expiration tracking
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-emerald-600 font-medium bg-emerald-500/5 px-3 py-1.5 rounded-full border border-emerald-500/20">
          <Activity className="h-4 w-4 animate-pulse" />
          <span>Live data</span>
        </div>
      </div>

      {/* ── Filters ─────────────────────────────────────────────────────── */}
      <Card className="border-border/50 shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-semibold">Filters</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {/* Company filter */}
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Company</Label>
              <Select value={filterCompany} onValueChange={setFilterCompany}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="All companies" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Companies</SelectItem>
                  {allCompanies.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Client filter */}
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Client</Label>
              <Select value={filterClient} onValueChange={setFilterClient}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="All clients" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Clients</SelectItem>
                  {companyClients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Service type filter */}
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Service Type</Label>
              <Select value={filterService} onValueChange={setFilterService}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="All services" />
                </SelectTrigger>
                <SelectContent>
                  {SERVICE_TYPES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date From */}
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Date From</Label>
              <Input
                type="date"
                value={filterDateFrom}
                onChange={(e) => setFilterDateFrom(e.target.value)}
                className="h-8 text-xs"
              />
            </div>

            {/* Date To */}
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Date To</Label>
              <Input
                type="date"
                value={filterDateTo}
                onChange={(e) => setFilterDateTo(e.target.value)}
                className="h-8 text-xs"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Top KPI Cards ─────────────────────────────────────────────────── */}
      <section>
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">
          Key Metrics
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <KpiCard
            icon={<Users className="h-4 w-4 text-indigo-600" />}
            label="Total Clients"
            value={String(companyClients.length)}
            sub={`Filtered: ${filterClient === 'all' ? 'all' : '1'}`}
            color="bg-indigo-500/10"
          />
          <KpiCard
            icon={<Globe className="h-4 w-4 text-blue-600" />}
            label="Total Domains"
            value={String(fDomains.length)}
            sub={`${activeDomains.length} active`}
            color="bg-blue-500/10"
          />
          <KpiCard
            icon={<HardDrive className="h-4 w-4 text-violet-600" />}
            label="Hosting Accounts"
            value={String(fHosting.length)}
            sub={`${activeHosting.length} active`}
            color="bg-violet-500/10"
          />
          <KpiCard
            icon={<Server className="h-4 w-4 text-emerald-600" />}
            label="VPS Servers"
            value={String(fVPS.length)}
            sub={`${activeVPS.length} active`}
            color="bg-emerald-500/10"
          />
          <KpiCard
            icon={<Mail className="h-4 w-4 text-amber-600" />}
            label="Email Accounts"
            value={String(fEmails.length)}
            sub={`${activeEmails.length} active`}
            color="bg-amber-500/10"
          />
          <KpiCard
            icon={<Smartphone className="h-4 w-4 text-pink-600" />}
            label="Mobile Apps"
            value={String(fMobileApps.length)}
            sub={`${activeApps.length} active`}
            color="bg-pink-500/10"
          />
          <KpiCard
            icon={<Monitor className="h-4 w-4 text-cyan-600" />}
            label="Websites"
            value={String(fWebsites.length)}
            sub={`${activeWebsites.length} active`}
            color="bg-cyan-500/10"
          />
          <KpiCard
            icon={<DollarSign className="h-4 w-4 text-emerald-600" />}
            label="Total Revenue"
            value={formatCurrency(totalRevenue, currency)}
            sub={`${fPayments.length} payments`}
            color="bg-emerald-500/10"
          />
          <KpiCard
            icon={<CheckCircle2 className="h-4 w-4 text-teal-600" />}
            label="Active Subscriptions"
            value={String(activeSubscriptions.length)}
            sub={`of ${fSubscriptions.length} total`}
            color="bg-teal-500/10"
          />
          <KpiCard
            icon={<AlertTriangle className="h-4 w-4 text-red-500" />}
            label="Expired Services"
            value={String(expiredSubscriptions.length)}
            sub={`${expiringSoon.length} expiring soon`}
            color="bg-red-500/10"
            alert={expiredSubscriptions.length > 0}
          />
        </div>
      </section>

      {/* ── Smart Insights ─────────────────────────────────────────────────── */}
      {insights.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">
            Smart Insights
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {insights.map((ins, i) => (
              <InsightAlert key={i} type={ins.type} title={ins.title} description={ins.description} />
            ))}
          </div>
        </section>
      )}

      {/* ── Service Analytics Breakdown ─────────────────────────────────── */}
      <section>
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">
          Service Usage Analytics
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Hosting */}
          <ServiceAnalyticsCard
            icon={<HardDrive className="h-3.5 w-3.5 text-violet-600" />}
            title="Hosting"
            color="bg-violet-500/10"
            rows={[
              { label: 'Total accounts', value: fHosting.length },
              {
                label: 'Active',
                value: `${activeHosting.length} / ${fHosting.length}`,
                pct: fHosting.length > 0 ? (activeHosting.length / fHosting.length) * 100 : 0,
                color: '#8b5cf6',
              },
              {
                label: 'Expired / Suspended',
                value: expiredHosting.length,
                pct: fHosting.length > 0 ? (expiredHosting.length / fHosting.length) * 100 : 0,
                color: '#ef4444',
              },
              { label: 'Total storage', value: fmtGB(hostingStorageGB) },
              { label: 'Total bandwidth', value: `${hostingBandwidthGB.toFixed(0)} GB` },
            ]}
          />

          {/* VPS */}
          <ServiceAnalyticsCard
            icon={<Server className="h-3.5 w-3.5 text-emerald-600" />}
            title="VPS"
            color="bg-emerald-500/10"
            rows={[
              { label: 'Total servers', value: fVPS.length },
              {
                label: 'Active',
                value: `${activeVPS.length} / ${fVPS.length}`,
                pct: fVPS.length > 0 ? (activeVPS.length / fVPS.length) * 100 : 0,
                color: '#22c55e',
              },
              { label: 'Total CPU cores', value: `${vpsTotalCPU} vCPU` },
              { label: 'Total RAM', value: `${vpsTotalRAM} GB` },
              { label: 'Total Disk', value: fmtGB(vpsTotalDisk) },
            ]}
          />

          {/* Email */}
          <ServiceAnalyticsCard
            icon={<Mail className="h-3.5 w-3.5 text-amber-600" />}
            title="Email"
            color="bg-amber-500/10"
            rows={[
              { label: 'Total mailboxes', value: fEmails.length },
              {
                label: 'Active',
                value: `${activeEmails.length} / ${fEmails.length}`,
                pct: fEmails.length > 0 ? (activeEmails.length / fEmails.length) * 100 : 0,
                color: '#f59e0b',
              },
              { label: 'Total storage', value: `${emailStorageMB.toFixed(0)} MB` },
              { label: 'Storage in GB', value: fmtGB(emailStorageMB / 1024) },
              { label: 'Expiring soon', value: fEmails.filter((e) => e.renewalDate && new Date(e.renewalDate) <= in30).length },
            ]}
          />

          {/* Domains */}
          <ServiceAnalyticsCard
            icon={<Globe className="h-3.5 w-3.5 text-blue-600" />}
            title="Domains"
            color="bg-blue-500/10"
            rows={[
              { label: 'Total domains', value: fDomains.length },
              {
                label: 'Active',
                value: `${activeDomains.length} / ${fDomains.length}`,
                pct: fDomains.length > 0 ? (activeDomains.length / fDomains.length) * 100 : 0,
                color: '#3b82f6',
              },
              { label: 'Expiring soon (30d)', value: renewingSoon, ...(renewingSoon > 0 ? { sub: 'Action needed' } : {}) },
              {
                label: 'Expired',
                value: fDomains.filter((d) => d.status === 'expired').length,
                pct: fDomains.length > 0 ? (fDomains.filter((d) => d.status === 'expired').length / fDomains.length) * 100 : 0,
                color: '#ef4444',
              },
              { label: 'Auto-renew on', value: fDomains.filter((d) => d.autoRenew).length },
            ]}
          />

          {/* Mobile Apps */}
          <ServiceAnalyticsCard
            icon={<Smartphone className="h-3.5 w-3.5 text-pink-600" />}
            title="Mobile Apps"
            color="bg-pink-500/10"
            rows={[
              { label: 'Total apps', value: fMobileApps.length },
              {
                label: 'Active / Published',
                value: activeApps.length,
                pct: fMobileApps.length > 0 ? (activeApps.length / fMobileApps.length) * 100 : 0,
                color: '#ec4899',
              },
              { label: 'In Development', value: devApps.length },
              { label: 'Android', value: fMobileApps.filter((a) => a.appType === 'android').length },
              { label: 'iOS', value: fMobileApps.filter((a) => a.appType === 'ios').length },
              { label: 'Linked to hosting', value: fMobileApps.filter((a) => a.hostingId).length },
            ]}
          />

          {/* Websites */}
          <ServiceAnalyticsCard
            icon={<Monitor className="h-3.5 w-3.5 text-cyan-600" />}
            title="Websites"
            color="bg-cyan-500/10"
            rows={[
              { label: 'Total websites', value: fWebsites.length },
              {
                label: 'Active',
                value: `${activeWebsites.length} / ${fWebsites.length}`,
                pct: fWebsites.length > 0 ? (activeWebsites.length / fWebsites.length) * 100 : 0,
                color: '#06b6d4',
              },
              { label: 'WordPress', value: websiteByType.wordpress },
              { label: 'Node.js', value: websiteByType.node },
              { label: 'PHP/HTML', value: websiteByType.php },
              { label: 'Total storage', value: fmtGB(websiteStorageGB) },
            ]}
          />
        </div>
      </section>

      {/* ── Revenue Analytics ──────────────────────────────────────────────── */}
      <section>
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">
          Revenue by Service
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Revenue bar chart */}
          <Card className="border-border/50 shadow-sm">
            <CardHeader className="pb-1">
              <CardTitle className="text-sm">Revenue Comparison</CardTitle>
            </CardHeader>
            <CardContent>
              {revenueBarData.every((d) => d.revenue === 0) ? (
                <div className="h-56 flex items-center justify-center text-muted-foreground text-sm">
                  No paid invoice data available
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={revenueBarData} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tickFormatter={(v) => `${formatCurrency(v, currency).replace(/\.00$/, '')}`} tick={{ fontSize: 10 }} width={72} />
                    <Tooltip
                      content={(props: any) => (
                        <ChartTooltip {...props} currency={currency} isCurrency />
                      )}
                    />
                    <Bar dataKey="revenue" radius={[6, 6, 0, 0]} name="Revenue">
                      {revenueBarData.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Revenue pie */}
          <Card className="border-border/50 shadow-sm">
            <CardHeader className="pb-1">
              <CardTitle className="text-sm">Revenue Share by Service</CardTitle>
            </CardHeader>
            <CardContent>
              {revenuePieData.length === 0 ? (
                <div className="h-56 flex items-center justify-center text-muted-foreground text-sm">
                  No paid invoice data available
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={revenuePieData}
                      dataKey="revenue"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      innerRadius={40}
                      paddingAngle={3}
                    >
                      {revenuePieData.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(v: number) => [formatCurrency(v, currency), 'Revenue']}
                      contentStyle={{
                        backgroundColor: 'var(--card)',
                        border: '1px solid var(--border)',
                        borderRadius: '0.75rem',
                        fontSize: '12px',
                      }}
                    />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px' }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      {/* ── Service Distribution ──────────────────────────────────────────── */}
      <section>
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">
          Service Distribution
        </h2>
        <Card className="border-border/50 shadow-sm">
          <CardContent className="p-4">
            {serviceDistPie.length === 0 ? (
              <div className="h-40 flex items-center justify-center text-muted-foreground text-sm">
                No services found
              </div>
            ) : (
              <div className="flex flex-col lg:flex-row gap-4 items-center">
                <div className="w-full lg:w-1/2">
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie
                        data={serviceDistPie}
                        dataKey="count"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={90}
                        innerRadius={40}
                        paddingAngle={3}
                      >
                        {serviceDistPie.map((_, i) => (
                          <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(v: number) => [v, 'Count']}
                        contentStyle={{
                          backgroundColor: 'var(--card)',
                          border: '1px solid var(--border)',
                          borderRadius: '0.75rem',
                          fontSize: '12px',
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="w-full lg:w-1/2 space-y-2">
                  {serviceDistPie.map((item, i) => {
                    const total = serviceDistPie.reduce((s, d) => s + d.count, 0);
                    const pct = total > 0 ? Math.round((item.count / total) * 100) : 0;
                    return (
                      <div key={item.name} className="flex items-center gap-3">
                        <div
                          className="h-3 w-3 rounded-full shrink-0"
                          style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between text-xs mb-0.5">
                            <span className="font-medium">{item.name}</span>
                            <span className="text-muted-foreground">{item.count} ({pct}%)</span>
                          </div>
                          <Progress value={pct} className="h-1" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {/* ── Growth Charts ─────────────────────────────────────────────────── */}
      <section>
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">
          Growth Trends (Last 6 Months)
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Client growth */}
          <Card className="border-border/50 shadow-sm">
            <CardHeader className="pb-1">
              <CardTitle className="text-sm flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-indigo-500" />
                Client Growth
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={clientGrowth} margin={{ top: 4, right: 8, left: -20, bottom: 4 }}>
                  <defs>
                    <linearGradient id="clientGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip
                    content={(props: any) => <ChartTooltip {...props} />}
                  />
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke="#6366f1"
                    fill="url(#clientGrad)"
                    strokeWidth={2}
                    name="New Clients"
                    dot={{ r: 3, fill: '#6366f1' }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Revenue growth */}
          <Card className="border-border/50 shadow-sm">
            <CardHeader className="pb-1">
              <CardTitle className="text-sm flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-emerald-500" />
                Revenue Growth
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={revenueGrowth} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                  <defs>
                    <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis
                    tickFormatter={(v) => `${v}`}
                    tick={{ fontSize: 10 }}
                    width={64}
                  />
                  <Tooltip
                    content={(props: any) => <ChartTooltip {...props} currency={currency} isCurrency />}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#22c55e"
                    fill="url(#revGrad)"
                    strokeWidth={2}
                    name="Revenue"
                    dot={{ r: 3, fill: '#22c55e' }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* ── Expiration Tracking ──────────────────────────────────────────── */}
      <section>
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">
          Expiration Tracking
        </h2>
        <Card className="border-border/50 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-500" />
              Services Expiring Within 30 Days
              {expirationFeed.length > 0 && (
                <Badge variant="outline" className="ml-auto text-xs border-amber-500/40 text-amber-600 bg-amber-500/10">
                  {expirationFeed.length} item{expirationFeed.length !== 1 ? 's' : ''}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {expirationFeed.length === 0 ? (
              <div className="flex items-center gap-2 py-4 text-emerald-600 text-sm">
                <CheckCircle2 className="h-4 w-4" />
                No services expiring within the next 30 days
              </div>
            ) : (
              <div className="divide-y divide-border/40">
                {expirationFeed.map((item) => {
                  const isUrgent = item.daysLeft <= 7;
                  const isWarning = item.daysLeft <= 14 && item.daysLeft > 7;
                  return (
                    <div key={item.id} className="flex items-center justify-between py-2.5 gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Badge
                          variant="outline"
                          className="shrink-0 text-xs font-medium"
                        >
                          {item.type}
                        </Badge>
                        <span className="text-sm font-medium truncate">{item.label}</span>
                      </div>
                      <div className="flex items-center gap-3 shrink-0 text-right">
                        <span className="text-xs text-muted-foreground hidden sm:block">
                          {clientNameMap.get(item.clientId) || '—'}
                        </span>
                        <span
                          className={`text-xs font-semibold ${
                            isUrgent
                              ? 'text-red-600'
                              : isWarning
                              ? 'text-amber-600'
                              : 'text-muted-foreground'
                          }`}
                        >
                          {item.daysLeft <= 0
                            ? 'Today'
                            : `${item.daysLeft}d left`}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
