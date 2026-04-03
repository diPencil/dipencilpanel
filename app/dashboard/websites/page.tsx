'use client';

import React, { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useInvoiceData } from '@/context/InvoiceContext';
import { WebsitesList } from '@/components/websites/websites-list';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Monitor, Plus, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

function KPITile({ label, value, icon: Icon, color }: {
  label: string;
  value: number | string;
  icon: React.ElementType;
  color: string;
}) {
  return (
    <Card className="p-4 flex items-center gap-4">
      <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-2xl font-bold leading-none">{value}</p>
        <p className="text-xs text-muted-foreground mt-1">{label}</p>
      </div>
    </Card>
  );
}

function WebsitesPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const typeFilter = searchParams.get('type') || undefined;
  const { websites = [] } = useInvoiceData();

  const filteredWebsites = typeFilter 
    ? websites.filter(w => w.type === typeFilter || (typeFilter === 'php' && w.type === 'html')) 
    : websites;

  const total = filteredWebsites.length;
  const active = filteredWebsites.filter((w) => w.status === 'active').length;
  const inactive = filteredWebsites.filter((w) => w.status === 'inactive').length;
  const suspended = filteredWebsites.filter((w) => w.status === 'suspended').length;

  let pageTitle = "All Websites";
  let pageDescription = "Manage all your hosted websites, migrations, and storage in one place.";

  if (typeFilter === 'wordpress') {
    pageTitle = "WordPress Websites";
    pageDescription = "Manage your WordPress installations, configurations, and performance.";
  } else if (typeFilter === 'node') {
    pageTitle = "Node.js Websites";
    pageDescription = "Manage your Node.js server-side applications and environments.";
  } else if (typeFilter === 'php' || typeFilter === 'html') {
    pageTitle = "PHP & HTML Websites";
    pageDescription = "Manage your PHP applications and static HTML websites.";
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{pageTitle}</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {pageDescription}
          </p>
        </div>
        <Button
          onClick={() => router.push('/dashboard/websites/new')}
          className="w-full sm:w-auto shadow-lg shadow-primary/20"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Website
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPITile label="Total Websites" value={total} icon={Monitor} color="bg-primary/10 text-primary" />
        <KPITile label="Active" value={active} icon={CheckCircle} color="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300" />
        <KPITile label="Inactive" value={inactive} icon={XCircle} color="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300" />
        <KPITile label="Suspended" value={suspended} icon={AlertTriangle} color="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300" />
      </div>

      {/* Websites List */}
      <WebsitesList typeFilter={typeFilter} />
    </div>
  );
}

export default function WebsitesPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <WebsitesPageContent />
    </Suspense>
  );
}
