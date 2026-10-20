import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '@clerk/clerk-expo';
import { fetchReadingCatalog, ReadingCatalogItem } from '../data/reading';

export function useReadingCatalog() {
  const { getToken, userId } = useAuth();
  const auth = useRef({ getToken, userId }); auth.current = { getToken, userId };
  const [state, setState] = useState<{ userId?: string | null; items: ReadingCatalogItem[]; error: boolean }>({ items: [], error: false });
  const load = useCallback(async (alive: () => boolean = () => true) => {
    try {
      if (!userId) return;
      const token = await auth.current.getToken();
      if (!alive() || auth.current.userId !== userId) return;
      const result = await fetchReadingCatalog(token);
      if (alive() && auth.current.userId === userId) setState({ userId, items: result.challenges, error: false });
    } catch { if (alive() && auth.current.userId === userId) setState(s => ({ userId, items: s.userId === userId ? s.items : [], error: true })); }
  }, [userId]);
  useFocusEffect(useCallback(() => { let alive = true; void load(() => alive); return () => { alive = false; }; }, [load]));
  return { items: state.userId === userId ? state.items : [], error: state.userId === userId && state.error, retry: () => { void load(); } };
}
