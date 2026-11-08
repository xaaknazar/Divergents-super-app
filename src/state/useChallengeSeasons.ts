import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@clerk/clerk-expo';
import { ChallengeSeason, fetchChallengeSeasons, fetchSeasonChampion } from '../data/challengeSeasons';
export const SEASONS_DEADLINE_MS = 15_000;

export function useChallengeSeasons(initialId: string) {
  const { userId, getToken } = useAuth();
  const tokenRef = useRef(getToken);
  tokenRef.current = getToken;
  const [selected, setSelected] = useState(initialId);
  const [open, setOpen] = useState(false);
  const [seasons, setSeasons] = useState<ChallengeSeason[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => { setSelected(initialId); setSeasons([]); setOpen(false); setLoading(false); setError(false); }, [initialId, userId]);
  useEffect(() => {
    if (!open || !userId) { setLoading(false); return; }
    const controller = new AbortController();
    setLoading(true); setError(false);
    // Covers authentication as well as fetch: neither may leave the sheet spinning forever.
    const deadline = setTimeout(() => {
      controller.abort(); setLoading(false); setError(true);
    }, SEASONS_DEADLINE_MS);
    void (async () => {
      try {
        const token = await tokenRef.current();
        if (controller.signal.aborted) return;
        const data = await fetchChallengeSeasons(token, controller.signal);
        if (controller.signal.aborted) return;
        setSeasons(data);
        // Separate bounded reads: selecting a season never waits for its champion.
        // A failed ranking keeps the catalog usable and offers the existing retry.
        for (const season of data.filter(item => item.finished)) {
          void fetchSeasonChampion(season, token, controller.signal).then(champion => {
            if (!controller.signal.aborted) setSeasons(items => items.map(item => item.id === season.id ? { ...item, champion } : item));
          }).catch(() => { if (!controller.signal.aborted) setError(true); });
        }
      }
      catch { if (!controller.signal.aborted) setError(true); }
      finally { clearTimeout(deadline); if (!controller.signal.aborted) setLoading(false); }
    })();
    return () => { clearTimeout(deadline); controller.abort(); };
  }, [open, userId, initialId, attempt]);
  const choose = useCallback((id: string) => { setSelected(id); setOpen(false); }, []);
  return { selected, choose, open, setOpen, seasons, loading, error, retry: () => setAttempt(n => n + 1) };
}
