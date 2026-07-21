import { useEffect } from 'react';
import { Linking, Alert } from 'react-native';
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
      if (!code) return;
      if (!isSignedIn) { Alert.alert('Войдите', 'Чтобы перейти по приглашению в канал, войдите в аккаунт.'); return; }
      try {
        const token = await getToken();
        const channelId = await joinByInvite(token, code);
        if (channelId && navigationRef.isReady()) {
          (navigationRef as any).navigate('Tabs', { screen: 'CommunityTab', params: { screen: 'ServerChannel', params: { channelId } } });
        } else if (!channelId) {
          Alert.alert('Приглашение недействительно', 'Ссылка устарела или канал недоступен.');
        }
      } catch { Alert.alert('Не удалось открыть приглашение', 'Проверьте подключение и попробуйте снова.'); }
    };
    Linking.getInitialURL().then(handle);
    const sub = Linking.addEventListener('url', (e) => handle(e.url));
    return () => sub.remove();
  }, [isSignedIn]);
}
