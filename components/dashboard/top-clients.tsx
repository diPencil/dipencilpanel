'use client';

import React from 'react';
import Link from 'next/link';
import { Client, Invoice } from '@/lib/types';
import { formatCurrency } from '@/lib/formatting';

interface TopClientsProps {
  clients: Client[];
  invoices: Invoice[];
  /** Display currency for revenue totals (defaults to company default). */
  currency?: string;
}

export function TopClients({ clients = [], invoices = [], currency = 'USD' }: TopClientsProps) {
  const clientRevenue = (clients || []).map((client) => {
    const clientInvoices = (invoices || []).filter((inv) => inv?.clientId === client?.id);
    const totalRevenue = clientInvoices.reduce((sum, inv) => sum + (inv?.total || 0), 0);
    const invoiceCount = clientInvoices.length;
    return { client, totalRevenue, invoiceCount };
  });

  const topClients = [...(clientRevenue || [])]
    .sort((a, b) => (b.totalRevenue || 0) - (a.totalRevenue || 0))
    .slice(0, 5);

  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold">Top Clients</h3>
        <p className="text-sm text-muted-foreground">Clients by revenue</p>
      </div>

      {topClients.length === 0 ? (
        <div className="py-8 text-center">
          <p className="text-muted-foreground">No client data yet</p>
        </div>
      ) : (
        <div className="space-y-4">
          {topClients.map(({ client, totalRevenue, invoiceCount }) => (
            <Link
              key={client.id}
              href={`/dashboard/clients/${client.id}`}
              className="flex items-center justify-between p-3 rounded-lg hover:bg-muted transition-colors"
            >
              <div className="flex-1">
                <p className="font-medium">{client.name}</p>
                <p className="text-xs text-muted-foreground">
                  {invoiceCount} invoice{invoiceCount !== 1 ? 's' : ''}
                </p>
              </div>
              <p className="font-semibold text-primary">
                {formatCurrency(totalRevenue, currency)}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
