'use client';

import React, { useLayoutEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useInvoiceData } from '@/context/InvoiceContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { InvoiceDisplay } from '@/components/invoices/invoice-display';
import { exportElementToPdf, invoicePdfFilename } from '@/lib/export-invoice-pdf';
import { sendInvoiceToClientEmail } from '@/app/actions/invoice-email';
import { SendInvoiceDialog } from '@/components/invoices/send-invoice-dialog';
import type { Client, Invoice } from '@/lib/types';
import { 
  Download, 
  Eye, 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  Plus, 
  Search,
  Send,
  MoreHorizontal,
  Trash2
} from 'lucide-react';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { formatCurrency, formatDate, formatInvoiceNumber } from '@/lib/formatting';
import { convertCurrency } from '@/lib/currency-utils';

export default function InvoicesPage() {
  const {
    invoices = [],
    websites = [],
    domains = [],
    emails = [],
    vps = [],
    hosting = [],
    mobileApps = [],
    markAsPaid,
    deleteInvoice,
    getClient,
    company,
  } = useInvoiceData();
  const [filterStatus, setFilterStatus] = useState<'all' | 'paid' | 'pending' | 'overdue'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [pdfJob, setPdfJob] = useState<{ invoice: Invoice; client: Client } | null>(null);
  const [sendingEmailId, setSendingEmailId] = useState<string | null>(null);
  const [deletingInvoice, setDeletingInvoice] = useState<Invoice | null>(null);
  const [sendDialogInvoice, setSendDialogInvoice] = useState<Invoice | null>(null);

  const handleDeleteConfirm = useCallback(() => {
    if (!deletingInvoice) return;
    deleteInvoice(deletingInvoice.id);
    toast.success(`Invoice ${formatInvoiceNumber(deletingInvoice.number)} deleted`);
    setDeletingInvoice(null);
  }, [deletingInvoice, deleteInvoice]);

  useLayoutEffect(() => {
    if (!pdfJob) return;
    let cancelled = false;

    const run = async () => {
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      if (cancelled) return;
      const el = document.getElementById('invoice-content');
      if (!el) {
        toast.error('Could not prepare PDF');
        setPdfJob(null);
        return;
      }
      try {
        await exportElementToPdf(el, invoicePdfFilename(formatInvoiceNumber(pdfJob.invoice.number)));
        toast.success('Invoice PDF downloaded');
      } catch (e) {
        console.error(e);
        toast.error(e instanceof Error ? e.message : 'PDF export failed');
      } finally {
        if (!cancelled) setPdfJob(null);
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [pdfJob]);

  const handleDownloadPdf = (invoice: Invoice) => {
    const client = getClient(invoice.clientId);
    if (!client) {
      toast.error('Client not found for this invoice');
      return;
    }
    setPdfJob({ invoice, client });
  };

  const openSendDialog = (invoice: Invoice) => {
    const client = getClient(invoice.clientId);
    if (!client?.email?.trim()) {
      toast.error('Client has no email address');
      return;
    }
    setSendDialogInvoice(invoice);
  };

  const handleSendConfirm = async (invoice: Invoice, ccEmails: string[]) => {
    setSendingEmailId(invoice.id);
    try {
      const res = await sendInvoiceToClientEmail(invoice.id, invoice.companyId, ccEmails);
      if (res.success) {
        const client = getClient(invoice.clientId);
        const ccText = ccEmails.length > 0 ? ` + ${ccEmails.length} CC` : '';
        toast.success(`Invoice sent to ${client?.email}${ccText}`);
        setSendDialogInvoice(null);
      } else {
        toast.error(res.error);
      }
    } finally {
      setSendingEmailId(null);
    }
  };

  const filteredInvoices = invoices.filter((inv) => {
    const client = getClient(inv.clientId);
    const searchMatch = `${client?.name} ${formatInvoiceNumber(inv.number)}`.toLowerCase().includes(searchTerm.toLowerCase());
    const statusMatch = filterStatus === 'all' || inv.status === filterStatus;
    return searchMatch && statusMatch;
  });

  const companyCurrency = company.currency || 'USD';
  const filteredTotalPricing =
    searchTerm.trim().length > 0
      ? filteredInvoices.reduce(
          (sum, inv) =>
            sum + convertCurrency(inv.total, inv.currency || companyCurrency, companyCurrency, company),
          0
        )
      : null;

  const getServiceName = (invoice: (typeof invoices)[number]) => {
    // 1. Specific service name stored in DB
    if (invoice.serviceName) return invoice.serviceName; 
    
    // 2. Lookup based on serviceType + serviceId
    if (invoice.serviceId) {
      if (invoice.serviceType === 'domain') {
        const d = domains.find(x => x.id === invoice.serviceId);
        if (d) return `${d.name}${d.tld}`;
      }
      if (invoice.serviceType === 'website') {
        const w = websites.find(x => x.id === invoice.serviceId);
        if (w) return w.name;
      }
      if (invoice.serviceType === 'email') {
        const e = emails.find(x => x.id === invoice.serviceId);
        if (e) return `${e.name}@${e.domain}`;
      }
      if (invoice.serviceType === 'vps') {
        const v = vps.find(x => x.id === invoice.serviceId);
        if (v) return v.name;
      }
      if (invoice.serviceType === 'hosting') {
        const h = hosting.find(x => x.id === invoice.serviceId);
        if (h) return h.name;
      }
      if (invoice.serviceType === 'mobile_app') {
        const a = mobileApps.find(x => x.id === invoice.serviceId);
        if (a) return a.name;
      }
    }

    // 3. Fallback to first item description
    if (invoice.items && invoice.items.length > 0) {
      return invoice.items[0].description;
    }

    return 'General billing';
  };

  const getStatusBadge = (invoice: (typeof invoices)[number]) => {
    if (invoice.paymentStatus === 'paid') {
      return (
        <Badge className="bg-green-500/10 text-green-500 border-green-500/20 hover:bg-green-500/20 flex items-center gap-1">
          <CheckCircle className="h-3 w-3" /> Paid
        </Badge>
      );
    }
    if (invoice.status === 'overdue') {
      return (
        <Badge className="bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500/20 flex items-center gap-1">
          <AlertCircle className="h-3 w-3" /> Overdue
        </Badge>
      );
    }
    return (
      <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20 hover:bg-blue-500/20 flex items-center gap-1">
        <Clock className="h-3 w-3" /> Pending
      </Badge>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Invoices</h1>
          <p className="text-muted-foreground mt-1">Manage and track your client invoices</p>
        </div>
        <Link href="/dashboard/billing/invoices/new">
          <Button className="shadow-lg shadow-primary/20 gap-2">
            <Plus className="h-4 w-4" /> Create Invoice
          </Button>
        </Link>
      </div>

      <div className="flex flex-col md:flex-row md:items-center gap-4 justify-between">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          {(['all', 'paid', 'pending', 'overdue'] as const).map((status) => (
            <Button
              key={status}
              variant={filterStatus === status ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterStatus(status)}
              className="capitalize whitespace-nowrap"
            >
              {status === 'all' ? 'All Invoices' : `${status.charAt(0).toUpperCase() + status.slice(1)}`}
            </Button>
          ))}
        </div>
        
        <div className="flex items-center gap-3 flex-wrap md:justify-end w-full md:w-auto">
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search invoices..."
              className="pl-9 bg-card"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              aria-describedby={
                filteredTotalPricing !== null
                  ? 'invoices-search-count invoices-search-total'
                  : 'invoices-search-count'
              }
            />
          </div>
          <div className="flex flex-col gap-0.5 shrink-0 items-start leading-tight">
            <p
              id="invoices-search-count"
              className="text-sm text-muted-foreground whitespace-nowrap tabular-nums"
              aria-live="polite"
            >
              <span className="font-semibold text-foreground">{filteredInvoices.length}</span>
              {filteredInvoices.length === 1 ? ' invoice' : ' invoices'}
              {searchTerm.trim()
                ? filteredInvoices.length === 1
                  ? ' matches'
                  : ' match'
                : ''}
            </p>
            {filteredTotalPricing !== null && (
              <p
                id="invoices-search-total"
                className="text-sm text-muted-foreground whitespace-nowrap tabular-nums"
                aria-live="polite"
              >
                Total pricing:{' '}
                <span className="font-semibold text-foreground">
                  {formatCurrency(filteredTotalPricing, companyCurrency)}
                </span>
              </p>
            )}
          </div>
        </div>
      </div>

      <Card className="border-border/50 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold">Invoice Number</th>
                <th className="px-6 py-4 text-left text-sm font-semibold">Client</th>
                <th className="px-6 py-4 text-left text-sm font-semibold">Service</th>
                <th className="px-6 py-4 text-left text-sm font-semibold">Amount</th>
                <th className="px-6 py-4 text-left text-sm font-semibold">Status</th>
                <th className="px-6 py-4 text-left text-sm font-semibold">Dates</th>
                <th className="px-6 py-4 text-right text-sm font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-muted-foreground">
                    <div className="flex flex-col items-center gap-2">
                      <AlertCircle className="h-8 w-8 opacity-20" />
                      <p>No invoices found</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((invoice) => {
                  const client = getClient(invoice.clientId);
                  return (
                    <tr key={invoice.id} className="hover:bg-muted/30 transition-colors group">
                      <td className="px-6 py-4 font-semibold text-sm">
                        {formatInvoiceNumber(invoice.number)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-sm font-medium">{client?.name || 'Unknown'}</span>
                          <span className="text-xs text-muted-foreground truncate max-w-[150px]">{client?.email}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm whitespace-nowrap overflow-hidden text-ellipsis max-w-[150px]">
                        {getServiceName(invoice)}
                      </td>
                      <td className="px-6 py-4 font-bold text-sm">
                        {formatCurrency(invoice.total, invoice.currency)}
                      </td>
                      <td className="px-6 py-4">
                        {getStatusBadge(invoice)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-[10px] text-muted-foreground">Issued: {formatDate(invoice.issueDate)}</span>
                          <span className="text-[10px] text-muted-foreground">Due: {formatDate(invoice.dueDate)}</span>
                          {invoice.nextBillingDate && (
                            <span className="text-[10px] text-muted-foreground">Next: {formatDate(invoice.nextBillingDate)}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                           <Link href={`/dashboard/billing/invoices/${invoice.id}`}>
                            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-blue-500/10 hover:text-blue-600 rounded-full">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Link>
                          
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-accent">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuItem
                                className="gap-2"
                                disabled={!!pdfJob}
                                onClick={() => handleDownloadPdf(invoice)}
                              >
                                <Download className="h-4 w-4" /> Download PDF
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="gap-2"
                                disabled={sendingEmailId === invoice.id}
                                onClick={() => openSendDialog(invoice)}
                              >
                                <Send className="h-4 w-4" />
                                {sendingEmailId === invoice.id ? 'Sending…' : 'Send to Client'}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              {invoice.paymentStatus !== 'paid' && (
                                <DropdownMenuItem 
                                  className="gap-2 text-green-600 focus:text-green-600 focus:bg-green-50"
                                  onClick={() => markAsPaid(invoice.id, 'card')}
                                >
                                  <CheckCircle className="h-4 w-4" /> Mark as Paid
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="gap-2 text-destructive focus:text-destructive focus:bg-destructive/10"
                                onClick={() => setDeletingInvoice(invoice)}
                              >
                                <Trash2 className="h-4 w-4" /> Delete Invoice
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {pdfJob ? (
        <div
          aria-hidden
          className="fixed -left-[9999px] top-0 w-[900px] pointer-events-none overflow-hidden"
        >
          <InvoiceDisplay invoice={pdfJob.invoice} client={pdfJob.client} company={company} />
        </div>
      ) : null}

      <SendInvoiceDialog
        invoice={sendDialogInvoice}
        open={!!sendDialogInvoice}
        onOpenChange={(open) => !open && setSendDialogInvoice(null)}
        onSend={handleSendConfirm}
        isSending={!!sendingEmailId}
      />

      <AlertDialog open={!!deletingInvoice} onOpenChange={(open) => !open && setDeletingInvoice(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete invoice?</AlertDialogTitle>
            <AlertDialogDescription>
              Invoice <strong>{deletingInvoice && formatInvoiceNumber(deletingInvoice.number)}</strong> will be
              permanently deleted. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-white border border-slate-200 text-red-600 hover:bg-red-50 shadow-sm transition-colors"
              onClick={handleDeleteConfirm}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
