'use client';

import React from 'react';
import Link from 'next/link';
import { CreateAppWizard } from '@/components/mobile-apps/create-app-wizard';
import { ChevronRight } from 'lucide-react';

export default function NewMobileAppPage() {
  return (
    <div className="space-y-6 pb-10">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Link href="/dashboard/mobile-apps" className="hover:text-foreground transition-colors">
          Mobile Applications
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground font-medium">Add Application</span>
      </nav>

      <div>
        <h1 className="text-3xl font-bold tracking-tight">Add Application</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Create a new mobile app and link it to services and billing.
        </p>
      </div>

      <CreateAppWizard />
    </div>
  );
}
