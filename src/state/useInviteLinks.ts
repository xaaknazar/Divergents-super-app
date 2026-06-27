import { useEffect } from 'react';
import { Linking } from 'react-native';
import { useAuth } from '@clerk/clerk-expo';
import { joinByInvite } from '../data/api';
import { navigationRef } from '../navigation/ref';

function parseCode(url: string | null): string | null {
  if (!url) return null;
  const m = url.match(/(?:invite\/|\/c\/)([A-Za-z0-9]+)/);
  return m ? m[1] : null;
}

export function useInviteLinks() {
  const { isSignedIn, getToken } = useAuth();
  useEffect(() => {
    const handle = async (url: string | null) => {
      const code = parseCode(url);
      if (!code || !isSignedIn) return;
      try {
        const token = await getToken();
        const channelId = await joinByInvite(token, code);
        if (channelId && navigationRef.isReady()) {
          (navigationRef as any).navigate('Tabs', { screen: 'CommunityTab', params: { screen: 'ServerChannel', params: { channelId } } });
        }
      } catch {}
    };
    Linking.getInitialURL().then(handle);
    const sub = Linking.addEventListener('url', (e) => handle(e.url));
    return () => sub.remove();
  }, [isSignedIn]);
}
