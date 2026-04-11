'use client';

import React from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { useInvoiceData } from '@/context/InvoiceContext';
import { WebsiteForm } from '@/components/websites/website-form';
import { WebsiteDetailsSummary } from '@/components/websites/website-details-summary';
import { Card } from '@/components/ui/card';

export function WebsiteDetailContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const id = params.id as string;
  const isViewMode = searchParams.get('view') === '1';
  const { getWebsite } = useInvoiceData();
  const website = getWebsite(id);

  if (!website) {
    return (
      <div className="space-y-6">
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">Website not found</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          {isViewMode ? 'Website details' : 'Edit Website'}
        </h1>
        <p className="text-muted-foreground mt-1">
          {isViewMode ? 'Read-only overview — use Edit website to make changes.' : website.name}
        </p>
      </div>

      {isViewMode ? <WebsiteDetailsSummary website={website} /> : <WebsiteForm website={website} />}
    </div>
  );
}
