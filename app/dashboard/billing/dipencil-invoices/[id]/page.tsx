'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useInvoiceData } from '@/context/InvoiceContext';
import { InvoiceDisplay } from '@/components/invoices/invoice-display';
import { InvoiceForm } from '@/components/invoices/invoice-form';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { exportElementToPdf, invoicePdfFilename } from '@/lib/export-invoice-pdf';
import { formatInvoiceNumber } from '@/lib/formatting';
import { ChevronLeft, Printer, Download, Edit } from 'lucide-react';
const LIST_HREF = '/dashboard/billing/dipencil-invoices';

export default function DipencilInvoiceDetailPage() {
  const params = useParams();
  const { toast } = useToast();
  const { clients, company, getInvoice, updateInvoice, getClient } = useInvoiceData();
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isPdfExporting, setIsPdfExporting] = useState(false);

  const invoice = getInvoice(params.id as string);

  if (!invoice) {
    return (
      <div className="space-y-6">
        <Button asChild variant="ghost">
          <Link href={LIST_HREF} className="gap-2">
            <ChevronLeft className="h-4 w-4" />
            Back to diPencil Invoices
          </Link>
        </Button>
        <div className="rounded-lg border border-border bg-card p-12 text-center">
          <p className="text-muted-foreground">Invoice not found</p>
        </div>
      </div>
    );
  }

  if (invoice.invoiceKind !== 'dipencil') {
    return (
      <div className="space-y-6">
        <Button asChild variant="ghost">
          <Link href={LIST_HREF} className="gap-2">
            <ChevronLeft className="h-4 w-4" />
            Back to diPencil Invoices
          </Link>
        </Button>
        <div className="rounded-lg border border-border bg-card p-12 text-center space-y-2">
          <p className="text-muted-foreground">This invoice is a client invoice.</p>
          <Button asChild variant="outline" size="sm">
            <Link href={`/dashboard/billing/invoices/${invoice.id}`}>Open in Invoices</Link>
          </Button>
        </div>
      </div>
    );
  }

  const client = getClient(invoice.clientId);
  if (!client) {
    return (
      <div className="space-y-6">
        <Button asChild variant="ghost">
          <Link href={LIST_HREF} className="gap-2">
            <ChevronLeft className="h-4 w-4" />
            Back to diPencil Invoices
          </Link>
        </Button>
        <div className="rounded-lg border border-border bg-card p-12 text-center">
          <p className="text-muted-foreground">Client record not found</p>
        </div>
      </div>
    );
  }

  const handleUpdate = async (data: Parameters<typeof updateInvoice>[1]) => {
    setIsLoading(true);
    try {
      const result = await updateInvoice(invoice.id, data);
      if (result.success) {
        toast({
          title: 'Success',
          description: 'Invoice updated successfully',
        });
        setIsEditing(false);
      } else {
        toast({
          title: 'Error',
          description: result.error ?? 'Failed to update invoice',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update invoice',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrint = () => {
    const el = document.getElementById('invoice-content');
    if (!el) return;

    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (!printWindow) return;

    const styles = Array.from(document.styleSheets)
      .map((sheet) => {
        try {
          return Array.from(sheet.cssRules).map((r) => r.cssText).join('\n');
        } catch {
          return '';
        }
      })
      .join('\n');

    printWindow.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title></title>
  <style>
    ${styles}
    @page { margin: 0; size: A4 portrait; }
    body { margin: 0; padding: 0; background: white; }
    #invoice-content { box-shadow: none !important; }
  </style>
</head>
<body>
  ${el.outerHTML}
  <script>
    window.onload = function () {
      window.focus();
      window.print();
      window.onafterprint = function () { window.close(); };
    };
  <\/script>
</body>
</html>`);
    printWindow.document.close();
  };

  const handleDownloadPdf = async () => {
    const el = document.getElementById('invoice-content');
    if (!el) {
      toast({ title: 'Could not export', description: 'Invoice content not found.', variant: 'destructive' });
      return;
    }
    setIsPdfExporting(true);
    try {
      const formattedNum = formatInvoiceNumber(invoice.number);
      await exportElementToPdf(el as HTMLElement, invoicePdfFilename(formattedNum));
      toast({ title: 'PDF ready', description: 'The invoice was downloaded.' });
    } catch (err) {
      console.error(err);
      toast({
        title: 'PDF export failed',
        description: err instanceof Error ? err.message : 'Try again or use Print → Save as PDF.',
        variant: 'destructive',
      });
    } finally {
      setIsPdfExporting(false);
    }
  };

  return (
    <div className="space-y-6 print:p-0">
      <div className="flex items-center justify-between no-print">
        <div className="flex items-center gap-4">
          <Button asChild variant="ghost" size="sm">
            <Link href={LIST_HREF} className="gap-2">
              <ChevronLeft className="h-4 w-4" />
              Back to diPencil Invoices
            </Link>
          </Button>
          <h1 className="text-xl font-bold tracking-tight">diPencil Invoice</h1>
        </div>

        <div className="flex items-center gap-2">
          {!isEditing && (
            <>
              <Button variant="outline" size="sm" onClick={handlePrint} className="gap-2">
                <Printer className="h-4 w-4" />
                Print
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadPdf}
                disabled={isPdfExporting}
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                {isPdfExporting ? 'Preparing…' : 'Download PDF'}
              </Button>
              <Button variant="outline" size="sm" onClick={() => setIsEditing(true)} className="gap-2">
                <Edit className="h-4 w-4" />
                Edit
              </Button>
            </>
          )}
        </div>
      </div>

      {isEditing ? (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">Edit Invoice</h2>
          </div>
          <InvoiceForm
            invoice={invoice}
            clients={clients}
            onSubmit={handleUpdate}
            isLoading={isLoading}
            variant="dipencil"
          />
          <div className="flex justify-end mt-6">
            <Button variant="ghost" onClick={() => setIsEditing(false)}>
              Cancel Edit
            </Button>
          </div>
        </Card>
      ) : (
        <div className="w-full overflow-x-auto mb-12 pb-4">
          <style
            dangerouslySetInnerHTML={{
              __html: `
            @media print {
              .no-print { display: none !important; }
              body { background: white !important; }
              main { padding: 0 !important; margin: 0 !important; }
              .fixed { position: static !important; }
            }
          `,
            }}
          />
          <InvoiceDisplay invoice={invoice} client={client} company={company} />
        </div>
      )}
    </div>
  );
}
