'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useInvoiceData } from '@/context/InvoiceContext';
import { CompanyInfoForm } from '@/components/settings/company-info-form';
import { CurrencyConverter } from '@/components/settings/currency-converter';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/formatting';
import { useMemo } from 'react';
import { Mail, Database, Download, Upload, Loader2, AlertTriangle, Bell } from 'lucide-react';
import { useConfirm } from '@/context/ConfirmationContext';
import type { SystemCompany } from '@/lib/types';

export default function SettingsPage() {
  const { company, updateCompany, invoices = [] } = useInvoiceData();
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

  const handleSubmit = async (data: Partial<SystemCompany>) => {
    setIsLoading(true);
    try {
      const result = await updateCompany(data);
      if (result.success) {
        toast.success('Company settings saved.');
      }
      // Failures are already reported via toast inside updateCompany.
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateRates = async (rates: Record<string, number>) => {
    setIsLoading(true);
    try {
      const result = await updateCompany({ exchangeRates: rates });
      if (result.success) {
        toast.success('Exchange rates saved!');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">System configuration — invoice sender info, logos, currency, and tax defaults. This is separate from the client companies list.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="rounded-lg border border-border bg-card p-6">
            <h2 className="text-xl font-semibold mb-6">Company Information</h2>
            <CompanyInfoForm
              company={company}
              onSubmit={handleSubmit}
              isLoading={isLoading}
            />
          </div>

          <div className="mt-8 rounded-lg border border-border bg-card p-6">
            <h2 className="text-xl font-semibold mb-6">Currency Converter Settings</h2>
            <CurrencyConverter
              company={company}
              onUpdateRates={handleUpdateRates}
              isLoading={isLoading}
            />
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-card p-6">
            <h3 className="font-semibold mb-3">Quick Info</h3>
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-muted-foreground">Total Invoices</p>
                <p className="font-semibold text-lg">{stats.totalInvoices}</p>
              </div>
              <div className="pt-3 border-t border-border">
                <p className="text-muted-foreground">Total Revenue</p>
                <p className="font-semibold text-lg text-green-600">
                  {formatCurrency(stats.totalRevenue, company.currency)}
                </p>
              </div>
              <div className="pt-3 border-t border-border">
                <p className="text-muted-foreground">Outstanding</p>
                <p className="font-semibold text-lg text-red-600">
                  {formatCurrency(stats.outstanding, company.currency)}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card p-6">
            <h3 className="font-semibold mb-3">Help</h3>
            <p className="text-xs text-muted-foreground mb-4">
              Need help managing your invoices? Check out our documentation.
            </p>
            <a
              href="#"
              className="text-xs text-primary hover:underline"
            >
              View Documentation →
            </a>
          </div>

          <div className="rounded-lg border border-border bg-card p-6">
            <h3 className="font-semibold mb-3">Invoice email template</h3>
            <p className="text-xs text-muted-foreground mb-4">
              Customize the HTML header and footer for &quot;Send to Client&quot; emails. Line items and totals stay automatic.
            </p>
            <Link
              href="/dashboard/settings/invoice-email"
              className="inline-flex items-center gap-2 text-xs font-medium text-primary hover:underline"
            >
              <Mail className="h-3.5 w-3.5 shrink-0" />
              Edit header &amp; footer →
            </Link>
          </div>

          <div className="rounded-lg border border-border bg-card p-6">
            <h3 className="font-semibold mb-3">Reminder email template</h3>
            <p className="text-xs text-muted-foreground mb-4">
              Customize the HTML for renewal reminders sent from Subscription Reminders. Service details table stays automatic.
            </p>
            <Link
              href="/dashboard/settings/reminder-email"
              className="inline-flex items-center gap-2 text-xs font-medium text-primary hover:underline"
            >
              <Mail className="h-3.5 w-3.5 shrink-0" />
              Edit header, body &amp; footer →
            </Link>
          </div>

          <div className="rounded-lg border border-border bg-card p-6">
            <h3 className="font-semibold mb-3">System logs</h3>
            <p className="text-xs text-muted-foreground mb-4">
              View the complete history of all system notifications, logins, and automated tasks.
            </p>
            <Link
              href="/dashboard/settings/notifications"
              className="inline-flex items-center gap-2 text-xs font-medium text-primary hover:underline"
            >
              <Bell className="h-3.5 w-3.5 shrink-0" />
              View full notification log →
            </Link>
          </div>

          <div className="rounded-lg border p-6 border-red-200 dark:border-red-950/50 bg-red-50/10 dark:bg-red-950/5">
            <div className="flex items-center gap-2 mb-3">
              <Database className="h-4 w-4 text-red-600" />
              <h3 className="font-semibold">Database Management</h3>
            </div>
            <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
              Export a JSON backup, or Import &amp; Merge to add new data from another device.
              <span className="block mt-1 font-medium text-red-600/80 italic">Note: Importing will only add new records and won&apos;t delete your current data.</span>
            </p>

            <div className="flex flex-col gap-2">
              <button
                onClick={async () => {
                  setIsLoading(true);
                  try {
                    window.location.href = '/api/database';
                    toast.success('Database export started');
                  } catch (e) {
                    toast.error('Export failed');
                  } finally {
                    setIsLoading(false);
                  }
                }}
                disabled={isLoading}
                className="flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 transition-colors disabled:opacity-50"
              >
                <Download className="h-3.5 w-3.5" />
                Export JSON Backup
              </button>

              <div className="relative">
                <input
                  type="file"
                  accept=".json"
                  id="import-db"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;

                    const confirmed = await confirm({
                      title: 'Merge Database',
                      description: 'Are you sure you want to merge this backup? New records will be added to your current data without deleting anything.',
                      confirmText: 'Merge Now',
                      cancelText: 'Cancel',
                      variant: 'destructive'
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
                        const data = await res.json();
                        toast.error(data.error || 'Merge failed');
                      }
                    } catch (err) {
                      toast.error('An error occurred during merge');
                    } finally {
                      setIsLoading(false);
                      e.target.value = '';
                    }
                  }}
                />
                <button
                  onClick={() => document.getElementById('import-db')?.click()}
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                  Import &amp; Merge Backup
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
