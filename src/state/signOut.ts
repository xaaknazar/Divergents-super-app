// One account-exit boundary for every screen. Push detachment must happen while
// the Clerk token is valid; user data is then wiped before the session changes.
import { clearAllAppData } from './reset';
import { unregisterPushToken } from './usePush';

type GetToken = () => Promise<string | null>;
type AsyncAction = () => Promise<unknown>;

interface SignOutOptions {
  getToken: GetToken;
  signOut: AsyncAction;
}

export async function signOutAndClear({ getToken, signOut }: SignOutOptions): Promise<void> {
  // Push cleanup is best-effort: a notification-service outage must not trap the
  // user in their account. Local privacy cleanup and Clerk sign-out still run.
  await unregisterPushToken(getToken).catch(() => {});
  await clearAllAppData();
  await signOut();
}

interface DeleteAccountOptions extends SignOutOptions {
  deleteRemoteAccount: AsyncAction;
}

export async function deleteAccountAndClear({
  getToken,
  signOut,
  deleteRemoteAccount,
}: DeleteAccountOptions): Promise<void> {
  // Detach the device while its Bearer token is still valid. If Clerk deletion
  // fails we intentionally keep local state/session so the user can retry.
  await unregisterPushToken(getToken).catch(() => {});
  await deleteRemoteAccount();

  await clearAllAppData();
  // Clerk normally invalidates the active session after user.delete(). Treat an
  // already-gone session as success; the destructive remote action has completed.
  await signOut().catch(() => {});
}
