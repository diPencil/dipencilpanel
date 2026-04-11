'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useInvoiceData } from '@/context/InvoiceContext';
import { InvoiceForm } from '@/components/invoices/invoice-form';
import { useToast } from '@/hooks/use-toast';
import { ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function CreateDipencilInvoicePage() {
  const router = useRouter();
  const { clients, addInvoice } = useInvoiceData();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (data: Parameters<typeof addInvoice>[0]) => {
    setIsLoading(true);
    try {
      const created = addInvoice(data);
      if (created === null) return;
      toast({
        title: 'Success',
        description: 'Invoice created successfully',
      });
      router.push('/dashboard/billing/dipencil-invoices');
    } catch (_error) {
      toast({
        title: 'Error',
        description: 'Failed to create invoice',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="icon">
          <Link href="/dashboard/billing/dipencil-invoices">
            <ChevronLeft className="h-5 w-5" />
            <span className="sr-only">Back</span>
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Create Invoice</h1>
          <p className="text-muted-foreground">Create a new invoice for your clients</p>
        </div>
      </div>

      {clients.length === 0 ? (
        <div className="rounded-lg border border-border bg-card p-8 text-center">
          <p className="text-muted-foreground mb-4">
            No clients available. Please add a client first.
          </p>
          <Button asChild>
            <Link href="/dashboard/clients">Add Client</Link>
          </Button>
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-card p-6">
          <InvoiceForm
            clients={clients}
            onSubmit={handleSubmit}
            isLoading={isLoading}
            variant="dipencil"
          />
        </div>
      )}
    </div>
  );
}
