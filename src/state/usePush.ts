import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { useAuth } from '@clerk/clerk-expo';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { registerPush } from '../data/api';
import { navigationRef } from '../navigation/ref';

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
  const target = data.target || (data.tab && data.screen ? data : null);
  const nav = navigationRef as any;
  whenReady(() => {
    try {
      if (target?.tab && target?.screen) {
        nav.navigate('Tabs', {
          screen: target.tab,
          params: { screen: target.screen, params: target.params },
        });
      } else {
        // No specific target → open the notifications list.
        nav.navigate('Notifications');
      }
    } catch { /* navigator not in this state (e.g. gated) — ignore */ }
  });
}

export function usePush() {
  const { isSignedIn, getToken } = useAuth();
  // Keep the latest getToken / auth state in refs so the effect can depend only
  // on isSignedIn without re-subscribing each time Clerk hands back a new fn.
  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;
  const signedInRef = useRef(!!isSignedIn);
  signedInRef.current = !!isSignedIn;

  // Register the device token with the backend.
  useEffect(() => {
    let alive = true;
    (async () => {
      if (!isSignedIn) return;
      try {
        let { status } = await Notifications.getPermissionsAsync();
        if (status !== 'granted') { const r = await Notifications.requestPermissionsAsync(); status = r.status; }
        if (status !== 'granted') return;
        const tok = await Notifications.getExpoPushTokenAsync({ projectId: PROJECT_ID });
        const authToken = await getTokenRef.current();
        if (alive && tok?.data) await registerPush(authToken, tok.data, Platform.OS);
      } catch {}
    })();
    return () => { alive = false; };
  }, [isSignedIn]);

  // Handle taps: cold-start (app launched by a tap) + while running.
  useEffect(() => {
    Notifications.getLastNotificationResponseAsync()
      .then((resp) => routeFromResponse(resp, signedInRef.current))
      .catch(() => {});
    const sub = Notifications.addNotificationResponseReceivedListener((resp) =>
      routeFromResponse(resp, signedInRef.current),
    );
    return () => sub.remove();
  }, []);
}
