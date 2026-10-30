import { useCallback, useRef, useSyncExternalStore } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '@clerk/clerk-expo';
import { fetchReadingCatalog, ReadingApiError, ReadingCatalogSchema } from '../data/reading';
import { ReadAccessError } from '../data/readAccessError';
import { readingCatalogCache, readingCatalogKey } from './readingCatalogCache';

export function useReadingCatalog() {
  const { getToken, userId } = useAuth();
  const auth = useRef({ getToken, userId }); auth.current = { getToken, userId };
  const key = readingCatalogKey(userId ?? '');
  const snapshot = useCallback(() => readingCatalogCache.get(key), [key]);
  const state = useSyncExternalStore(readingCatalogCache.subscribe, snapshot, snapshot);
  const load = useCallback(() => {
    if (!userId || auth.current.userId !== userId) return Promise.resolve();
    return readingCatalogCache.load(key, async signal => {
      const token = await auth.current.getToken();
      if (signal.aborted || auth.current.userId !== userId) throw new Error('Reading catalog request cancelled');
      // An offline Clerk session can have no fresh token. This is not an
      // explicit server denial and must not erase the saved doorway.
      if (!token) throw new Error('Reading catalog token unavailable');
      try {
        const result = await fetchReadingCatalog(token);
        if (signal.aborted || auth.current.userId !== userId) throw new Error('Reading catalog request cancelled');
        return result;
      } catch (error) {
        if (signal.aborted || auth.current.userId !== userId) throw new Error('Reading catalog request cancelled');
        if (error instanceof ReadingApiError && [401, 403, 404].includes(error.status)) throw new ReadAccessError(error.status);
        throw error;
      }
    }, true);
  }, [key, userId]);
  useFocusEffect(useCallback(() => {
    if (!userId) return;
    // Disk and network race independently: neither token refresh nor a slow
    // catalog request is allowed to hold the saved cards off the screen.
    void readingCatalogCache.hydrate();
    void load();
  }, [load, userId]));
  const parsed = ReadingCatalogSchema.safeParse(state.data);
  return { items: userId && parsed.success && parsed.data.enabled ? parsed.data.challenges : [],
    error: !!userId && (state.error || !!state.data && !parsed.success), retry: load };
}
