'use client';

import React from 'react';
import Link from 'next/link';
import { Invoice, Client } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/invoices/status-badge';
import { formatCurrency, formatDate } from '@/lib/formatting';
import { ArrowRight } from 'lucide-react';

interface RecentInvoicesProps {
  invoices: Invoice[];
  clients: Client[];
}

export function RecentInvoices({ invoices = [], clients = [] }: RecentInvoicesProps) {
  const getClientName = (clientId: string) => {
    return clients?.find((c) => c?.id === clientId)?.name || 'Unknown';
  };

  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold">Recent Invoices</h3>
          <p className="text-sm text-muted-foreground">Your latest invoice activity</p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/dashboard/invoices">View All</Link>
        </Button>
      </div>

      {invoices.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-muted-foreground">No invoices yet</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left font-semibold py-3 px-3 text-muted-foreground">Invoice</th>
                <th className="text-left font-semibold py-3 px-3 text-muted-foreground">Client</th>
                <th className="text-left font-semibold py-3 px-3 text-muted-foreground">Amount</th>
                <th className="text-left font-semibold py-3 px-3 text-muted-foreground">Status</th>
                <th className="text-left font-semibold py-3 px-3 text-muted-foreground">Date</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((invoice) => (
                <tr
                  key={invoice.id}
                  className="border-b border-border hover:bg-muted/50 transition-colors"
                >
                  <td className="py-3 px-3">
                    <Link
                      href={`/dashboard/invoices/${invoice.id}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {invoice.number}
                    </Link>
                  </td>
                  <td className="py-3 px-3">{getClientName(invoice.clientId)}</td>
                  <td className="py-3 px-3 font-semibold">
                    {formatCurrency(invoice.total, invoice.currency)}
                  </td>
                  <td className="py-3 px-3">
                    <StatusBadge status={invoice.status} />
                  </td>
                  <td className="py-3 px-3 text-muted-foreground">
                    {formatDate(invoice.issueDate)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
