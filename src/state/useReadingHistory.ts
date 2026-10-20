import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '@clerk/clerk-expo';
import * as Crypto from 'expo-crypto';
import { fetchReadingHistory, ReadingHistory } from '../data/readingBooks';
import { sendReadingCommand } from '../data/reading';
export function useReadingHistory(challengeId: string, readerId: string) {
  const { userId, getToken } = useAuth(), auth = useRef({ userId, getToken }); auth.current = { userId, getToken };
  const [state, setState] = useState<{ key?: string; data?: ReadingHistory; error?: string; busy: boolean }>({ busy: false });
  const context = `${userId}:${challengeId}:${readerId}`, current = useRef(context); current.current = context;
  const alive = useRef(false), inFlight = useRef(false);
  const loadSequence = useRef(0);
  const pending = useRef<{ context: string; bookKey: string; finished: boolean; operationId: string } | undefined>(undefined);
  const load = useCallback(async () => {
    const request = ++loadSequence.current;
    try {
      const token = await auth.current.getToken();
      if (!alive.current || current.current !== context) return;
      const data = await fetchReadingHistory(token, challengeId, readerId);
      if (alive.current && current.current === context && loadSequence.current === request) setState({ key: context, data, busy: false });
    } catch (e) { if (alive.current && current.current === context && loadSequence.current === request) setState(s => ({ data: s.key === context ? s.data : undefined, key: context, busy: false, error: e instanceof Error ? e.message : 'История недоступна' })); }
  }, [context, challengeId, readerId]);
  useFocusEffect(useCallback(() => { alive.current = true; void load(); return () => { alive.current = false; loadSequence.current++; }; }, [load]));
  return { ...(state.key === context ? state : { busy: false }), retry: load,
    markBook: async (bookKey: string, finished: boolean) => {
      if (inFlight.current || readerId !== userId) return;
      inFlight.current = true; setState(s => ({ ...s, busy: true, error: undefined }));
      const previous = pending.current;
      const operation = previous?.context === context && previous.bookKey === bookKey && previous.finished === finished ? previous
        : { context, bookKey, finished, operationId: Crypto.randomUUID() };
      pending.current = operation;
      try {
        const token = await auth.current.getToken();
        if (!alive.current || current.current !== context) return;
        await sendReadingCommand(token, { action: 'bookStatus', challengeId, bookKey, finished, operationId: operation.operationId });
        if (current.current === context) { pending.current = undefined; await load(); }
      } catch (e) { if (alive.current && current.current === context) setState(s => ({ ...s, error: e instanceof Error ? e.message : 'Сервер не подтвердил изменение' })); }
      finally { inFlight.current = false; if (alive.current && current.current === context) setState(s => ({ ...s, busy: false })); }
    },
  };
}
