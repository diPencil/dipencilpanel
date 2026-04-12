import type { Hosting, Invoice } from '@/lib/types';

/**
 * True if this invoice is tied to this hosting account (not merely "any hosting" for the client).
 * Priority: same subscription → explicit hosting id in notes/items → renewal note with plan + account name.
 */
export function isInvoiceLinkedToHosting(inv: Invoice, h: Hosting): boolean {
  if (inv.clientId !== h.clientId) return false;

  if (h.subscriptionId && inv.subscriptionId === h.subscriptionId) {
    return true;
  }

  const idTag = `(${h.id})`;
  if (inv.notes?.includes(idTag)) return true;
  if (inv.items.some((it) => it.description.includes(idTag))) return true;

  if (
    inv.notes?.includes('Hosting renewal:') &&
    inv.notes.includes(h.name) &&
    inv.notes.includes(h.planName)
  ) {
    return true;
  }

  if (inv.notes?.startsWith(`Hosting service — ${h.name}`) && inv.notes.includes(idTag)) {
    return true;
  }

  return false;
}
