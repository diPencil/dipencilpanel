import { fetchAccountActivity } from '@/lib/server/account-activity';
import AccountPreferencesClient from './account-preferences-client';

export const dynamic = 'force-dynamic';

export default async function AccountSettingsPage() {
  let activity = null;
  try {
    activity = await fetchAccountActivity();
  } catch (err) {
    console.error('[AccountSettingsPage] fetchAccountActivity', err);
  }
  return <AccountPreferencesClient activity={activity} />;
}
