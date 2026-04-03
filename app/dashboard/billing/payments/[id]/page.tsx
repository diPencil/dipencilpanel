'use client';

import React from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useInvoiceData } from '@/context/InvoiceContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { InvoiceDisplay } from '@/components/invoices/invoice-display';
import { 
  ArrowLeft, 
  AlertCircle,
  Download, 
  HelpCircle,
  FileText
} from 'lucide-react';
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from "@/components/ui/tooltip";
import { formatCurrency, formatInvoiceDate, formatInvoiceNumber } from '@/lib/formatting';
import { exportInvoiceToPdf, invoicePdfFilename } from '@/lib/export-invoice-pdf';
import { toast } from 'sonner';

export default function PaymentDetailsPage() {
  const { id } = useParams();
  const router = useRouter();
  const { payments = [], invoices = [], getClient, company } = useInvoiceData();
  
  const payment = payments.find(p => p.id === id);
  const invoice = invoices.find(inv => inv.id === payment?.invoiceId);
  const client = getInvoiceClient();

  function getInvoiceClient() {
    if (!invoice) return null;
    return getClient(invoice.clientId);
  }

  const [pdfGenerating, setPdfGenerating] = React.useState(false);

  if (!payment) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <AlertCircle className="h-12 w-12 text-muted-foreground opacity-20" />
        <h2 className="text-xl font-semibold">Payment not found</h2>
        <Button onClick={() => router.back()}>Go Back</Button>
      </div>
    );
  }

  // Deterministic numeric ID for display
  const displayId = `H_${(payment.id.split('').reduce((sum, c) => sum + c.charCodeAt(0), 0) * 15485863 % 90000000 + 10000000).toString()}`;

  const handleDownloadPdf = async () => {
    if (!invoice || !client) return;
    setPdfGenerating(true);
    try {
      const formattedNum = formatInvoiceNumber(invoice.number);
      const el = document.getElementById('invoice-content');
      if (!el) throw new Error('Invoice content not found');
      
      await exportInvoiceToPdf(el, invoicePdfFilename(formattedNum));
      toast.success('Invoice PDF downloaded');
    } catch (e) {
      console.error(e);
      toast.error('Failed to generate PDF');
    } finally {
      setPdfGenerating(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer" onClick={() => router.back()}>
        <ArrowLeft className="h-4 w-4" />
        <span className="text-sm font-medium">Back</span>
      </div>

      <h1 className="text-3xl font-bold tracking-tight">Payment details</h1>

      <Card className="border-border/50 shadow-sm overflow-hidden bg-card">
        <div className="p-8 space-y-8">
          {/* Header ID */}
          <div>
             <div className="text-[14px] text-muted-foreground mb-1">Payment ID: <span className="font-mono text-foreground font-semibold">{displayId}</span></div>
          </div>

          {/* Services Table */}
          <div className="border border-border/50 rounded-lg overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-muted/30 border-b border-border/50">
                  <th className="px-6 py-3 text-[12px] font-bold uppercase tracking-wider text-muted-foreground">Services</th>
                  <th className="px-6 py-3 text-[12px] font-bold uppercase tracking-wider text-muted-foreground">Period</th>
                  <th className="px-6 py-3 text-[12px] font-bold uppercase tracking-wider text-muted-foreground text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {invoice?.items.map((item) => (
                  <tr key={item.id} className="hover:bg-muted/10 transition-colors">
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium leading-tight">{item.description}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">
                      {formatInvoiceDate(invoice.issueDate)} - {formatInvoiceDate(invoice.dueDate)}
                    </td>
                    <td className="px-6 py-4 text-sm font-mono font-medium text-right">
                      {formatCurrency(item.price * item.quantity, payment.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Summary Section */}
          <div className="flex flex-col items-end gap-4 pt-4 border-t border-border/50">
             <div className="w-full max-w-[400px]">
                <h3 className="text-sm font-bold uppercase mb-4 tracking-tight">Payment summary</h3>
                <div className="bg-muted/20 rounded-xl p-6 space-y-3">
                   <div className="flex justify-between items-center text-sm">
                      <span className="font-medium text-muted-foreground">Subtotal</span>
                      <span className="font-mono font-semibold">{formatCurrency(invoice?.subtotal || 0, payment.currency)}</span>
                   </div>
                   <div className="flex justify-between items-center text-sm">
                      <div className="flex items-center gap-1.5 font-medium text-muted-foreground">
                        Taxes & Fees 
                        <TooltipProvider delayDuration={0}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <HelpCircle className="h-3.5 w-3.5 opacity-40 cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent side="bottom" className="max-w-[200px] text-center bg-slate-800 text-white border-none py-2 px-3 shadow-xl">
                              <p className="text-xs leading-relaxed">
                                Taxes & fees are included. Download the invoice for details.
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <span className="font-mono font-semibold">{formatCurrency(invoice?.vatAmount || 0, payment.currency)}</span>
                   </div>
                   <div className="pt-3 border-t border-border/50 flex justify-between items-center">
                      <span className="text-lg font-bold">Total</span>
                      <span className="text-lg font-bold font-mono text-primary">
                        {formatCurrency(payment.amount, payment.currency)}
                      </span>
                   </div>
                </div>
             </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
             <Button 
                variant="outline" 
                className="gap-2 border-primary/20 hover:bg-primary/5 text-primary"
                onClick={handleDownloadPdf}
                disabled={pdfGenerating}
             >
                <Download className="h-4 w-4" /> 
                {pdfGenerating ? 'Preparing...' : 'Download Invoice'}
             </Button>
          </div>
        </div>
      </Card>

      {/* Hidden InvoiceDisplay for PDF generation */}
      <div className="hidden pointer-events-none opacity-0 absolute -z-50" aria-hidden="true">
        {invoice && client && company && (
          <InvoiceDisplay 
            invoice={invoice} 
            client={client} 
            company={company} 
          />
        )}
      </div>
    </div>
  );
}

