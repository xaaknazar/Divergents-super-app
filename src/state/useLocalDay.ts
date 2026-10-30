import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { dayKey } from '../data/fitness';

/** Обновляет календарную статистику в полночь и после возврата в приложение. */
export function useLocalDay() {
  const [key, setKey] = useState(() => dayKey(new Date()));
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const refresh = () => {
      clearTimeout(timer);
      const now = new Date();
      setKey(dayKey(now));
      const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      timer = setTimeout(refresh, midnight.getTime() - now.getTime() + 100);
    };
    refresh();
    const sub = AppState.addEventListener('change', state => { if (state === 'active') refresh(); });
    return () => { clearTimeout(timer); sub.remove(); };
  }, []);
  return key;
}
