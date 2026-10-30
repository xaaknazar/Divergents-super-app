import { useAuth } from '@clerk/clerk-expo';
import { useCallback, useEffect, useRef, useSyncExternalStore } from 'react';
import { ChallengeResults, fetchChallengeResults } from '../data/community';
import { challengeReadCache, challengeReadKey } from './challengeReadCache';

/** Ignore late responses after changing challenge/account or leaving the screen. */
export function useChallengeResults(challengeId: string, view: 'summary' | 'days' = 'summary', enabled = true) {
  const { getToken, isLoaded, isSignedIn, userId } = useAuth();
  const tokenRef = useRef(getToken); tokenRef.current = getToken;
  const allowed = enabled && isLoaded && !!isSignedIn && !!userId && !!challengeId;
  const key = challengeReadKey(userId ?? '', challengeId, `results-${view}`);
  const getSnapshot = useCallback(() => challengeReadCache.get(key), [key]);
  const state = useSyncExternalStore(challengeReadCache.subscribe, getSnapshot, getSnapshot);
  const load = useCallback((force: boolean) => {
    if (!allowed) return Promise.resolve();
    return challengeReadCache.load(key, async signal => {
      const token = await tokenRef.current();
      if (signal.aborted) throw new Error('Read cancelled');
      const data = await fetchChallengeResults(challengeId, token, { view, signal });
      if (!data || data.challenge.id !== challengeId) throw new Error('Results unavailable');
      return data;
    }, force);
  }, [allowed, key, challengeId, view]);
  useEffect(() => {
    if (!allowed) return;
    void challengeReadCache.hydrate();
    void load(false);
  }, [allowed, load]);
  const reload = useCallback(() => load(true), [load]);
  const data = allowed && (state.data as ChallengeResults | null)?.challenge?.id === challengeId
    ? state.data as ChallengeResults : null;
  return { data, loading: enabled && (!isLoaded || allowed && (state.loading || !state.updatedAt && !state.error)),
    error: enabled && isLoaded && (!allowed || state.error), updatedAt: state.updatedAt, reload };
}
