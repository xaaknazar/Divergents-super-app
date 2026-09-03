import { useEffect, useState } from 'react';
import { useAuth } from '@clerk/clerk-expo';
import { fetchMyRole, normalizeGift, GiftInfo, NO_GIFT } from '../data/api';

// Показ разделов задаётся в админ-панели сайта. Разделы по умолчанию включены:
// пока ответ не пришёл (или сервер старой версии), приложение выглядит как
// раньше, а не мигает пустыми вкладками.
//
// `purchases` — исключение и по умолчанию ВЫКЛЮЧЕН: оплата курса мимо встроенных
// покупок Apple — повод для отказа в App Store. Молчание сервера (старая версия,
// неудачный запрос, гость) должно означать «покупок нет», а не наоборот.
export const DEFAULT_FEATURES: Record<string, boolean> = {
  books: true, map: true, ai: true, sport: true, trips: true, channels: true, career: true,
  purchases: false,
};

export function useRole() {
  const { isSignedIn, getToken } = useAuth();
  const [canCreate, setCanCreate] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [perms, setPerms] = useState<string[]>([]);
  const [features, setFeatures] = useState<Record<string, boolean>>(DEFAULT_FEATURES);
  // Стартовая акция. По умолчанию выключена: пока ответа нет (или сервер старой
  // версии), ничего не обещаем — предложение лучше не показать, чем показать зря.
  const [gift, setGift] = useState<GiftInfo>(NO_GIFT);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!isSignedIn) {
        setCanCreate(false); setIsAdmin(false); setEmail(null); setPerms([]); setGift(NO_GIFT);
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
              setFeatures({ ...DEFAULT_FEATURES, ...r.features });
            }
            setGift(normalizeGift(r.gift));
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

  return { canCreate, isAdmin, email, perms, features, gift, has, feature };
}
