import type { Subscription } from '@/lib/types';

/** Single-letter prefix per subscription service type (e.g. Domain → D). */
const SERVICE_TYPE_PREFIX: Record<Subscription['serviceType'], string> = {
  website: 'W',
  domain: 'D',
  hosting: 'H',
  email: 'E',
  vps: 'V',
  mobile_app: 'M',
};

/** 8-digit numeric suffix (e.g. 17750697). */
function randomEightDigits(): string {
  const min = 10_000_000;
  const max = 99_999_999;
  return String(Math.floor(min + Math.random() * (max - min + 1)));
}

export function generateSubscriptionServiceId(serviceType: Subscription['serviceType']): string {
  return `${SERVICE_TYPE_PREFIX[serviceType]}-${randomEightDigits()}`;
}
