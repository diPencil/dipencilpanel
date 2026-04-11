'use client';

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { CreateWebsiteWizard } from '@/components/websites/create-website-wizard';

function NewWebsiteContent() {
  const searchParams = useSearchParams();
  const initialType = searchParams.get('type') || 'wordpress';
  const initialClientId = searchParams.get('clientId') || undefined;

  return (
    <div className="space-y-6 pb-10">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Link href="/dashboard/websites" className="hover:text-foreground transition-colors">
          All Websites
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground font-medium">Add Website</span>
      </nav>

      <div>
        <h1 className="text-3xl font-bold tracking-tight">Add Website</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Create a new hosted website, link it to infrastructure, and set up billing.
        </p>
      </div>

      <CreateWebsiteWizard initialType={initialType} initialClientId={initialClientId} />
    </div>
  );
}

export default function NewWebsitePage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <NewWebsiteContent />
    </Suspense>
  );
}
