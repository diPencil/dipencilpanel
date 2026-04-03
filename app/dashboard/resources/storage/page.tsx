'use client';

import React, { useMemo, useState } from 'react';
import { useInvoiceData } from '@/context/InvoiceContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  HardDrive,
  Server,
  Mail,
  Database,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
} from 'lucide-react';
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
} from 'recharts';
import { getStorageSummary, getHostingStorageTotal, getVpsStorageTotal } from '@/lib/storage-utils';
import { isSubscriptionActiveForKpis } from '@/lib/subscription-display-status';

// ─── Helpers ────────────────────────────────────────────────────────────────

function parseNum(v: number | string | undefined | null): number {
  if (typeof v === 'number') return v;
  if (!v) return 0;
  const m = String(v).match(/(\d+(?:\.\d+)?)/);
  return m ? Number(m[1]) : 0;
}

function fmtGB(gb: number): string {
  if (gb >= 1000) return `${(gb / 1000).toFixed(1)} TB`;
  return `${gb.toFixed(gb < 10 ? 1 : 0)} GB`;
}

const COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

// ─── Circular Gauge ──────────────────────────────────────────────────────────

function CircularGauge({
  used,
  total,
  label,
  color,
}: {
  used: number;
  total: number;
  label: string;
  color: string;
}) {
  const pct = total > 0 ? Math.min(Math.round((used / total) * 100), 100) : 0;
  const r = 36;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-24 h-24">
        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
          <circle cx="50" cy="50" r={r} fill="none" stroke="currentColor" strokeWidth="8" className="text-muted/30" />
          <circle
            cx="50"
            cy="50"
            r={r}
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeDasharray={`${dash} ${circ}`}
            strokeLinecap="round"
            className="transition-all duration-700"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-bold">{pct}%</span>
        </div>
      </div>
      <p className="text-sm font-medium text-center">{label}</p>
      <p className="text-xs text-muted-foreground">{fmtGB(used)} used</p>
    </div>
  );
}

// ─── Summary Card ──────────────────────────────────────────────────────────

function SummaryCard({
  icon,
  label,
  value,
  sub,
  color,
  alert,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  color: string;
  alert?: boolean;
}) {
  return (
    <Card className="border-border/50 shadow-sm">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${color}`}>{icon}</div>
          {alert && <AlertTriangle className="h-4 w-4 text-amber-500" />}
        </div>
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <p className="text-2xl font-bold mt-1">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      </CardContent>
    </Card>
  );
}

// ─── Service Storage Card ─────────────────────────────────────────────────

function ServiceStorageCard({
  icon,
  label,
  used,
  total,
  activeCount,
  totalCount,
  color,
  barColor,
}: {
  icon: React.ReactNode;
  label: string;
  used: number;
  total: number;
  activeCount: number;
  totalCount: number;
  color: string;
  barColor: string;
}) {
  const pct = total > 0 ? Math.min(Math.round((used / total) * 100), 100) : 0;
  const isHigh = pct >= 80;
  const isMedium = pct >= 60 && pct < 80;

  return (
    <Card className="border-border/50 shadow-sm">
      <CardContent className="p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${color}`}>{icon}</div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm">{label}</p>
            <p className="text-xs text-muted-foreground">
              {activeCount} active · {totalCount} total
            </p>
          </div>
          <Badge
            variant="outline"
            className={
              isHigh
                ? 'border-red-500/40 text-red-600 bg-red-500/10'
                : isMedium
                ? 'border-amber-500/40 text-amber-600 bg-amber-500/10'
                : 'border-emerald-500/40 text-emerald-600 bg-emerald-500/10'
            }
          >
            {pct}%
          </Badge>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{fmtGB(used)} used</span>
            <span>{fmtGB(total)} total</span>
          </div>
          <Progress value={pct} className="h-2" style={{ '--progress-color': barColor } as React.CSSProperties} />
        </div>

        <div className="mt-3 flex gap-4 text-xs">
          <div>
            <span className="text-muted-foreground">Used: </span>
            <span className="font-semibold">{fmtGB(used)}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Available: </span>
            <span className="font-semibold">{fmtGB(Math.max(total - used, 0))}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Custom Tooltip ───────────────────────────────────────────────────────

function CustomBarTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: { value: number; name: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-xl shadow-lg p-3 text-sm">
      <p className="font-semibold mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-muted-foreground">
          {p.name}: <span className="font-semibold text-foreground">{fmtGB(p.value)}</span>
        </p>
      ))}
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────

export default function StorageOverviewPage() {
  const {
    hosting = [],
    vps = [],
    emails = [],
    websites = [],
    subscriptions = [],
  } = useInvoiceData();

  // ── Compute storage per service ──────────────────────────────────────────

  const hostingUsed = useMemo(() => getHostingStorageTotal(hosting), [hosting]);
  const vpsUsed = useMemo(() => getVpsStorageTotal(vps), [vps]);

  // Email storage in MB → convert to GB
  const emailUsedMB = useMemo(() => emails.reduce((s, e) => s + parseNum(e.storage), 0), [emails]);
  const emailUsedGB = emailUsedMB / 1024;

  // Website storage (GB)
  const websiteUsedGB = useMemo(() => websites.reduce((s, w) => s + parseNum(w.storage), 0), [websites]);

  // Active service counts
  const activeHosting = hosting.filter((h) => h.status === 'active').length;
  const activeVPS = vps.filter((v) => v.status === 'active').length;
  const activeEmails = emails.length; // Email type has no status field
  const activeWebsites = websites.filter((w) => w.status === 'active').length;

  // Totals — "total" here = sum of all provisioned (active + inactive combined)
  // We use active-subscriptions based total for "total allocated"
  const totalHostingGB = useMemo(() => {
    const activeHosts = hosting.filter((h) => {
      const sub = subscriptions.find((s) => s.serviceId === h.id);
      return !sub || isSubscriptionActiveForKpis(sub);
    });
    return getHostingStorageTotal(activeHosts);
  }, [hosting, subscriptions]);

  const totalVpsGB = useMemo(() => {
    const activeVpsItems = vps.filter((v) => {
      const sub = subscriptions.find((s) => s.serviceId === v.id);
      return !sub || isSubscriptionActiveForKpis(sub);
    });
    return activeVpsItems.reduce((s, v) => s + parseNum(v.storage), 0);
  }, [vps, subscriptions]);

  const totalEmailGB = emailUsedGB; // same basis
  const totalWebsiteGB = websiteUsedGB;

  const grandTotalGB = hostingUsed + vpsUsed + emailUsedGB + websiteUsedGB;
  const activeAllocated = totalHostingGB + totalVpsGB + totalEmailGB + totalWebsiteGB;
  const usagePct = grandTotalGB > 0 ? Math.min(Math.round((activeAllocated / grandTotalGB) * 100), 100) : 0;

  // ── Bar chart data ────────────────────────────────────────────────────────

  const barData = [
    { name: 'Hosting', storage: parseFloat(hostingUsed.toFixed(1)) },
    { name: 'VPS', storage: parseFloat(vpsUsed.toFixed(1)) },
    { name: 'Email', storage: parseFloat(emailUsedGB.toFixed(1)) },
    { name: 'Websites', storage: parseFloat(websiteUsedGB.toFixed(1)) },
  ];

  const pieData = barData.filter((d) => d.storage > 0);

  // ── Expiry alerts (services expiring within 30 days) ─────────────────────

  const soon = useMemo(() => {
    const now = new Date();
    const in30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    return [
      ...hosting.filter((h) => h.expiryDate && new Date(h.expiryDate) <= in30 && h.status === 'active'),
      ...vps.filter((v) => v.renewalDate && new Date(v.renewalDate) <= in30 && v.status === 'active'),
      ...emails.filter((e) => e.renewalDate && new Date(e.renewalDate) <= in30),
    ];
  }, [hosting, vps, emails]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Storage Overview</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Total provisioned storage across all services
          </p>
        </div>
        {soon.length > 0 && (
          <Badge variant="outline" className="border-amber-500/40 text-amber-600 bg-amber-500/5 gap-1.5 px-3 py-1.5 rounded-full">
            <AlertTriangle className="h-3.5 w-3.5 animate-bounce" />
            {soon.length} service{soon.length !== 1 ? 's' : ''} expiring soon
          </Badge>
        )}
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <SummaryCard
          icon={<Database className="h-5 w-5 text-indigo-600" />}
          label="Total Storage"
          value={fmtGB(grandTotalGB)}
          sub="All services combined"
          color="bg-indigo-500/10"
        />
        <SummaryCard
          icon={<HardDrive className="h-5 w-5 text-emerald-600" />}
          label="Active Allocated"
          value={fmtGB(activeAllocated)}
          sub="On active services"
          color="bg-emerald-500/10"
        />
        <SummaryCard
          icon={<TrendingUp className="h-5 w-5 text-blue-600" />}
          label="Services Online"
          value={String(activeHosting + activeVPS + activeEmails + activeWebsites)}
          sub={`of ${hosting.length + vps.length + emails.length + websites.length} total`}
          color="bg-blue-500/10"
        />
        <SummaryCard
          icon={<CheckCircle2 className="h-5 w-5 text-violet-600" />}
          label="Usage Rate"
          value={`${usagePct}%`}
          sub="Active / total provisioned"
          color="bg-violet-500/10"
          alert={usagePct >= 85}
        />
      </div>

      {/* Circular Gauges */}
      <Card className="border-border/50 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Storage Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap justify-around gap-6 py-4">
            <CircularGauge used={hostingUsed} total={grandTotalGB || 1} label="Hosting" color="#6366f1" />
            <CircularGauge used={vpsUsed} total={grandTotalGB || 1} label="VPS" color="#22c55e" />
            <CircularGauge used={emailUsedGB} total={grandTotalGB || 1} label="Email" color="#f59e0b" />
            <CircularGauge used={websiteUsedGB} total={grandTotalGB || 1} label="Websites" color="#06b6d4" />
          </div>
        </CardContent>
      </Card>

      {/* Breakdown by Service */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest mb-3">
          Breakdown by Service
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <ServiceStorageCard
            icon={<HardDrive className="h-4 w-4 text-indigo-600" />}
            label="Hosting Storage"
            used={hostingUsed}
            total={hostingUsed || 1}
            activeCount={activeHosting}
            totalCount={hosting.length}
            color="bg-indigo-500/10"
            barColor="#6366f1"
          />
          <ServiceStorageCard
            icon={<Server className="h-4 w-4 text-emerald-600" />}
            label="VPS Storage"
            used={vpsUsed}
            total={vpsUsed || 1}
            activeCount={activeVPS}
            totalCount={vps.length}
            color="bg-emerald-500/10"
            barColor="#22c55e"
          />
          <ServiceStorageCard
            icon={<Mail className="h-4 w-4 text-amber-600" />}
            label="Email Storage"
            used={emailUsedGB}
            total={emailUsedGB || 1}
            activeCount={activeEmails}
            totalCount={emails.length}
            color="bg-amber-500/10"
            barColor="#f59e0b"
          />
          <ServiceStorageCard
            icon={<Database className="h-4 w-4 text-cyan-600" />}
            label="Website Storage"
            used={websiteUsedGB}
            total={websiteUsedGB || 1}
            activeCount={activeWebsites}
            totalCount={websites.length}
            color="bg-cyan-500/10"
            barColor="#06b6d4"
          />
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bar Chart */}
        <Card className="border-border/50 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Usage Comparison</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={barData} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} className="text-muted-foreground" />
                <YAxis
                  tickFormatter={(v) => `${v}GB`}
                  tick={{ fontSize: 11 }}
                  className="text-muted-foreground"
                />
                <Tooltip content={<CustomBarTooltip />} />
                <Bar dataKey="storage" radius={[6, 6, 0, 0]} name="Storage">
                  {barData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Pie Chart */}
        <Card className="border-border/50 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Storage Share</CardTitle>
          </CardHeader>
          <CardContent>
            {pieData.length === 0 ? (
              <div className="h-60 flex items-center justify-center text-muted-foreground text-sm">
                No storage data available
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="storage"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    innerRadius={48}
                    paddingAngle={3}
                    label={({ name, percent }) =>
                      `${name} ${(percent * 100).toFixed(0)}%`
                    }
                    labelLine={false}
                  >
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v: number) => [fmtGB(v), 'Storage']}
                    contentStyle={{
                      backgroundColor: 'var(--card)',
                      border: '1px solid var(--border)',
                      borderRadius: '0.75rem',
                    }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Expiring Soon Alert */}
      {soon.length > 0 && (
        <Card className="border-amber-500/30 bg-amber-500/5 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2 text-amber-600">
              <AlertTriangle className="h-4 w-4" />
              Services Expiring Within 30 Days
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {soon.slice(0, 8).map((s: any) => (
                <div key={s.id} className="flex items-center justify-between py-2 border-b border-border/30 last:border-0">
                  <span className="text-sm font-medium">{s.name}</span>
                  <span className="text-xs text-muted-foreground">
                    Expires {new Date(s.expiryDate).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
