import { useEffect, useState } from 'react';
import { useAuth } from '@clerk/clerk-expo';
import { fetchMyRole } from '../data/api';

// Показ разделов задаётся в админ-панели сайта. По умолчанию включено всё:
// пока ответ не пришёл (или сервер старой версии), приложение выглядит как
// раньше, а не мигает пустыми вкладками.
export const ALL_FEATURES_ON: Record<string, boolean> = {
  books: true, map: true, ai: true, sport: true, trips: true, channels: true, career: true,
};

export function useRole() {
  const { isSignedIn, getToken } = useAuth();
  const [canCreate, setCanCreate] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [perms, setPerms] = useState<string[]>([]);
  const [features, setFeatures] = useState<Record<string, boolean>>(ALL_FEATURES_ON);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!isSignedIn) {
        setCanCreate(false); setIsAdmin(false); setEmail(null); setPerms([]);
        return;
      }
      // Retry on transient network failure so admin controls don't vanish on a blip.
      for (let attempt = 0; attempt < 3 && alive; attempt++) {
        try {
          const token = await getToken();
          const r = await fetchMyRole(token);
          if (alive) {
            setCanCreate(!!r.canCreate);
            setIsAdmin(!!r.isAdmin);
            setEmail(r.email ?? null);
            setPerms(Array.isArray(r.perms) ? r.perms : []);
            // Флаги приходят целиком; отсутствующий ответ не должен ничего гасить.
            if (r.features && typeof r.features === 'object') {
              setFeatures({ ...ALL_FEATURES_ON, ...r.features });
            }
          }
          return;
        } catch {
          if (attempt < 2) await new Promise((res) => setTimeout(res, 1500 * (attempt + 1)));
        }
      }
    })();
    return () => { alive = false; };
  }, [isSignedIn]);

  /** Есть ли у пользователя право на раздел (админ — на всё). */
  const has = (perm: string) => isAdmin || perms.includes(perm);
  /** Включён ли раздел в приложении. */
  const feature = (key: string) => features[key] !== false;

  return { canCreate, isAdmin, email, perms, features, has, feature };
}
