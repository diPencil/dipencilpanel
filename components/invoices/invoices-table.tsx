'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { Invoice, Client } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StatusBadge } from './status-badge';
import { formatCurrency, formatDate, formatInvoiceNumber } from '@/lib/formatting';
import { Plus, Search, Eye, Trash2, Copy } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';

interface InvoicesTableProps {
  invoices: Invoice[];
  clients: Client[];
  onDeleteInvoice: (id: string) => void;
  onDuplicateInvoice: (id: string) => void;
}

export function InvoicesTable({
  invoices,
  clients,
  onDeleteInvoice,
  onDuplicateInvoice,
}: InvoicesTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [deletingInvoice, setDeletingInvoice] = useState<Invoice | undefined>();
  const { toast } = useToast();

  const filteredInvoices = useMemo(
    () =>
      invoices.filter(
        (invoice) =>
          invoice.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
          clients.find((c) => c.id === invoice.clientId)?.name.toLowerCase().includes(searchTerm.toLowerCase())
      ),
    [invoices, clients, searchTerm]
  );

  const getClientName = (clientId: string) => {
    return clients.find((c) => c.id === clientId)?.name || 'Unknown';
  };

  const handleDelete = (invoice: Invoice) => {
    onDeleteInvoice(invoice.id);
    setDeletingInvoice(undefined);
    toast({
      title: 'Deleted',
      description: 'Invoice has been deleted.',
    });
  };

  const handleDuplicate = (invoice: Invoice) => {
    onDuplicateInvoice(invoice.id);
    toast({
      title: 'Duplicated',
      description: 'Invoice has been duplicated.',
    });
  };

  return (
    <>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold">Invoices</h2>
            <p className="text-sm text-muted-foreground">
              Manage and track all your invoices
            </p>
          </div>
          <Button asChild className="gap-2">
            <Link href="/dashboard/invoices/create">
              <Plus className="h-4 w-4" />
              New Invoice
            </Link>
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search by invoice number or client..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Table */}
        <div className="rounded-lg border border-border overflow-hidden">
          {filteredInvoices.length === 0 ? (
            <div className="py-12 text-center bg-card">
              <p className="text-muted-foreground mb-3">
                {searchTerm ? 'No invoices found' : 'No invoices yet. Create one to get started.'}
              </p>
              {!searchTerm && (
                <Button asChild>
                  <Link href="/dashboard/invoices/create">Create Invoice</Link>
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left font-semibold py-3 px-4">Invoice #</th>
                    <th className="text-left font-semibold py-3 px-4">Client</th>
                    <th className="text-left font-semibold py-3 px-4">Amount</th>
                    <th className="text-left font-semibold py-3 px-4">Status</th>
                    <th className="text-left font-semibold py-3 px-4">Date</th>
                    <th className="text-left font-semibold py-3 px-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInvoices.map((invoice) => (
                    <tr
                      key={invoice.id}
                      className="border-b border-border hover:bg-muted/50 transition-colors"
                    >
                      <td className="py-3 px-4 font-medium">{formatInvoiceNumber(invoice.number)}</td>
                      <td className="py-3 px-4">{getClientName(invoice.clientId)}</td>
                      <td className="py-3 px-4 font-semibold">
                        {formatCurrency(invoice.total, invoice.currency)}
                      </td>
                      <td className="py-3 px-4">
                        <StatusBadge status={invoice.status} />
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">
                        {formatDate(invoice.issueDate)}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1">
                          <Button
                            asChild
                            variant="ghost"
                            size="sm"
                            className="gap-1"
                          >
                            <Link href={`/dashboard/invoices/${invoice.id}`}>
                              <Eye className="h-4 w-4" />
                              <span className="hidden sm:inline">View</span>
                            </Link>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDuplicate(invoice)}
                            className="gap-1"
                          >
                            <Copy className="h-4 w-4" />
                            <span className="hidden sm:inline">Duplicate</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeletingInvoice(invoice)}
                            className="gap-1 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                            <span className="hidden sm:inline">Delete</span>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Delete Dialog */}
      <AlertDialog open={!!deletingInvoice} onOpenChange={(open) => !open && setDeletingInvoice(undefined)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Invoice?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete invoice {deletingInvoice?.number}.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-2">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingInvoice && handleDelete(deletingInvoice)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
