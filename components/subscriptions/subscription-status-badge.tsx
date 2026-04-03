'use client';

import { Badge } from '@/components/ui/badge';
import type { Subscription } from '@/lib/types';
import { getSubscriptionDisplayStatus } from '@/lib/subscription-display-status';

export function SubscriptionStatusBadge({
  subscription,
  className,
}: {
  subscription: Pick<Subscription, 'status' | 'expiryDate'>;
  className?: string;
}) {
  const d = getSubscriptionDisplayStatus(subscription);
  const base = className ?? 'px-3 py-1';

  const inactiveExpiredPair = (
    <div className="flex items-center gap-1 flex-wrap">
      <Badge
        className={`bg-slate-500/10 text-slate-600 dark:text-slate-300 border-slate-500/30 ${base}`}
      >
        Inactive
      </Badge>
      <Badge className={`bg-red-500/10 text-red-500 border-red-500/20 ${base}`}>Expired</Badge>
    </div>
  );

  switch (d) {
    case 'active':
      return (
        <Badge className={`bg-green-500/10 text-green-500 border-green-500/20 ${base}`}>Active</Badge>
      );
    case 'inactive':
    case 'expired':
      return inactiveExpiredPair;
    case 'suspended':
      return (
        <Badge className={`bg-yellow-500/10 text-yellow-500 border-yellow-500/20 ${base}`}>
          Suspended
        </Badge>
      );
    case 'cancelled':
      return (
        <Badge className={`bg-slate-500/10 text-slate-500 border-slate-500/20 ${base}`}>
          Cancelled
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className={base}>
          {d}
        </Badge>
      );
  }
}
