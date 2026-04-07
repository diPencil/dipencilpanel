'use client';

import Link from 'next/link';
import { Invoice, Client } from '@/lib/types';
import { formatCurrency, formatDate, formatInvoiceNumber } from '@/lib/formatting';
import { StatusBadge } from './status-badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Eye, Download, Trash2 } from 'lucide-react';

interface InvoicesResponsiveProps {
  invoices: Invoice[];
  clients: Client[];
  onDelete?: (id: string) => void;
}

export function InvoicesResponsive({
  invoices,
  clients,
  onDelete,
}: InvoicesResponsiveProps) {
  const getClientName = (clientId: string) => {
    return clients.find((c) => c.id === clientId)?.name || 'Unknown';
  };

  // Mobile: Card view
  return (
    <div className="space-y-4">
      {/* Desktop table - hidden on mobile */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-3 px-4 font-semibold text-muted-foreground">
                Invoice
              </th>
              <th className="text-left py-3 px-4 font-semibold text-muted-foreground">
                Client
              </th>
              <th className="text-left py-3 px-4 font-semibold text-muted-foreground">
                Amount
              </th>
              <th className="text-left py-3 px-4 font-semibold text-muted-foreground">
                Status
              </th>
              <th className="text-left py-3 px-4 font-semibold text-muted-foreground">
                Date
              </th>
              <th className="text-right py-3 px-4 font-semibold text-muted-foreground">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((invoice) => (
              <tr
                key={invoice.id}
                className="border-b border-border hover:bg-muted/50 transition-colors"
              >
                <td className="py-3 px-4 font-medium">{formatInvoiceNumber(invoice.number)}</td>
                <td className="py-3 px-4">{getClientName(invoice.clientId)}</td>
                <td className="py-3 px-4 font-medium">
                  {formatCurrency(invoice.total, invoice.currency)}
                </td>
                <td className="py-3 px-4">
                  <StatusBadge status={invoice.paymentStatus} />
                </td>
                <td className="py-3 px-4 text-muted-foreground">
                  {formatDate(invoice.createdAt)}
                </td>
                <td className="py-3 px-4">
                  <div className="flex gap-2 justify-end">
                    <Link href={`/dashboard/invoices/${invoice.id}`}>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0"
                        title="View"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </Link>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0"
                      title="Download"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    {onDelete && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                        onClick={() => onDelete(invoice.id)}
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile: Card view - shown only on mobile */}
      <div className="md:hidden space-y-3">
        {invoices.map((invoice) => (
          <Card key={invoice.id} className="p-4">
            <div className="space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-sm">{formatInvoiceNumber(invoice.number)}</p>
                  <p className="text-xs text-muted-foreground">
                    {getClientName(invoice.clientId)}
                  </p>
                </div>
                <StatusBadge status={invoice.paymentStatus} />
              </div>

              <div className="flex items-center justify-between">
                <span className="font-semibold">
                  {formatCurrency(invoice.total, invoice.currency)}
                </span>
                <span className="text-xs text-muted-foreground">
                  {formatDate(invoice.createdAt)}
                </span>
              </div>

              <div className="flex gap-2 pt-2">
                <Link href={`/dashboard/invoices/${invoice.id}`} className="flex-1">
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full h-8 text-xs"
                  >
                    <Eye className="h-3 w-3 mr-1" />
                    View
                  </Button>
                </Link>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 h-8 text-xs"
                >
                  <Download className="h-3 w-3 mr-1" />
                  Download
                </Button>
                {onDelete && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 w-8 p-0"
                    onClick={() => onDelete(invoice.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {invoices.length === 0 && (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">No invoices found</p>
        </Card>
      )}
    </div>
  );
}
