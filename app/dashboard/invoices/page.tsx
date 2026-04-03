import { redirect } from 'next/navigation';

export default function InvoicesPageRedirect() {
  redirect('/dashboard/billing/invoices');
}
