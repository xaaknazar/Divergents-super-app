import { useAuth } from '@clerk/clerk-expo';
import { useCallback, useEffect, useRef, useSyncExternalStore } from 'react';
import { fetchSpectatorStandings, SpectatorStandings } from '../data/challengeSpectator';
import { challengeReadCache, challengeReadKey } from './challengeReadCache';

export function useSpectatorStandings(challengeId: string) {
  const { userId, isLoaded, isSignedIn, getToken } = useAuth();
  const tokenRef = useRef(getToken); tokenRef.current = getToken;
  const key = challengeReadKey(userId ?? '', challengeId, 'spectator');
  const allowed = isLoaded && !!isSignedIn && !!userId;
  const snapshot = useCallback(() => challengeReadCache.get(key), [key]);
  const state = useSyncExternalStore(challengeReadCache.subscribe, snapshot, snapshot);
  const load = useCallback((force: boolean) => {
    if (!allowed) return Promise.resolve();
    return challengeReadCache.load(key, async signal => {
      const token = await tokenRef.current();
      if (signal.aborted) throw new Error('Read cancelled');
      return fetchSpectatorStandings(challengeId, token, signal);
    }, force, 20_000);
  }, [allowed, key, challengeId]);
  useEffect(() => { if (allowed) { void challengeReadCache.hydrate(); void load(false); } }, [allowed, load]);
  const reload = useCallback(() => load(true), [load]);
  return { data: allowed ? state.data as SpectatorStandings | null : null,
    loading: !isLoaded || allowed && (state.loading || !state.data && !state.error),
    error: isLoaded && (!allowed || state.error), reload };
}
