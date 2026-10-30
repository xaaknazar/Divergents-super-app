import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '@clerk/clerk-expo';
import { fetchReadingDetail, ReadingDetail } from '../data/reading';

/** Только чтение рейтинга: без нативного таймера и очереди подходов. Ответ чужого аккаунта отбрасывается. */
export function useReadingRanking(challengeId: string) {
  const { userId, getToken } = useAuth(), auth = useRef(getToken); auth.current = getToken;
  const context = `${userId}:${challengeId}`, current = useRef(context); current.current = context;
  const sequence = useRef(0);
  const [state, setState] = useState<{ key?: string; data?: ReadingDetail; error?: string }>({});
  const load = useCallback(async () => {
    const request = ++sequence.current;
    try {
      const data = await fetchReadingDetail(await auth.current(), challengeId);
      if (current.current === context && sequence.current === request) setState({ key: context, data });
    } catch (e) {
      if (current.current === context && sequence.current === request)
        setState(s => ({ key: context, data: s.key === context ? s.data : undefined, error: e instanceof Error ? e.message : 'Рейтинг недоступен' }));
    }
  }, [context, challengeId]);
  useFocusEffect(useCallback(() => { void load(); return () => { sequence.current++; }; }, [load]));
  return { ...(state.key === context ? state : {}), retry: load };
}
