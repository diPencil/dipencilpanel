import type { Subscription } from '@/lib/types';

export type SubscriptionDisplayStatus =
  | 'active'
  | 'inactive'
  | 'expired'
  | 'suspended'
  | 'cancelled';

/**
 * UI status: if DB says active but end date is in the past, show Inactive (not Active).
 */
export function getSubscriptionDisplayStatus(
  sub: Pick<Subscription, 'status' | 'expiryDate'>,
): SubscriptionDisplayStatus {
  if (sub.status === 'cancelled') return 'cancelled';
  if (sub.status === 'suspended') return 'suspended';
  if (sub.status === 'expired') return 'expired';

  const end = new Date(sub.expiryDate);
  if (!Number.isNaN(end.getTime())) {
    const now = new Date();
    const endUtc = Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate());
    const todayUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
    if (endUtc < todayUtc) return 'inactive';
  }

  return sub.status === 'active' ? 'active' : 'inactive';
}

/** KPIs and summaries: matches what the Subscriptions table shows as “Active” (not past end date, etc.). */
export function isSubscriptionActiveForKpis(
  sub: Pick<Subscription, 'status' | 'expiryDate'>,
): boolean {
  return getSubscriptionDisplayStatus(sub) === 'active';
}
