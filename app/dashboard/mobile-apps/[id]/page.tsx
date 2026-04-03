'use client';

import React from 'react';
import { use } from 'react';
import Link from 'next/link';
import { useInvoiceData } from '@/context/InvoiceContext';
import { AppDetail } from '@/components/mobile-apps/app-detail';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronRight, Smartphone } from 'lucide-react';

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-10 w-64" />
      <div className="grid grid-cols-2 gap-4">
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
      </div>
      <Skeleton className="h-64" />
    </div>
  );
}

export default function MobileAppDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { mobileApps, isLoading } = useInvoiceData();

  if (isLoading) return <LoadingSkeleton />;

  const app = mobileApps.find((a) => a.id === id);

  if (!app) {
    return (
      <Card className="py-20 text-center border-dashed">
        <Smartphone className="h-12 w-12 text-muted-foreground/20 mx-auto mb-4" />
        <h2 className="text-xl font-bold mb-2">Application not found</h2>
        <p className="text-muted-foreground text-sm mb-6">
          This app may have been deleted or the link is incorrect.
        </p>
        <Button asChild>
          <Link href="/dashboard/mobile-apps">Back to Applications</Link>
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-2 pb-10">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm text-muted-foreground mb-4">
        <Link href="/dashboard/mobile-apps" className="hover:text-foreground transition-colors">
          Mobile Applications
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground font-medium truncate max-w-[200px]">{app.name}</span>
      </nav>

      <AppDetail app={app} />
    </div>
  );
}
