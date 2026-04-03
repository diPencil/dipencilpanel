'use client';

import React from 'react';
import Link from 'next/link';
import { useInvoiceData } from '@/context/InvoiceContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import { formatDate } from '@/lib/formatting';

export function LatestDomainsWidget() {
  const { getRecentDomains } = useInvoiceData();
  const recentDomains = getRecentDomains(3) || [];

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Latest Domains</h3>
        <Link href="/dashboard/domains">
          <Button variant="ghost" size="sm" className="gap-2">
            All domains
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>

      <div className="space-y-3">
        {recentDomains.length === 0 ? (
          <p className="text-sm text-muted-foreground">No domains yet</p>
        ) : (
          recentDomains.map((domain) => {
            const daysUntilExpiry = Math.ceil(
              (new Date(domain.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
            );

            return (
              <Link
                key={domain.id}
                href={`/dashboard/domains/${domain.id}`}
                className="flex items-center justify-between p-3 rounded-lg hover:bg-muted transition-colors group"
              >
                <div className="flex-1">
                  <p className="font-medium text-sm">{domain.name}{domain.tld}</p>
                  <p className="text-xs text-muted-foreground">
                    Expires in {daysUntilExpiry} days
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
              </Link>
            );
          })
        )}
      </div>
    </Card>
  );
}
