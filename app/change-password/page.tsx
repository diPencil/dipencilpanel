import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/auth';
import ChangePasswordForm from './change-password-form';

export const dynamic = 'force-dynamic';

/**
 * R-10: forced password rotation screen.
 *
 * Deliberately outside `/dashboard` so a flagged session never renders the
 * application shell. Uses `getSession()` directly (database truth) rather than
 * `requireSession()`, which would redirect back here in a loop.
 */
export default async function ChangePasswordPage() {
  const session = await getSession();
  if (!session) {
    redirect('/login');
  }
  if (!session.mustChangePassword) {
    redirect('/dashboard');
  }
  return <ChangePasswordForm username={session.username} />;
}
