'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useInvoiceData } from '@/context/InvoiceContext';
import { KPICard } from '@/components/dashboard/kpi-card';
import { DashboardExportDialog } from '@/components/dashboard/dashboard-export-dialog';
import { RevenueChart } from '@/components/dashboard/revenue-chart';
import { RecentInvoices } from '@/components/dashboard/recent-invoices';
import { TopClients } from '@/components/dashboard/top-clients';
import { DiskUsageWidget } from '@/components/dashboard/disk-usage-widget';
import { LatestDomainsWidget } from '@/components/dashboard/latest-domains-widget';
import { LatestWebsitesWidget } from '@/components/dashboard/latest-websites-widget';
import { QuickActions } from '@/components/dashboard/quick-actions';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  FileText,
  AlertCircle,
  CheckCircle,
  Clock,
  Download,
  TrendingUp,
  HardDrive,
  Globe,
  Monitor,
  Server,
  Smartphone,
} from 'lucide-react';
import { isSubscriptionActiveForKpis } from '@/lib/subscription-display-status';


export default function DashboardPage() {
  try {
    const {
      company,
      invoices,
      clients,
      subscriptions,
      hosting = [],
      domains = [],
      websites = [],
      vps = [],
      emails = [],
      payments = [],
      mobileApps = [],
      getRecentInvoices,
      getMonthlyRevenue,
    } = useInvoiceData();

    const [exportOpen, setExportOpen] = useState(false);
    const recentInvoices = typeof getRecentInvoices === 'function' ? getRecentInvoices(5) : [];
    const monthlyRevenue = typeof getMonthlyRevenue === 'function' ? getMonthlyRevenue() : [];

    const paidInvoices = (invoices || []).filter((inv) => inv?.paymentStatus === 'paid').length;
    const pendingInvoices = (invoices || []).filter((inv) => inv?.paymentStatus === 'unpaid').length;
    const activeSubscriptions = (subscriptions || []).filter(isSubscriptionActiveForKpis).length;
    const overdueInvoices = (invoices || []).filter(i => i.status === 'overdue').length;
    const activeHosting = (hosting || []).filter(h => h.status === 'active').length;
    const totalDomains = (domains || []).length;
    const activeWebsites = (websites || []).filter(w => w.status === 'active').length;
    const activeVPS = (vps || []).filter(v => v.status === 'active').length;

    const totalMobileApps = (mobileApps || []).length;


    return (
      <div className="space-y-10 min-h-full pb-10">
        
        {/* Page Title & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Dashboard Overview</h1>
            <p className="text-muted-foreground text-sm font-medium">
              Monitor your infrastructure and business metrics in real-time.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              className="rounded-xl shadow-sm hover:shadow-md transition-all"
              onClick={() => setExportOpen(true)}
            >
              <Download className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Export report</span>
              <span className="sm:hidden">Export</span>
            </Button>
            <Button asChild className="rounded-xl shadow-lg shadow-primary/20 hover:shadow-xl transition-all">
              <Link href="/dashboard/billing/financial-summary">
                <TrendingUp className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Financial summary</span>
                <span className="sm:hidden">Summary</span>
              </Link>
            </Button>
          </div>
        </div>

        <DashboardExportDialog
          open={exportOpen}
          onOpenChange={setExportOpen}
          data={{
            invoices: invoices ?? [],
            clients: clients ?? [],
            subscriptions: subscriptions ?? [],
            domains: domains ?? [],
            websites: websites ?? [],
            hosting: hosting ?? [],
            vps: vps ?? [],
            emails: emails ?? [],
            payments: payments ?? [],
            mobileApps: mobileApps ?? [],
          }}
        />

        {/* KPI Cards (4x2 Grid) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">

          <KPICard
            title="Paid Invoices"
            value={paidInvoices}
            description="Completed payments"
            icon={FileText}
            href="/dashboard/billing/invoices?status=paid"
            className="border-none shadow-md hover:shadow-lg transition-all ring-1 ring-border/50"
          />
          <KPICard
            title="Overdue Invoices"
            value={overdueInvoices}
            description="Past due date"
            icon={AlertCircle}
            href="/dashboard/billing/invoices?status=overdue"
            className="border-none shadow-md hover:shadow-lg transition-all ring-1 ring-border/50 text-red-600"
          />
          <KPICard
            title="Active Subscriptions"
            value={activeSubscriptions}
            description="Recurring services"
            icon={CheckCircle}
            href="/dashboard/billing/subscriptions"
            className="border-none shadow-md hover:shadow-lg transition-all ring-1 ring-border/50"
          />
          <KPICard
            title="Total Domains"
            value={totalDomains}
            description="Registered domains"
            icon={Globe}
            href="/dashboard/domains"
            className="border-none shadow-md hover:shadow-lg transition-all ring-1 ring-border/50"
          />
          <KPICard
            title="Active Websites"
            value={activeWebsites}
            description="Online sites"
            icon={Monitor}
            href="/dashboard/websites"
            className="border-none shadow-md hover:shadow-lg transition-all ring-1 ring-border/50"
          />
          <KPICard
            title="Active Hosting"
            value={activeHosting}
            description="Web & Cloud accounts"
            icon={HardDrive}
            href="/dashboard/hosting"
            className="border-none shadow-md hover:shadow-lg transition-all ring-1 ring-border/50"
          />
          <KPICard
            title="Active VPS"
            value={activeVPS}
            description="Virtual servers"
            icon={Server}
            href="/dashboard/vps"
            className="border-none shadow-md hover:shadow-lg transition-all ring-1 ring-border/50"
          />
          <KPICard
            title="Total Apps"
            value={totalMobileApps}
            description="Mobile applications"
            icon={Smartphone}
            href="/dashboard/mobile-apps"
            className="border-none shadow-md hover:shadow-lg transition-all ring-1 ring-border/50"
          />

        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <QuickActions />
        </div>

        {/* Middle Section: Main Analytics & Widgets */}
        <div className="grid grid-cols-1 xl:grid-cols-3 lg:grid-cols-2 gap-8 items-start">
          
          {/* Main Chart Section */}
          <div className="xl:col-span-2 lg:col-span-1 space-y-8">
            <RevenueChart data={monthlyRevenue} />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
               <DiskUsageWidget />
               <LatestWebsitesWidget />
            </div>
          </div>

          {/* Side Widgets Section */}
          <div className="space-y-8">
            <TopClients clients={clients} invoices={invoices} currency={company?.currency} />
            <LatestDomainsWidget />
          </div>

        </div>

        {/* Bottom Section: Full Width Recent Activity */}
        <div className="grid grid-cols-1 gap-8 pt-2">
           <RecentInvoices invoices={recentInvoices} clients={clients} />
        </div>

      </div>
    );
  } catch (error) {
    console.error('[Admin] Dashboard runtime error:', error);
    return (
      <Card className="p-8 text-center border-dashed border-2">
        <div className="mb-4 flex justify-center">
           <Clock className="h-12 w-12 text-red-500 opacity-20" />
        </div>
        <h2 className="text-xl font-bold text-foreground mb-2">Something went wrong</h2>
        <p className="text-muted-foreground text-sm max-w-md mx-auto mb-6">
          We encountered a problem loading your dashboard analytics. This might be due to a connection issue or a data formatting error.
        </p>
        <Button onClick={() => window.location.reload()} className="rounded-xl">
           Reload Dashboard
        </Button>
      </Card>
    );
  }
}
