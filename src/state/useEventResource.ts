import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '@clerk/clerk-expo';

/** Account/context-scoped data. Late responses never appear under another applicant. */
export function useEventResource<T>(key: string, load: (token: string | null) => Promise<T>) {
  const { userId, getToken } = useAuth();
  const loader = useRef(load); loader.current = load;
  const token = useRef(getToken); token.current = getToken;
  const generation = useRef(0);
  const identity = `${userId ?? ''}:${key}`;
  const [snapshot, setSnapshot] = useState<{ identity: string; data: T | null; error?: string; loading: boolean }>();
  const refresh = useCallback(async () => {
    const version = ++generation.current;
    if (!userId) return;
    setSnapshot(prev => ({ identity, data: prev?.identity === identity ? prev.data : null, loading: true }));
    try {
      const authToken = await token.current();
      if (version !== generation.current) return;
      const data = await loader.current(authToken);
      if (version === generation.current) setSnapshot({ identity, data, loading: false });
    } catch (e) { if (version === generation.current) setSnapshot({ identity, data: null, loading: false, error: e instanceof Error ? e.message : 'Не удалось загрузить данные.' }); }
  }, [identity, userId]);
  useFocusEffect(useCallback(() => { void refresh(); return () => { generation.current++; }; }, [refresh]));
  const current = snapshot?.identity === identity ? snapshot : undefined;
  return { data: current?.data ?? null, error: current?.error, loading: !!userId && (current?.loading ?? true), refresh, getToken: () => token.current(), signedIn: !!userId };
}
