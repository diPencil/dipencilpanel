import { redirect } from 'next/navigation';

/** Legacy URL; full storage overview lives under Resources. */
export default function DashboardStorageRedirect() {
  redirect('/dashboard/resources/storage');
}
