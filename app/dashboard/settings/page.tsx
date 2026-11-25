'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useInvoiceData } from '@/context/InvoiceContext';
import { BrandingTab } from '@/components/settings/branding-tab';
import { CompanyTab } from '@/components/settings/company-tab';
import { DipencilInvoicesTab } from '@/components/settings/dipencil-invoices-tab';
import { CurrencyConverter } from '@/components/settings/currency-converter';
import { EmailConfigTab } from '@/components/settings/email-config-tab';
import {
  HoverCard,
  HoverCardTrigger,
  HoverCardContent,
} from '@/components/ui/hover-card';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/core/formatting';
import {
  Building2,
  Receipt,
  FileSpreadsheet,
  Coins,
  Mail,
  AtSign,
  Database,
  Bell,
  Download,
  Upload,
  Loader2,
  ArrowRight,
  HelpCircle,
  TrendingUp,
} from 'lucide-react';
import { useConfirm } from '@/context/ConfirmationContext';
import type { SystemCompany } from '@/lib/core/types';
import { cn } from '@/lib/core/utils';

type SettingsTab =
  | 'company-settings'
  | 'client-invoices'
  | 'dipencil-invoices'
  | 'currency'
  | 'email-config'
  | 'emails'
  | 'database'
  | 'logs';

interface TabGuideInfo {
  title: string;
  scope: string;
  description: string;
  keyPoints: string[];
}

interface TabItem {
  id: SettingsTab;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  guide: TabGuideInfo;
}

const TABS: TabItem[] = [
  {
    id: 'company-settings',
    label: 'Company Settings',
    description: 'Project name, sidebar, login logo & favicon',
    icon: Building2,
    guide: {
      title: 'Master Company Identity',
      scope: 'Global Application Branding',
      description: 'Defines your core project title, legal company name, main sidebar logo, browser favicon, and login screen branding.',
      keyPoints: [
        'Customizes sidebar title and header branding',
        'Uploads browser tab favicon and login card mark',
        'Connects the active administrator account to master settings',
      ],
    },
  },
  {
    id: 'client-invoices',
    label: 'Client Invoices',
    description: 'Invoice logo, billing details & client footer',
    icon: Receipt,
    guide: {
      title: 'Client Invoices & Outgoing Billing',
      scope: 'Client-Facing Documents',
      description: 'Controls the legal company name, invoice logo, tax/VAT registration, contact details, and footer notes printed on client PDF invoices.',
      keyPoints: [
        'Client PDF invoice header and dedicated logo',
        'Official tax registration, VAT number, and payment notes',
        'Does not affect internal diPencil administrative billing',
      ],
    },
  },
  {
    id: 'dipencil-invoices',
    label: 'diPencil Invoices',
    description: 'DPC invoices, entity, branches & footer',
    icon: FileSpreadsheet,
    guide: {
      title: 'diPencil Internal Invoices',
      scope: 'Internal DPC Billing Only',
      description: 'Dedicated configuration for internal invoices under /dashboard/billing/dipencil-invoices. Configures internal seller names, branches, and custom footers.',
      keyPoints: [
        'Dedicated solely to /dashboard/billing/dipencil-invoices',
        'Custom internal seller branding and branch addresses',
        'Does not alter the main sidebar, login screen, or client invoices',
      ],
    },
  },
  {
    id: 'currency',
    label: 'Currency & Rates',
    description: 'Exchange rate converter',
    icon: Coins,
    guide: {
      title: 'Multi-Currency & Exchange Rates',
      scope: 'Financial Tools',
      description: 'Live multi-currency calculator and exchange rate tool for calculating real-time conversions across USD, EUR, EGP, SAR, and AED.',
      keyPoints: [
        'Live foreign exchange conversion calculator',
        'Quick cross-currency invoice comparisons',
        'Reference rates for international client quotes',
      ],
    },
  },
  {
    id: 'email-config',
    label: 'Email Configuration',
    description: 'Outgoing SMTP & incoming mailbox',
    icon: AtSign,
    guide: {
      title: 'Mail Server & SMTP Connectivity',
      scope: 'Email Infrastructure',
      description: 'Configures outgoing SMTP host credentials and incoming IMAP/POP3 mailbox parameters for dynamic, authenticated email delivery.',
      keyPoints: [
        'Outgoing SMTP server, port, and SSL/TLS encryption',
        'Incoming mailbox credentials and folder monitoring',
        'Live test dispatch and reception verification',
      ],
    },
  },
  {
    id: 'emails',
    label: 'Email Templates',
    description: 'Invoice & reminder layouts',
    icon: Mail,
    guide: {
      title: 'Email Templates & Messaging',
      scope: 'Client Communications',
      description: 'Customizes HTML headers, message bodies, dynamic client placeholders, and legal disclaimers for invoice dispatches and renewal notices.',
      keyPoints: [
        'HTML layouts for new invoices and payment receipts',
        'Automated expiration and renewal reminder templates',
        'Dynamic placeholder tags for client and service data',
      ],
    },
  },
  {
    id: 'database',
    label: 'Data & Backup',
    description: 'JSON export & merge backup',
    icon: Database,
    guide: {
      title: 'Database Backups & Export',
      scope: 'Data Management',
      description: 'Exports full operational data (clients, invoices, services, transactions) as JSON snapshots and restores backups safely.',
      keyPoints: [
        'Single-click full system JSON backup export',
        'Safe merge import preserving existing relations',
        'Strict tenant isolation and data integrity verification',
      ],
    },
  },
  {
    id: 'logs',
    label: 'System Stats & Logs',
    description: 'Activity & revenue metrics',
    icon: Bell,
    guide: {
      title: 'System Activity & Statistics',
      scope: 'Operational Telemetry',
      description: 'Real-time telemetry and overview of database records, active users, invoice revenue, and system activity logs.',
      keyPoints: [
        'Aggregate invoice counts and collected revenue',
        'Active client and service distribution metrics',
        'System audit trail and administrator activity logs',
      ],
    },
  },
];

export default function SettingsPage() {
  const { company, updateCompany, invoices = [] } = useInvoiceData();
  const [activeTab, setActiveTab] = useState<SettingsTab>('company-settings');
  const [isLoading, setIsLoading] = useState(false);
  const confirm = useConfirm();

  const stats = useMemo(() => {
    const totalInvoices = invoices.length;
    const totalRevenue = invoices
      .filter((inv) => inv.paymentStatus === 'paid')
      .reduce((sum, inv) => sum + inv.total, 0);
    const outstanding = invoices
      .filter((inv) => inv.paymentStatus !== 'paid')
      .reduce((sum, inv) => sum + inv.total, 0);

    return { totalInvoices, totalRevenue, outstanding };
  }, [invoices]);

  const handleUpdate = async (data: Partial<SystemCompany>) => {
    setIsLoading(true);
    try {
      const result = await updateCompany(data);
      if (result.success) {
        toast.success('Settings saved successfully.');
      }
      return result;
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateRates = async (rates: Record<string, number>) => {
    setIsLoading(true);
    try {
      const result = await updateCompany({ exchangeRates: rates });
      if (result.success) {
        toast.success('Exchange rates saved successfully.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const currentTabItem = TABS.find((t) => t.id === activeTab) ?? TABS[0];
  const CurrentIcon = currentTabItem.icon;

  return (
    <div className="space-y-6">
      {/* ── Page Header ── */}
      <div className="flex flex-col gap-1">
        <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          Administration
        </span>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
          Settings
        </h1>
        <p className="text-sm text-muted-foreground">
          Manage master company identity, client invoice branding, diPencil billing, currencies, and backups.
        </p>
      </div>

      {/* ── Main Layout: Vertical Tabs (Left) + Active Content (Right) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Vertical Tabs Navigation */}
        <div className="lg:col-span-4 xl:col-span-3">
          <div className="rounded-xl border border-border bg-card p-2 sm:p-2.5 shadow-xs space-y-1">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all group',
                    isActive
                      ? 'bg-primary/10 border border-primary/25 text-primary font-medium'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/60 border border-transparent'
                  )}
                >
                  <div
                    className={cn(
                      'h-9 w-9 rounded-lg flex items-center justify-center shrink-0 transition-colors',
                      isActive
                        ? 'bg-primary text-primary-foreground shadow-xs'
                        : 'bg-muted text-muted-foreground group-hover:text-foreground group-hover:bg-muted/80'
                    )}
                  >
                    <Icon className="h-4.5 w-4.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div
                      className={cn(
                        'text-sm font-semibold truncate',
                        isActive ? 'text-primary' : 'text-foreground'
                      )}
                    >
                      {tab.label}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {tab.description}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Quick Metrics Glance Box under Tabs */}
          <div className="mt-4 rounded-xl border border-border bg-card p-4 space-y-3 shadow-xs">
            <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              <span>Quick Revenue</span>
              <TrendingUp className="h-3.5 w-3.5 text-primary" />
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm pt-1">
              <div>
                <p className="text-[11px] text-muted-foreground">Invoices</p>
                <p className="font-bold text-foreground text-base">{stats.totalInvoices}</p>
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground">Paid</p>
                <p className="font-bold text-emerald-600 text-base">
                  {formatCurrency(stats.totalRevenue, company.currency)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Active Tab Content Panel */}
        <div className="lg:col-span-8 xl:col-span-9">
          <div className="rounded-xl border border-border bg-card p-6 shadow-xs">
            {/* Header of Active Tab */}
            <div className="flex items-start gap-3 pb-5 border-b border-border">
              <div className="h-10 w-10 rounded-lg bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shrink-0">
                <CurrentIcon className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-foreground">{currentTabItem.label}</h2>
                  <HoverCard openDelay={80} closeDelay={150}>
                    <HoverCardTrigger asChild>
                      <button
                        type="button"
                        className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-muted/70 hover:bg-muted text-muted-foreground hover:text-foreground transition-all duration-200 border border-border/70 hover:border-primary/50 shadow-xs cursor-help focus:outline-hidden focus:ring-2 focus:ring-primary/40"
                        aria-label={`${currentTabItem.label} guide`}
                      >
                        <HelpCircle className="h-3.5 w-3.5" />
                      </button>
                    </HoverCardTrigger>
                    <HoverCardContent
                      align="start"
                      side="bottom"
                      sideOffset={8}
                      className="w-80 sm:w-96 p-0 rounded-2xl border border-border/60 bg-card/85 dark:bg-card/75 backdrop-blur-xl shadow-2xl overflow-hidden animate-in fade-in-0 zoom-in-95"
                    >
                      {/* Subtle Ambient Glass Glow */}
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-primary/5 pointer-events-none" />

                      <div className="relative p-4 space-y-3">
                        {/* Header */}
                        <div className="flex items-start gap-2.5">
                          <div className="h-8 w-8 rounded-lg bg-primary/15 border border-primary/25 text-primary flex items-center justify-center shrink-0 mt-0.5">
                            <CurrentIcon className="h-4 w-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <h4 className="text-xs font-bold text-foreground truncate">
                                {currentTabItem.guide.title}
                              </h4>
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 shrink-0">
                                {currentTabItem.guide.scope}
                              </span>
                            </div>
                            <p className="text-[11px] text-muted-foreground mt-0.5">
                              Tab Guide &amp; Controls
                            </p>
                          </div>
                        </div>

                        {/* Description */}
                        <p className="text-xs leading-relaxed text-foreground/85">
                          {currentTabItem.guide.description}
                        </p>

                        {/* Key Points */}
                        {currentTabItem.guide.keyPoints && currentTabItem.guide.keyPoints.length > 0 && (
                          <div className="pt-2.5 border-t border-border/50 space-y-1.5">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                              What this tab controls:
                            </p>
                            <ul className="space-y-1">
                              {currentTabItem.guide.keyPoints.map((point, i) => (
                                <li key={i} className="flex items-center gap-2 text-[11px] text-muted-foreground">
                                  <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                                  <span>{point}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </HoverCardContent>
                  </HoverCard>
                </div>
                <p className="text-xs text-muted-foreground">{currentTabItem.description}</p>
              </div>
            </div>

            {/* Tab Body */}
            <div className="pt-6">
              {activeTab === 'company-settings' && (
                <BrandingTab
                  company={company}
                  onSubmit={handleUpdate}
                  isLoading={isLoading}
                />
              )}

              {activeTab === 'client-invoices' && (
                <CompanyTab
                  company={company}
                  onSubmit={handleUpdate}
                  isLoading={isLoading}
                />
              )}

              {activeTab === 'dipencil-invoices' && (
                <DipencilInvoicesTab
                  company={company}
                  onSubmit={handleUpdate}
                  isLoading={isLoading}
                />
              )}

              {activeTab === 'currency' && (
                <CurrencyConverter
                  company={company}
                  onUpdateRates={handleUpdateRates}
                  isLoading={isLoading}
                />
              )}

              {activeTab === 'email-config' && (
                <EmailConfigTab
                  company={company}
                  onSubmit={handleUpdate}
                  isLoading={isLoading}
                />
              )}

              {activeTab === 'emails' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="rounded-xl border border-border p-5 bg-background space-y-3 flex flex-col justify-between">
                    <div>
                      <div className="h-9 w-9 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-3">
                        <Mail className="h-4.5 w-4.5" />
                      </div>
                      <h3 className="font-semibold text-foreground text-sm">
                        Invoice Email Template
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                        Customize the HTML header and footer sent with client billing emails. Line items and totals update automatically.
                      </p>
                    </div>
                    <Link
                      href="/dashboard/settings/invoice-email"
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline pt-2"
                    >
                      <span>Edit Invoice Email Template</span>
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  </div>

                  <div className="rounded-xl border border-border p-5 bg-background space-y-3 flex flex-col justify-between">
                    <div>
                      <div className="h-9 w-9 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-3">
                        <Mail className="h-4.5 w-4.5" />
                      </div>
                      <h3 className="font-semibold text-foreground text-sm">
                        Renewal Reminder Template
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                        Customize the renewal notice emails sent for expiring domains, hosting, and subscription services.
                      </p>
                    </div>
                    <Link
                      href="/dashboard/settings/reminder-email"
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline pt-2"
                    >
                      <span>Edit Reminder Template</span>
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  </div>
                </div>
              )}

              {activeTab === 'database' && (
                <div className="space-y-6">
                  <div className="p-4 rounded-lg bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 text-xs text-amber-900 dark:text-amber-200">
                    <p className="font-medium text-sm mb-1">Database Backup &amp; Synchronization</p>
                    <p className="leading-relaxed text-muted-foreground">
                      Export your entire dataset as JSON, or merge records from an existing backup file. Importing only inserts new records and never overwrites or deletes existing rows.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-5 rounded-xl border border-border bg-background space-y-3">
                      <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                        <Download className="h-4 w-4 text-primary" />
                        Export Data
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        Download a full snapshot of your clients, invoices, domains, and hosting configurations.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          window.location.href = '/api/database';
                          toast.success('Database export initiated.');
                        }}
                        disabled={isLoading}
                        className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors"
                      >
                        <Download className="h-3.5 w-3.5" />
                        Export JSON Backup
                      </button>
                    </div>

                    <div className="p-5 rounded-xl border border-border bg-background space-y-3">
                      <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                        <Upload className="h-4 w-4 text-primary" />
                        Import &amp; Merge
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        Merge records from another JSON backup without losing your current database items.
                      </p>
                      <input
                        type="file"
                        accept=".json"
                        id="import-db-tab"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;

                          const confirmed = await confirm({
                            title: 'Merge Database Backup',
                            description: 'Are you sure you want to merge this backup? New records will be added to your current data without deleting anything.',
                            confirmText: 'Merge Now',
                            cancelText: 'Cancel',
                            variant: 'destructive',
                          });

                          if (!confirmed) {
                            e.target.value = '';
                            return;
                          }

                          setIsLoading(true);
                          const formData = new FormData();
                          formData.append('file', file);

                          try {
                            const res = await fetch('/api/database', {
                              method: 'POST',
                              body: formData,
                            });

                            if (res.ok) {
                              toast.success('Database merged successfully! Refreshing...');
                              setTimeout(() => window.location.reload(), 1500);
                            } else {
                              const errData = await res.json();
                              toast.error(errData.error || 'Merge failed');
                            }
                          } catch {
                            toast.error('An error occurred during database merge');
                          } finally {
                            setIsLoading(false);
                            e.target.value = '';
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => document.getElementById('import-db-tab')?.click()}
                        disabled={isLoading}
                        className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
                      >
                        {isLoading ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Upload className="h-3.5 w-3.5" />
                        )}
                        Import &amp; Merge Backup
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'logs' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="p-4 rounded-xl border border-border bg-background">
                      <p className="text-xs text-muted-foreground">Total Invoices</p>
                      <p className="text-xl font-bold text-foreground mt-1">{stats.totalInvoices}</p>
                    </div>
                    <div className="p-4 rounded-xl border border-border bg-background">
                      <p className="text-xs text-muted-foreground">Collected Revenue</p>
                      <p className="text-xl font-bold text-emerald-600 mt-1">
                        {formatCurrency(stats.totalRevenue, company.currency)}
                      </p>
                    </div>
                    <div className="p-4 rounded-xl border border-border bg-background">
                      <p className="text-xs text-muted-foreground">Outstanding Balance</p>
                      <p className="text-xl font-bold text-red-600 mt-1">
                        {formatCurrency(stats.outstanding, company.currency)}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-xl border border-border p-5 bg-background flex items-center justify-between gap-4">
                    <div className="space-y-1">
                      <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                        <Bell className="h-4 w-4 text-primary" />
                        System Activity Logs
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        Inspect the chronological record of user sessions, notifications, and scheduled service checks.
                      </p>
                    </div>
                    <Link
                      href="/dashboard/settings/notifications"
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors shrink-0"
                    >
                      <span>Open Logs</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>

                  <div className="rounded-xl border border-border p-5 bg-background flex items-center justify-between gap-4">
                    <div className="space-y-1">
                      <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                        <HelpCircle className="h-4 w-4 text-muted-foreground" />
                        Help &amp; Documentation
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        Review system architecture guides and reseller invoice workflow documentation.
                      </p>
                    </div>
                    <Link
                      href="/dashboard/help"
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg border border-border hover:bg-muted transition-colors shrink-0"
                    >
                      <span>View Guides</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
