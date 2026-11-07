import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@clerk/clerk-expo';
import { ChallengeSeason, fetchChallengeSeasons } from '../data/challengeSeasons';
export function useChallengeSeasons(initialId: string) {
  const { userId, getToken } = useAuth();
  const [selected, setSelected] = useState(initialId);
  const [open, setOpen] = useState(false);
  const [seasons, setSeasons] = useState<ChallengeSeason[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => { setSelected(initialId); setSeasons([]); setOpen(false); }, [initialId, userId]);
  useEffect(() => {
    if (!open || !userId) return;
    const controller = new AbortController();
    setLoading(true); setError(false);
    void (async () => {
      try { const data = await fetchChallengeSeasons(await getToken(), controller.signal); if (!controller.signal.aborted) setSeasons(data); }
      catch { if (!controller.signal.aborted) setError(true); }
      finally { if (!controller.signal.aborted) setLoading(false); }
    })();
    return () => controller.abort();
  }, [open, userId, getToken, attempt]);
  const choose = useCallback((id: string) => { setSelected(id); setOpen(false); }, []);
  return { selected, choose, open, setOpen, seasons, loading, error, retry: () => setAttempt(n => n + 1) };
}
