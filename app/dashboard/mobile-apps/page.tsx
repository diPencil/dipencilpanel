'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useInvoiceData } from '@/context/InvoiceContext';
import { AppsList } from '@/components/mobile-apps/apps-list';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Smartphone, Plus, Zap, Monitor, PauseCircle } from 'lucide-react';

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

export default function MobileAppsPage() {
  const router = useRouter();
  const { mobileApps } = useInvoiceData();

  const total = mobileApps.length;
  const live = mobileApps.filter((a) => a.status === 'live').length;
  const inDev = mobileApps.filter((a) => a.status === 'development').length;
  const suspended = mobileApps.filter((a) => a.status === 'suspended').length;

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Mobile Applications</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage all mobile apps, their infrastructure, and billing in one place.
          </p>
        </div>
        <Button
          onClick={() => router.push('/dashboard/mobile-apps/new')}
          className="w-full sm:w-auto shadow-lg shadow-primary/20"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Application
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPITile label="Total Apps" value={total} icon={Smartphone} color="bg-primary/10 text-primary" />
        <KPITile label="Live Apps" value={live} icon={Zap} color="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300" />
        <KPITile label="In Development" value={inDev} icon={Monitor} color="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300" />
        <KPITile label="Suspended" value={suspended} icon={PauseCircle} color="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300" />
      </div>

      {/* Apps List */}
      <AppsList />
    </div>
  );
}
