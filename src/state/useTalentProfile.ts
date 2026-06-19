// Loads the signed-in user's Talentslab profile (Gallup/MBTI/Gardner/reports).
// Falls back to a demo profile until the Talentslab mobile API is live.
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@clerk/clerk-expo';
import { fetchTalentProfile, MOCK_PROFILE, TalentProfile } from '../data/talentslab';

export function useTalentProfile() {
  const { isSignedIn, getToken } = useAuth();
  const [profile, setProfile] = useState<TalentProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [live, setLive] = useState(false);
  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;

  const run = useCallback(async () => {
    setLoading(true);
    try {
      const token = isSignedIn ? await getTokenRef.current() : null;
      const p = await fetchTalentProfile(token);
      setProfile(p); setLive(true);
    } catch {
      setProfile(MOCK_PROFILE); setLive(false); // demo until API is live
    } finally { setLoading(false); }
  }, [isSignedIn]);

  useEffect(() => { run(); }, [run]);

  return { profile, loading, live, reload: run };
}
