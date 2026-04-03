'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useInvoiceData } from '@/context/InvoiceContext';
import { CompanyInfoForm } from '@/components/settings/company-info-form';
import { CurrencyConverter } from '@/components/settings/currency-converter';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/formatting';
import { useMemo } from 'react';
import { Mail } from 'lucide-react';

export default function SettingsPage() {
  const { company, updateCompany, invoices = [] } = useInvoiceData();
  const [isLoading, setIsLoading] = useState(false);

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

  const handleSubmit = async (data: any) => {
    setIsLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 300));
      updateCompany(data);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateRates = async (rates: Record<string, number>) => {
    setIsLoading(true);
    try {
      updateCompany({ exchangeRates: rates });
      toast.success('Exchange rates saved!');
    } catch {
      toast.error('Failed to save exchange rates');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Manage your company information and invoice defaults</p>
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
                <p className="font-semibold text-lg text-orange-600">
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
        </div>
      </div>
    </div>
  );
}
