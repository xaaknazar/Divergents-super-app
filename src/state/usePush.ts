import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { useAuth } from '@clerk/clerk-expo';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { registerPush } from '../data/api';

const PROJECT_ID = (Constants.expoConfig as any)?.extra?.eas?.projectId
  || (Constants as any)?.easConfig?.projectId
  || '82fb2253-cb48-4275-853e-c39b13b41e80';

export function usePush() {
  const { isSignedIn, getToken } = useAuth();
  // Keep the latest getToken in a ref so the effect can depend only on
  // isSignedIn without re-subscribing each time Clerk hands back a new function.
  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;
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
}
