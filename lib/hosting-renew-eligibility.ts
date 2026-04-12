import type { Hosting } from '@/lib/types';

const MS_WEEK = 7 * 24 * 60 * 60 * 1000;

/** Same idea as subscriptions list: renewal when inactive, expired, or expiring within 7 days. */
export function isHostingRenewEligible(h: Hosting): boolean {
  if (h.status === 'suspended' || h.status === 'expired') return true;
  const exp = new Date(h.expiryDate).getTime();
  const now = Date.now();
  if (exp < now) return true;
  if (exp >= now && exp < now + MS_WEEK) return true;
  return false;
}
