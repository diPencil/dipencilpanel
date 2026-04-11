import { Suspense } from 'react';
import { WebsiteDetailContent } from '@/components/websites/website-detail-content';
import { Card } from '@/components/ui/card';

function WebsiteDetailFallback() {
  return (
    <div className="space-y-6">
      <div className="h-9 w-56 animate-pulse rounded-md bg-muted" />
      <div className="h-4 w-40 animate-pulse rounded-md bg-muted" />
      <Card className="h-96 animate-pulse border bg-muted/20 p-6" />
    </div>
  );
}

export default function WebsiteDetailPage() {
  return (
    <Suspense fallback={<WebsiteDetailFallback />}>
      <WebsiteDetailContent />
    </Suspense>
  );
}
