'use client';

import React from 'react';
import { useInvoiceData } from '@/context/InvoiceContext';
import { KPICard } from '@/components/dashboard/kpi-card';
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
  DollarSign,
  FileText,
  AlertCircle,
  CheckCircle,
  Clock,
  Download,
  Plus,
  ArrowUpRight,
  HardDrive,
  Globe,
  Monitor,
  Server,
  Smartphone,
} from 'lucide-react';
import { formatCurrency } from '@/lib/formatting';
import { isSubscriptionActiveForKpis } from '@/lib/subscription-display-status';


export default function DashboardPage() {
  try {
    const {
      invoices,
      clients,
      subscriptions,
      hosting = [],
      domains = [],
      websites = [],
      vps = [],
      mobileApps = [],
      getRecentInvoices,
      getMonthlyRevenue,
      getPaidRevenue,
    } = useInvoiceData();

    const paidRevenue = typeof getPaidRevenue === 'function' ? getPaidRevenue() : 0;
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
             <Button variant="outline" className="hidden sm:flex rounded-xl shadow-sm hover:shadow-md transition-all">
                <Download className="mr-2 h-4 w-4" /> 
                Export Report
             </Button>
             <Button className="rounded-xl shadow-lg shadow-primary/20 hover:shadow-xl transition-all">
                <Plus className="mr-2 h-4 w-4" /> 
                Add Website
             </Button>
          </div>
        </div>

        {/* KPI Cards (4x2 Grid) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">

          <KPICard
            title="Paid Invoices"
            value={paidInvoices}
            description="Completed payments"
            icon={FileText}
            className="border-none shadow-md hover:shadow-lg transition-all ring-1 ring-border/50"
          />
          <KPICard
            title="Overdue Invoices"
            value={overdueInvoices}
            description="Past due date"
            icon={AlertCircle}
            className="border-none shadow-md hover:shadow-lg transition-all ring-1 ring-border/50 text-red-600"
          />
          <KPICard
            title="Active Subscriptions"
            value={activeSubscriptions}
            description="Recurring services"
            icon={CheckCircle}
            className="border-none shadow-md hover:shadow-lg transition-all ring-1 ring-border/50"
          />
          <KPICard
            title="Total Domains"
            value={totalDomains}
            description="Registered domains"
            icon={Globe}
            className="border-none shadow-md hover:shadow-lg transition-all ring-1 ring-border/50"
          />
          <KPICard
            title="Active Websites"
            value={activeWebsites}
            description="Online sites"
            icon={Monitor}
            className="border-none shadow-md hover:shadow-lg transition-all ring-1 ring-border/50"
          />
          <KPICard
            title="Active Hosting"
            value={activeHosting}
            description="Web & Cloud accounts"
            icon={HardDrive}
            className="border-none shadow-md hover:shadow-lg transition-all ring-1 ring-border/50"
          />
          <KPICard
            title="Active VPS"
            value={activeVPS}
            description="Virtual servers"
            icon={Server}
            className="border-none shadow-md hover:shadow-lg transition-all ring-1 ring-border/50"
          />
          <KPICard
            title="Total Apps"
            value={totalMobileApps}
            description="Mobile applications"
            icon={Smartphone}
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
            <TopClients clients={clients} invoices={invoices} />
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
