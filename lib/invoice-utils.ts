import { Invoice, InvoiceItem } from './types';

/**
 * Generate a unique invoice number in format INV-YYYYNNNN
 */
export function generateInvoiceNumber(existingInvoices: Invoice[]): string {
  const currentYear = new Date().getFullYear();
  const existingNumbers = existingInvoices.map((inv) => inv.number);
  
  let randomPart: string = '';
  let fullNumber: string = '';
  let isUnique = false;

  // Try to generate a unique random number
  let attempts = 0;
  while (!isUnique && attempts < 100) {
    // 4-digit random number (making it 8 digits total with year)
    randomPart = Math.floor(1000 + Math.random() * 9000).toString();
    fullNumber = `INV-${currentYear}${randomPart}`;
    isUnique = !existingNumbers.includes(fullNumber);
    attempts++;
  }

  return fullNumber || `INV-${currentYear}${Date.now().toString().slice(-4)}`;
}

/**
 * Calculate line item subtotal
 */
export function calculateLineItemSubtotal(item: InvoiceItem): number {
  const basePrice = item.quantity * item.price;
  const discountAmount = basePrice * (item.discount / 100);
  return basePrice - discountAmount;
}

/**
 * Calculate line item VAT amount
 */
export function calculateLineItemVAT(item: InvoiceItem): number {
  const subtotal = calculateLineItemSubtotal(item);
  return subtotal * (item.vat / 100);
}

/**
 * Calculate line item total (subtotal + vat)
 */
export function calculateLineItemTotal(item: InvoiceItem): number {
  return calculateLineItemSubtotal(item) + calculateLineItemVAT(item);
}

/**
 * Calculate invoice totals
 */
export function calculateInvoiceTotals(
  items: InvoiceItem[]
): {
  subtotal: number;
  discountAmount: number;
  vatAmount: number;
  total: number;
} {
  let subtotal = 0;
  let discountAmount = 0;
  let vatAmount = 0;

  items.forEach((item) => {
    const basePrice = item.quantity * item.price;
    const itemDiscount = basePrice * (item.discount / 100);
    const itemSubtotal = basePrice - itemDiscount;
    const itemVat = itemSubtotal * (item.vat / 100);

    subtotal += basePrice;
    discountAmount += itemDiscount;
    vatAmount += itemVat;
  });

  const total = subtotal - discountAmount + vatAmount;

  return {
    subtotal,
    discountAmount,
    vatAmount,
    total,
  };
}

/**
 * Format currency with proper formatting
 */
export function formatCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount);
}

/**
 * Format date to readable string
 */
export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(date));
}

/**
 * Format date for input fields (YYYY-MM-DD)
 */
export function formatDateForInput(date: string | Date): string {
  const d = new Date(date);
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${month}-${day}`;
}

/**
 * Get invoice status color
 */
export function getStatusColor(
  status: 'paid' | 'pending' | 'overdue'
): string {
  switch (status) {
    case 'paid':
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100';
    case 'pending':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100';
    case 'overdue':
      return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-100';
  }
}

/**
 * Check if invoice is overdue
 */
export function isInvoiceOverdue(dueDate: string): boolean {
  return new Date(dueDate) < new Date();
}

/**
 * Get days until due
 */
export function getDaysUntilDue(dueDate: string): number {
  const due = new Date(dueDate);
  const today = new Date();
  const diffTime = due.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}
