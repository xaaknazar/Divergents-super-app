import { useEffect } from 'react';
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
  useEffect(() => {
    let alive = true;
    (async () => {
      if (!isSignedIn) return;
      try {
        let { status } = await Notifications.getPermissionsAsync();
        if (status !== 'granted') { const r = await Notifications.requestPermissionsAsync(); status = r.status; }
        if (status !== 'granted') return;
        const tok = await Notifications.getExpoPushTokenAsync({ projectId: PROJECT_ID });
        const authToken = await getToken();
        if (alive && tok?.data) await registerPush(authToken, tok.data, Platform.OS);
      } catch {}
    })();
    return () => { alive = false; };
  }, [isSignedIn]);
}
