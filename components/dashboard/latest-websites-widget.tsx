'use client';

import React from 'react';
import Link from 'next/link';
import { useInvoiceData } from '@/context/InvoiceContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight, CheckCircle, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export function LatestWebsitesWidget() {
  const { getRecentWebsites } = useInvoiceData();
  const recentWebsites = typeof getRecentWebsites === 'function' ? getRecentWebsites(3) : [];

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Latest Websites</h3>
        <Link href="/dashboard/websites">
          <Button variant="ghost" size="sm" className="gap-2">
            More websites
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>

      <div className="space-y-3">
        {recentWebsites.length === 0 ? (
          <p className="text-sm text-muted-foreground">No websites yet</p>
        ) : (
          recentWebsites.map((website) => (
            <Link
              key={website.id}
              href={`/dashboard/websites/${website.id}`}
              className="flex items-center justify-between p-3 rounded-lg hover:bg-muted transition-colors group"
            >
              <div className="flex-1 flex items-center gap-3">
                <div className={cn(
                  'flex items-center justify-center h-8 w-8 rounded-full text-xs font-semibold text-white',
                  website.status === 'active' ? 'bg-green-600' : 'bg-red-600'
                )}>
                  {website.type.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">{website.name}</p>
                  <p className="text-xs text-muted-foreground">{website.domain}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {website.status === 'active' ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-red-600" />
                )}
                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
              </div>
            </Link>
          ))
        )}
      </div>
    </Card>
  );
}
