'use client';

import React from 'react';
import Link from 'next/link';
import { useInvoiceData } from '@/context/InvoiceContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  CreditCard, 
  FileText, 
  History, 
  TrendingUp, 
  AlertCircle, 
  CheckCircle,
  ArrowRight,
  Zap,
  Shield,
  BarChart3
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/formatting';
import { isSubscriptionActiveForKpis } from '@/lib/subscription-display-status';

export default function BillingOverviewPage() {
  const { 
    subscriptions = [], 
    invoices = [], 
    payments = [],
    getPaidRevenue,
    getPendingRevenue
  } = useInvoiceData();

  const stats = [
    {
      title: 'Active Subscriptions',
      value: subscriptions.filter(isSubscriptionActiveForKpis).length,
      icon: Zap,
      color: 'text-blue-600',
      bg: 'bg-blue-500/10'
    },
    {
      title: 'Pending Invoices',
      value: invoices.filter(i => i.status === 'pending').length,
      icon: FileText,
      color: 'text-yellow-600',
      bg: 'bg-yellow-500/10'
    },
    {
      title: 'Overdue Invoices',
      value: invoices.filter(i => i.status === 'overdue').length,
      icon: AlertCircle,
      color: 'text-red-600',
      bg: 'bg-red-500/10'
    },
    {
      title: 'Total Revenue',
      value: formatCurrency(getPaidRevenue(), 'USD'),
      icon: TrendingUp,
      color: 'text-emerald-600',
      bg: 'bg-emerald-500/10'
    }
  ];

  const paidRevenue = getPaidRevenue();
  const pendingRevenue = getPendingRevenue();
  const revenueTotal = paidRevenue + pendingRevenue;
  const collectedBarPct = revenueTotal > 0 ? Math.min(100, Math.round((paidRevenue / revenueTotal) * 100)) : 0;
  const pendingBarPct = revenueTotal > 0 ? Math.min(100, Math.round((pendingRevenue / revenueTotal) * 100)) : 0;
  const activeSubscriptionCount = subscriptions.filter(isSubscriptionActiveForKpis).length;

  const quickLinks = [
    {
      title: 'Subscriptions',
      description: 'Manage recurring services, plans, and auto-renewals.',
      href: '/dashboard/billing/subscriptions',
      icon: Shield,
      action: 'Manage Subscriptions'
    },
    {
      title: 'Invoices',
      description: 'View, download, and track client billing statements.',
      href: '/dashboard/billing/invoices',
      icon: FileText,
      action: 'View Invoices'
    },
    {
      title: 'Payment History',
      description: 'Review all completed transactions and revenue logs.',
      href: '/dashboard/billing/payments',
      icon: History,
      action: 'View Payments'
    }
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Billing Overview</h1>
        <p className="text-muted-foreground mt-1">Manage your SaaS billing ecosystem and financial performance</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <Card key={i} className="p-6 border-border/50 shadow-sm">
            <div className={`h-10 w-10 rounded-xl ${stat.bg} ${stat.color} flex items-center justify-center mb-4`}>
              <stat.icon className="h-6 w-6" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
            <p className="text-2xl font-bold mt-1">{stat.value}</p>
          </Card>
        ))}
      </div>

      {/* Navigation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {quickLinks.map((link, i) => (
          <Card key={i} className="flex flex-col p-6 hover:shadow-md transition-shadow group relative overflow-hidden ring-1 ring-border/50">
            <div className="mb-4 h-12 w-12 rounded-2xl bg-primary/5 flex items-center justify-center text-primary group-hover:bg-primary/10 transition-colors">
              <link.icon className="h-6 w-6" />
            </div>
            <h3 className="font-bold text-xl mb-2">{link.title}</h3>
            <p className="text-muted-foreground text-sm mb-6 grow leading-relaxed">
              {link.description}
            </p>
            <Link href={link.href}>
              <Button className="w-full justify-between group/btn shadow-none">
                {link.action}
                <ArrowRight className="h-4 w-4 transform group-hover/btn:translate-x-1 transition-transform" />
              </Button>
            </Link>
          </Card>
        ))}
      </div>

      {/* Recent Activity Mini-sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="p-6 border-border/50">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <History className="h-5 w-5 text-primary" /> Recent Payments
            </h3>
            <Link href="/dashboard/billing/payments">
              <Button variant="ghost" size="sm" className="text-xs h-8">View All</Button>
            </Link>
          </div>
          <div className="space-y-4">
            {payments.slice(0, 4).map((pay, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-border/30 last:border-0">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-600 text-[10px] font-bold">
                    {pay.clientName.charAt(0)}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">{pay.clientName}</span>
                    <span className="text-[10px] text-muted-foreground">{formatDate(pay.date)}</span>
                  </div>
                </div>
                <span className="text-sm font-bold text-emerald-600">+{formatCurrency(pay.amount, 'USD')}</span>
              </div>
            ))}
            {payments.length === 0 && <p className="text-center text-muted-foreground text-sm py-4">No recent payments</p>}
          </div>
        </Card>

        <Card className="p-6 border-border/50">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" /> Revenue Status
            </h3>
          </div>
          <div className="space-y-6">
             <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Collected Revenue</span>
                  <span className="font-semibold text-emerald-600">{formatCurrency(paidRevenue, 'USD')}</span>
                </div>
                <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                   <div
                     className="h-full bg-emerald-500 rounded-full transition-all"
                     style={{ width: revenueTotal > 0 ? `${collectedBarPct}%` : '0%' }}
                   />
                </div>
             </div>
             
             <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Pending Revenue</span>
                  <span className="font-semibold text-yellow-600">{formatCurrency(pendingRevenue, 'USD')}</span>
                </div>
                <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                   <div
                     className="h-full bg-yellow-500 rounded-full transition-all"
                     style={{ width: revenueTotal > 0 ? `${pendingBarPct}%` : '0%' }}
                   />
                </div>
             </div>

             <div className="pt-4 border-t border-border mt-4">
                <Card className="bg-primary/5 border-primary/10 p-4 flex items-center justify-between">
                   <div className="flex items-center gap-3">
                      <Zap className="h-5 w-5 text-primary" />
                      <div className="flex flex-col">
                         <span className="text-sm font-semibold">Ready to scale?</span>
                         <span className="text-xs text-muted-foreground">You have {activeSubscriptionCount} active subscription{activeSubscriptionCount === 1 ? '' : 's'}.</span>
                      </div>
                   </div>
                   <Link href="/dashboard/billing/subscriptions">
                      <Button size="sm" variant="outline" className="h-8 text-xs">Manage</Button>
                   </Link>
                </Card>
             </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
