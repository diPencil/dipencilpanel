/**
 * Pure-function checks for the money invariants (CONSTITUTION.md, Article III).
 * No database access. Run: pnpm check:money
 */

import { calcTotals, computeEndDate } from '../lib/billing/billing-utils';
import {
  calculateLineItemSubtotal,
  calculateLineItemVAT,
  calculateLineItemTotal,
  calculateInvoiceTotals,
} from '../lib/billing/invoice-utils';
import { roundMoney, isMoney } from '../lib/billing/money';

let failures = 0;

function expect(name: string, actual: number, expected: number, epsilon = 0.005) {
  const ok = Math.abs(actual - expected) <= epsilon;
  if (!ok) failures++;
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}: ${actual} (expected ${expected})`);
}

function expectBool(name: string, actual: boolean, expected: boolean) {
  const ok = actual === expected;
  if (!ok) failures++;
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}: ${actual}`);
}

// 1. Rounding removes binary float noise.
expect('roundMoney(0.1 + 0.2)', roundMoney(0.1 + 0.2), 0.3);
expect('roundMoney(1.005)', roundMoney(1.005), 1.01);
expect('roundMoney(-1.005)', roundMoney(-1.005), -1.01);
expectBool('isMoney(19.99)', isMoney(19.99), true);
expectBool('isMoney(19.999)', isMoney(19.999), false);

// 2. Totals satisfy total = subtotal - discount + vat exactly.
const classic = [{ price: 19.99, quantity: 3, discount: 10, vat: 14 }];
const totals = calcTotals(classic);
expect('calcTotals subtotal', totals.subtotal, 59.97);
expect('calcTotals discountAmount', totals.discountAmount, 6.0);
expect('calcTotals vatAmount', totals.vatAmount, 7.56);
expect('calcTotals total', totals.total, 61.53);
expect(
  'calcTotals invariant',
  totals.total,
  totals.subtotal - totals.discountAmount + totals.vatAmount,
  0.0001,
);

// 3. Floating-point accumulation case.
const noisy = calcTotals([{ price: 0.1, quantity: 3, discount: 0, vat: 0 }]);
expect('calcTotals noisy subtotal', noisy.subtotal, 0.3);

// 4. Client-side helpers agree with the server-side calculation.
const invoiceItem = { id: 'i1', name: 'Item', price: 19.99, quantity: 3, discount: 10, vat: 14 } as never;
expect('line subtotal', calculateLineItemSubtotal(invoiceItem), 53.97);
expect('line vat', calculateLineItemVAT(invoiceItem), 7.56);
expect(
  'line total = subtotal + vat',
  calculateLineItemTotal(invoiceItem),
  calculateLineItemSubtotal(invoiceItem) + calculateLineItemVAT(invoiceItem),
  0.0001,
);

const invoiceTotals = calculateInvoiceTotals([invoiceItem]);
expect('invoice totals equal calcTotals', invoiceTotals.total, totals.total, 0.0001);
expect(
  'invoice totals invariant',
  invoiceTotals.total,
  invoiceTotals.subtotal - invoiceTotals.discountAmount + invoiceTotals.vatAmount,
  0.0001,
);

// 5. Subscription end date math.
const start = new Date('2026-01-31T00:00:00.000Z');
expectBool('monthly cycle rolls one month', computeEndDate(start, 'monthly').getUTCMonth() === 2, true);
expectBool('yearly cycle rolls one year', computeEndDate(start, 'yearly').getUTCFullYear() === 2027, true);

if (failures > 0) {
  console.error(`money logic: ${failures} failing check(s)`);
  process.exitCode = 1;
} else {
  console.log('money logic: all checks passed');
}
