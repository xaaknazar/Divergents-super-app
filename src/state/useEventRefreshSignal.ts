import { useCallback, useState } from 'react';
import { AppState } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import * as Notifications from 'expo-notifications';

/** Reload an open event after returning to the app or receiving a decision. */
export function useEventRefreshSignal(): number {
  const [revision, setRevision] = useState(0);
  useFocusEffect(useCallback(() => {
    const refresh = () => setRevision(n => n + 1);
    const foreground = AppState.addEventListener('change', state => { if (state === 'active') refresh(); });
    const push = Notifications.addNotificationReceivedListener(refresh);
    return () => { foreground.remove(); push.remove(); };
  }, []));
  return revision;
}
