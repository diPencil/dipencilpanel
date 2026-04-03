'use client';

import React, { useMemo } from 'react';
import { useInvoiceData } from '@/context/InvoiceContext';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/formatting';
import { isSubscriptionActiveForKpis } from '@/lib/subscription-display-status';
import {
  TrendingUp,
  DollarSign,
  Calendar,
  ArrowUpRight,
  Globe,
  HardDrive,
  Mail,
  Zap,
  Monitor,
  Smartphone,
  AlertTriangle,
  CheckCircle2,
  Clock,
  CreditCard,
  Wallet,
  Percent,
  Layers,
} from 'lucide-react';

function KpiCard({
  icon,
  label,
  value,
  sub,
  color,
  badge,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  color: string;
  badge?: string;
}) {
  return (
    <Card className="p-6 border-border/50 shadow-sm relative overflow-hidden group bg-card">
      <div className="flex justify-between items-start mb-4">
        <div className={`h-10 w-10 rounded-xl flex items-center justify-center transition-colors ${color}`}>
          {icon}
        </div>
        {badge && (
          <Badge variant="outline" className="text-xs font-medium">
            {badge}
          </Badge>
        )}
      </div>
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </Card>
  );
}

function ServiceRow({
  icon,
  label,
  count,
  active,
  revenue,
  currency,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  count: number;
  active: number;
  revenue: number;
  currency: string;
  color: string;
}) {
  return (
    <div className="flex items-center gap-4 py-3 border-b border-border/50 last:border-0">
      <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${color}`}>{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold">{label}</p>
        <p className="text-xs text-muted-foreground">
          {count} total · {active} active
        </p>
      </div>
      <div className="text-right shrink-0">
        <p className="text-sm font-bold">{formatCurrency(revenue, currency)}</p>
        <p className="text-xs text-muted-foreground">collected</p>
      </div>
    </div>
  );
}

export default function FinancialSummaryPage() {
  const {
    payments = [],
    invoices = [],
    subscriptions = [],
    domains = [],
    clients = [],
    hosting = [],
    emails = [],
    vps = [],
    websites = [],
    mobileApps = [],
    company,
  } = useInvoiceData();

  const currency = company.currency || 'USD';
  const now = new Date();
  const thisYear = now.getFullYear();
  const thisMonth = now.getMonth();

  const totalAllTime = useMemo(() => payments.reduce((s, p) => s + p.amount, 0), [payments]);
  const totalThisYear = useMemo(
    () =>
      payments
        .filter((p) => new Date(p.date).getFullYear() === thisYear)
        .reduce((s, p) => s + p.amount, 0),
    [payments, thisYear],
  );
  const totalThisMonth = useMemo(
    () =>
      payments
        .filter((p) => {
          const d = new Date(p.date);
          return d.getFullYear() === thisYear && d.getMonth() === thisMonth;
        })
        .reduce((s, p) => s + p.amount, 0),
    [payments, thisYear, thisMonth],
  );

  const paidInvoices = invoices.filter((i) => i.paymentStatus === 'paid');
  const unpaidInvoices = invoices.filter((i) => i.paymentStatus !== 'paid');
  const overdueInvoices = invoices.filter((i) => i.status === 'overdue');

  const outstanding = unpaidInvoices.reduce((s, i) => s + i.total, 0);

  const activeSubscriptions = subscriptions.filter(isSubscriptionActiveForKpis);

  const subscriptionEconomics = useMemo(() => {
    const act = subscriptions.filter(isSubscriptionActiveForKpis);
    let mrrMargin = 0;
    let arrMargin = 0;
    let mrrProviderCost = 0;
    let arrProviderCost = 0;
    let mrrClient = 0;
    let arrClient = 0;
    let trackedProviderCount = 0;
    for (const s of act) {
      const client = s.price ?? 0;
      const prov = s.providerPrice ?? 0;
      if (prov > 0) trackedProviderCount += 1;
      if (s.billingCycle === 'monthly') {
        mrrMargin += client - prov;
        mrrProviderCost += prov;
        mrrClient += client;
      } else {
        arrMargin += client - prov;
        arrProviderCost += prov;
        arrClient += client;
      }
    }
    const totalClientRecurring = mrrClient + arrClient;
    const totalMargin = mrrMargin + arrMargin;
    const blendedMarginPct =
      totalClientRecurring > 0 ? (totalMargin / totalClientRecurring) * 100 : null;
    /** Rough “per month” view: monthly margin + 1/12 of annual margin */
    const combinedMonthlyMarginRunRate = mrrMargin + arrMargin / 12;
    return {
      mrrMargin,
      arrMargin,
      mrrProviderCost,
      arrProviderCost,
      blendedMarginPct,
      combinedMonthlyMarginRunRate,
      trackedProviderCount,
      activeSubscriptionCount: act.length,
    };
  }, [subscriptions]);

  const monthlyRecurring = activeSubscriptions
    .filter((s) => s.billingCycle === 'monthly')
    .reduce((sum, s) => sum + (s.price ?? 0), 0);
  const yearlyRecurring = activeSubscriptions
    .filter((s) => s.billingCycle === 'yearly')
    .reduce((sum, s) => sum + (s.price ?? 0), 0);

  const revenueByService = useMemo(() => {
    const map: Record<string, number> = {};
    paidInvoices.forEach((inv) => {
      const type = inv.serviceType || 'general';
      map[type] = (map[type] ?? 0) + inv.total;
    });
    return map;
  }, [paidInvoices]);

  const expiringSoon = useMemo(() => {
    const clientNameById = new Map(clients.map((c) => [c.id, c.name]));
    const clientLabel = (clientId: string) => clientNameById.get(clientId)?.trim() || '—';

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + 30);
    const items: { id: string; label: string; date: string; clientName: string }[] = [];
    domains.forEach((d) => {
      if (d.renewalDate && new Date(d.renewalDate) <= cutoff) {
        items.push({
          id: `domain-${d.id}`,
          label: `Domain: ${d.name}`,
          date: d.renewalDate,
          clientName: clientLabel(d.clientId),
        });
      }
    });
    subscriptions.forEach((s) => {
      if (s.expiryDate && new Date(s.expiryDate) <= cutoff && s.status === 'active') {
        const title = [s.serviceName, s.planName].filter(Boolean).join(' · ') || 'Subscription';
        items.push({
          id: `sub-${s.id}`,
          label: `Subscription: ${title}`,
          date: s.expiryDate,
          clientName: clientLabel(s.clientId),
        });
      }
    });
    return items.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [domains, subscriptions, clients]);

  const recentPayments = [...payments]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 8);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-right-2 duration-500">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Financial Summary</h1>
        <p className="text-muted-foreground mt-1">
          Full financial overview across all services — revenue, subscriptions, outstanding, and upcoming renewals.
        </p>
      </div>

      {/* Revenue KPIs */}
      <section>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Revenue</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
          <KpiCard
            icon={<DollarSign className="h-5 w-5 text-emerald-600" />}
            color="bg-emerald-500/10 group-hover:bg-emerald-500/20"
            label="Total Revenue (All time)"
            value={formatCurrency(totalAllTime, currency)}
            sub={`${paidInvoices.length} paid invoices`}
          />
          <KpiCard
            icon={<TrendingUp className="h-5 w-5 text-blue-600" />}
            color="bg-blue-500/10 group-hover:bg-blue-500/20"
            label="This Year"
            value={formatCurrency(totalThisYear, currency)}
            badge={String(thisYear)}
          />
          <KpiCard
            icon={<Calendar className="h-5 w-5 text-purple-600" />}
            color="bg-purple-500/10 group-hover:bg-purple-500/20"
            label="This Month"
            value={formatCurrency(totalThisMonth, currency)}
            badge="Current month"
          />
          <KpiCard
            icon={<AlertTriangle className="h-5 w-5 text-orange-500" />}
            color="bg-orange-500/10 group-hover:bg-orange-500/20"
            label="Outstanding"
            value={formatCurrency(outstanding, currency)}
            sub={`${unpaidInvoices.length} unpaid · ${overdueInvoices.length} overdue`}
          />
        </div>
      </section>

      {/* Subscriptions & Recurring */}
      <section>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
          Subscriptions & Recurring
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
          <KpiCard
            icon={<CheckCircle2 className="h-5 w-5 text-emerald-600" />}
            color="bg-emerald-500/10 group-hover:bg-emerald-500/20"
            label="Active Subscriptions"
            value={String(activeSubscriptions.length)}
            sub={`of ${subscriptions.length} total`}
          />
          <KpiCard
            icon={<ArrowUpRight className="h-5 w-5 text-blue-600" />}
            color="bg-blue-500/10 group-hover:bg-blue-500/20"
            label="Monthly Recurring (MRR)"
            value={formatCurrency(monthlyRecurring, currency)}
            sub="Active monthly plans"
          />
          <KpiCard
            icon={<CreditCard className="h-5 w-5 text-indigo-600" />}
            color="bg-indigo-500/10 group-hover:bg-indigo-500/20"
            label="Annual Recurring (ARR)"
            value={formatCurrency(yearlyRecurring, currency)}
            sub="Active yearly plans"
          />
          <KpiCard
            icon={<Clock className="h-5 w-5 text-amber-600" />}
            color="bg-amber-500/10 group-hover:bg-amber-500/20"
            label="Expiring (next 30 days)"
            value={String(expiringSoon.length)}
            sub="Domains & subscriptions"
            badge={expiringSoon.length > 0 ? 'Action needed' : undefined}
          />
        </div>
      </section>

      {/* Internal subscription margin (provider price is never invoiced) */}
      <section>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-1">
          Subscription margin (internal)
        </h2>
        <p className="text-xs text-muted-foreground mb-4 max-w-3xl">
          Estimated margin = client price − provider price for <strong>active</strong> subscriptions. Provider
          amounts are stored for your records only and are not included on invoices or payments.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
          <KpiCard
            icon={<Wallet className="h-5 w-5 text-teal-600" />}
            color="bg-teal-500/10 group-hover:bg-teal-500/20"
            label="MRR margin (est.)"
            value={formatCurrency(subscriptionEconomics.mrrMargin, currency)}
            sub={`Provider cost ${formatCurrency(subscriptionEconomics.mrrProviderCost, currency)} / mo`}
          />
          <KpiCard
            icon={<Wallet className="h-5 w-5 text-cyan-600" />}
            color="bg-cyan-500/10 group-hover:bg-cyan-500/20"
            label="ARR margin (est.)"
            value={formatCurrency(subscriptionEconomics.arrMargin, currency)}
            sub={`Provider cost ${formatCurrency(subscriptionEconomics.arrProviderCost, currency)} / yr`}
          />
          <KpiCard
            icon={<Layers className="h-5 w-5 text-violet-600" />}
            color="bg-violet-500/10 group-hover:bg-violet-500/20"
            label="Combined margin / mo (est.)"
            value={formatCurrency(subscriptionEconomics.combinedMonthlyMarginRunRate, currency)}
            sub="MRR margin + 1/12 of annual margin (rough monthly run-rate)"
          />
          <KpiCard
            icon={<Percent className="h-5 w-5 text-amber-600" />}
            color="bg-amber-500/10 group-hover:bg-amber-500/20"
            label="Blended margin %"
            value={
              subscriptionEconomics.blendedMarginPct != null
                ? `${subscriptionEconomics.blendedMarginPct.toFixed(1)}%`
                : '—'
            }
            sub={`${subscriptionEconomics.trackedProviderCount} of ${subscriptionEconomics.activeSubscriptionCount} active subs have provider price`}
          />
        </div>
      </section>

      {/* Revenue by Service + Expiring Soon */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue by service */}
        <Card className="border-border/50 shadow-sm">
          <div className="p-5 border-b border-border/50">
            <h3 className="font-semibold">Revenue by Service</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Collected from paid invoices only</p>
          </div>
          <div className="p-5 space-y-1">
            <ServiceRow
              icon={<Globe className="h-4 w-4 text-blue-600" />}
              color="bg-blue-500/10"
              label="Domains"
              count={domains.length}
              active={domains.filter((d) => d.status === 'active').length}
              revenue={revenueByService['domain'] ?? 0}
              currency={currency}
            />
            <ServiceRow
              icon={<HardDrive className="h-4 w-4 text-violet-600" />}
              color="bg-violet-500/10"
              label="Hosting"
              count={hosting.length}
              active={hosting.filter((h) => h.status === 'active').length}
              revenue={revenueByService['hosting'] ?? 0}
              currency={currency}
            />
            <ServiceRow
              icon={<Mail className="h-4 w-4 text-emerald-600" />}
              color="bg-emerald-500/10"
              label="Email"
              count={emails.length}
              active={emails.filter((e) => e.status === 'active').length}
              revenue={revenueByService['email'] ?? 0}
              currency={currency}
            />
            <ServiceRow
              icon={<Zap className="h-4 w-4 text-yellow-600" />}
              color="bg-yellow-500/10"
              label="VPS"
              count={vps.length}
              active={vps.filter((v) => v.status === 'active').length}
              revenue={revenueByService['vps'] ?? 0}
              currency={currency}
            />
            <ServiceRow
              icon={<Monitor className="h-4 w-4 text-pink-600" />}
              color="bg-pink-500/10"
              label="Websites"
              count={websites.length}
              active={websites.filter((w) => w.status === 'active').length}
              revenue={revenueByService['website'] ?? 0}
              currency={currency}
            />
            <ServiceRow
              icon={<Smartphone className="h-4 w-4 text-orange-600" />}
              color="bg-orange-500/10"
              label="Mobile Apps"
              count={mobileApps.length}
              active={mobileApps.filter((a) => a.status !== 'expired' && a.status !== 'suspended').length}
              revenue={revenueByService['mobile_app'] ?? 0}
              currency={currency}
            />
            <ServiceRow
              icon={<DollarSign className="h-4 w-4 text-muted-foreground" />}
              color="bg-muted"
              label="General Billing"
              count={invoices.filter((i) => !i.serviceType || i.serviceType === 'general').length}
              active={0}
              revenue={revenueByService['general'] ?? 0}
              currency={currency}
            />
          </div>
        </Card>

        {/* Expiring Soon */}
        <Card className="border-border/50 shadow-sm">
          <div className="p-5 border-b border-border/50">
            <h3 className="font-semibold">Expiring in the Next 30 Days</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Domains and subscriptions requiring renewal</p>
          </div>
          <div className="p-5">
            {expiringSoon.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
                <p className="text-sm font-medium">All clear!</p>
                <p className="text-xs text-muted-foreground mt-1">No renewals due in the next 30 days.</p>
              </div>
            ) : (
              <ul className="space-y-2">
                {expiringSoon.map((item) => {
                  const daysLeft = Math.ceil(
                    (new Date(item.date).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
                  );
                  return (
                    <li key={item.id} className="flex items-center justify-between text-sm py-2 border-b border-border/40 last:border-0">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <Clock className={`h-4 w-4 shrink-0 ${daysLeft <= 7 ? 'text-red-500' : 'text-amber-500'}`} />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium text-muted-foreground truncate">{item.clientName}</p>
                          <p className="truncate text-foreground">{item.label}</p>
                        </div>
                      </div>
                      <Badge
                        variant="outline"
                        className={`ml-2 shrink-0 text-xs ${
                          daysLeft <= 7
                            ? 'border-red-500/30 text-red-600 bg-red-500/5'
                            : 'border-amber-500/30 text-amber-600 bg-amber-500/5'
                        }`}
                      >
                        {daysLeft <= 0 ? 'Expired' : `${daysLeft}d left`}
                      </Badge>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </Card>
      </div>

      {/* Recent Payments */}
      <Card className="border-border/50 shadow-sm">
        <div className="p-5 border-b border-border/50">
          <h3 className="font-semibold">Recent Payments</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Last 8 transactions</p>
        </div>
        {recentPayments.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground text-sm">No payments recorded yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50 bg-muted/30">
                  <th className="text-left py-3 px-5 font-semibold text-muted-foreground">Client</th>
                  <th className="text-left py-3 px-5 font-semibold text-muted-foreground">Invoice</th>
                  <th className="text-left py-3 px-5 font-semibold text-muted-foreground">Method</th>
                  <th className="text-left py-3 px-5 font-semibold text-muted-foreground">Date</th>
                  <th className="text-right py-3 px-5 font-semibold text-muted-foreground">Amount</th>
                </tr>
              </thead>
              <tbody>
                {recentPayments.map((p) => (
                  <tr key={p.id} className="border-b border-border/40 hover:bg-muted/30 transition-colors last:border-0">
                    <td className="py-3 px-5 font-medium">{p.clientName || '—'}</td>
                    <td className="py-3 px-5 text-muted-foreground">{p.invoiceNumber || '—'}</td>
                    <td className="py-3 px-5">
                      <Badge variant="outline" className="text-xs capitalize">
                        {p.method}
                      </Badge>
                    </td>
                    <td className="py-3 px-5 text-muted-foreground">
                      {new Date(p.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td className="py-3 px-5 text-right font-bold text-emerald-600">
                      {formatCurrency(p.amount, currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
