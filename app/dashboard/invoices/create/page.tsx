import { redirect } from 'next/navigation';

export default function LegacyCreateInvoiceRedirect() {
  redirect('/dashboard/billing/invoices/new');
}
