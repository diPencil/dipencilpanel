'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useInvoiceData } from '@/context/InvoiceContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { ChevronLeft } from 'lucide-react';
import { getBusinessEmailById, type BusinessEmailRecord } from '@/app/actions/business-emails';
import { BusinessEmailEditor } from '@/components/business-emails/business-email-editor';

export default function EditBusinessEmailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { company } = useInvoiceData();
  const [email, setEmail] = useState<BusinessEmailRecord | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const id = params.id;
    if (!id || !company.id) return;
    setLoading(true);
    getBusinessEmailById(id, company.id).then((res) => {
      if (res.success && res.data) {
        setEmail(res.data);
      } else {
        toast.error('Email not found');
        setEmail(null);
      }
      setLoading(false);
    });
  }, [params.id, company.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh] text-muted-foreground animate-pulse">
        Loading…
      </div>
    );
  }

  if (!email) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <p className="text-muted-foreground">Email not found.</p>
        <Button variant="outline" asChild>
          <Link href="/dashboard/billing/business-emails" className="gap-2">
            <ChevronLeft className="h-4 w-4" /> Back to Business Emails
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild className="gap-1.5 -ml-2">
            <Link href={`/dashboard/billing/business-emails/${email.id}`}>
              <ChevronLeft className="h-4 w-4" /> Back to email
            </Link>
          </Button>
        </div>
      </div>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">Edit business email</h1>
        <p className="text-sm text-muted-foreground mt-1">Update subject, body, client, or type — then save as draft.</p>
      </div>

      <Card className="p-6 border-border/50 shadow-sm">
        <BusinessEmailEditor
          email={email}
          companyId={company.id}
          syncKey={email.id}
          onSaved={(saved) => {
            setEmail(saved);
            router.push(`/dashboard/billing/business-emails/${saved.id}`);
          }}
          onCancel={() => router.push(`/dashboard/billing/business-emails/${email.id}`)}
        />
      </Card>
    </div>
  );
}
