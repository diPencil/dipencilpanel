/**
 * Money helpers shared by server and client code.
 *
 * Prisma stores money as `Float`, so every value that crosses a boundary must
 * be rounded explicitly (CONSTITUTION.md, Article III.1). This module has no
 * server-only imports so client components can use it too.
 */

/** Round a value to two decimals using a stable, symmetric rule. */
export function roundMoney(value: number): number {
  if (!Number.isFinite(value)) return 0;
  const sign = value < 0 ? -1 : 1;
  return (sign * Math.round((Math.abs(value) + Number.EPSILON) * 100)) / 100;
}

/** True when the value already has at most two decimal places. */
export function isMoney(value: number): boolean {
  return Number.isFinite(value) && Math.abs(value - roundMoney(value)) < 0.0001;
}

/** Format a money value with the given currency, always two decimals. */
export function formatMoney(value: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(roundMoney(value));
}
