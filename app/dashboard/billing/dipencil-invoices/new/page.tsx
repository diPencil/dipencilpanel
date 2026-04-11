'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useInvoiceData } from '@/context/InvoiceContext';
import { InvoiceForm } from '@/components/invoices/invoice-form';
import { useToast } from '@/hooks/use-toast';
import { ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { getOrCreateDipencilInternalClient } from '@/app/actions/invoices';

export default function CreateDipencilInvoicePage() {
  const router = useRouter();
  const { clients, addInvoice, company } = useInvoiceData();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [internalClientId, setInternalClientId] = useState<string | null>(null);
  const [resolving, setResolving] = useState(true);

  useEffect(() => {
    const cid = company?.id;
    if (!cid || cid === 'default') {
      setResolving(false);
      return;
    }
    void getOrCreateDipencilInternalClient(cid).then((r) => {
      if (r.success) setInternalClientId(r.data.id);
      else toast({ title: 'Error', description: r.error, variant: 'destructive' });
      setResolving(false);
    });
  }, [company?.id, toast]);

  const handleSubmit = async (data: Parameters<typeof addInvoice>[0]) => {
    setIsLoading(true);
    try {
      const created = addInvoice(data);
      if (created === null) return;
      toast({
        title: 'Success',
        description: 'diPencil invoice created',
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
          <h1 className="text-3xl font-bold">Create diPencil Invoice</h1>
          <p className="text-muted-foreground mt-1">
            Issued by Pencil for E-Marketing Ltd. — included in your main invoice totals
          </p>
        </div>
      </div>

      {resolving ? (
        <div className="rounded-lg border border-border bg-card p-8 text-center text-muted-foreground text-sm">
          Preparing workspace…
        </div>
      ) : !internalClientId ? (
        <div className="rounded-lg border border-border bg-card p-8 text-center">
          <p className="text-muted-foreground mb-4">Could not prepare diPencil invoicing. Check your company context.</p>
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-card p-6">
          <InvoiceForm
            clients={clients}
            onSubmit={handleSubmit}
            isLoading={isLoading}
            variant="dipencil"
            dipencilInternalClientId={internalClientId}
          />
        </div>
      )}
    </div>
  );
}
