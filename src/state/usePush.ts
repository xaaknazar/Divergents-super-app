import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { useAuth } from '@clerk/clerk-expo';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { registerPush, unregisterPush } from '../data/api';
import { navigationRef, normalizeTabTarget } from '../navigation/ref';
import { loadJSON } from './persist';

const PROJECT_ID = (Constants.expoConfig as any)?.extra?.eas?.projectId
  || (Constants as any)?.easConfig?.projectId
  || '82fb2253-cb48-4275-853e-c39b13b41e80';

// Show pushes while the app is in the foreground (banner + list + sound).
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// Wait until the navigation container is mounted, then run `fn`. A tap that
// cold-starts the app fires before navigation is ready, so we retry briefly.
function whenReady(fn: () => void, tries = 0) {
  if (navigationRef.isReady()) { fn(); return; }
  if (tries < 24) setTimeout(() => whenReady(fn, tries + 1), 250);
}

// Route a tapped notification to its target content. The push payload's `data`
// carries the same `{ tab, screen, params }` shape as in-app notifications.
function routeFromResponse(response: Notifications.NotificationResponse | null, signedIn: boolean) {
  if (!response || !signedIn) return;
  const data: any = response.notification.request.content.data || {};
  const target = data.target || (data.tab ? data : null);
  const nav = navigationRef as any;
  whenReady(() => {
    try {
      // A tab without a screen is still a destination — open the tab.
      if (target?.tab) {
        nav.navigate('Tabs', normalizeTabTarget(target.tab, target.screen ?? null, target.params));
      } else {
        // No specific target → open the notifications list.
        nav.navigate('Notifications');
      }
    } catch { /* navigator not in this state (e.g. gated) — ignore */ }
  });
}

// Call on sign-out (BEFORE Clerk signOut, while the auth token is still valid)
// so this device's token is detached from the account. Best-effort.
export async function unregisterPushToken(getToken: () => Promise<string | null>) {
  try {
    const tok = await Notifications.getExpoPushTokenAsync({ projectId: PROJECT_ID });
    const authToken = await getToken();
    if (tok?.data) await unregisterPush(authToken, tok.data);
  } catch {}
}

/**
 * @param enabled  Gate for the permission prompt + token registration. Pass
 *   `true` only once the user is inside the main app (past onboarding, auth and
 *   the nickname gate) — asking for push permission on a gate screen is both
 *   confusing and burns the one-shot iOS prompt. Tap routing is unaffected.
 */
export function usePush(enabled = true) {
  const { isSignedIn, getToken, isLoaded } = useAuth();
  // Keep the latest getToken / auth state in refs so the effect can depend only
  // on isSignedIn without re-subscribing each time Clerk hands back a new fn.
  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;
  const signedInRef = useRef(!!isSignedIn);
  signedInRef.current = !!isSignedIn;

  // Register the device token with the backend (only when enabled — see above).
  const register = !!isSignedIn && enabled;
  useEffect(() => {
    let alive = true;
    (async () => {
      if (!register) return;
      try {
        if (Platform.OS === 'android') {
          await Notifications.setNotificationChannelAsync('challenge-reminders', {
            name: 'Напоминания челленджа',
            importance: Notifications.AndroidImportance.HIGH,
            sound: 'default',
          });
        }
        let { status } = await Notifications.getPermissionsAsync();
        if (status !== 'granted') { const r = await Notifications.requestPermissionsAsync(); status = r.status; }
        if (status !== 'granted') return;
        const tok = await Notifications.getExpoPushTokenAsync({ projectId: PROJECT_ID });
        const authToken = await getTokenRef.current();
        // Attach the user's saved city so trip/sport pushes can target "по месту".
        const loc = await loadJSON<{ country?: string; city?: string } | null>('dvg.placeLoc', null);
        if (alive && tok?.data) await registerPush(authToken, tok.data, Platform.OS, loc?.city ?? null, loc?.country ?? null);
      } catch {}
    })();
    return () => { alive = false; };
  }, [register]);

  // Handle taps: cold-start (app launched by a tap) + while running.
  //
  // Wait for Clerk to finish restoring the session (isLoaded), not just for
  // navigation. On a cold start this effect used to run while isSignedIn was
  // still false, so routeFromResponse bailed out and the tap that LAUNCHED the
  // app was silently dropped. isLoaded flips false→true once, so the
  // last-response read still happens exactly once.
  useEffect(() => {
    if (!isLoaded) return;
    Notifications.getLastNotificationResponseAsync()
      .then((resp) => routeFromResponse(resp, signedInRef.current))
      .catch(() => {});
    const sub = Notifications.addNotificationResponseReceivedListener((resp) =>
      routeFromResponse(resp, signedInRef.current),
    );
    return () => sub.remove();
  }, [isLoaded]);
}
