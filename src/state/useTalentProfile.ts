// Loads the signed-in user's Talentslab profile (Gallup/MBTI/Gardner/reports).
// IMPORTANT: never substitutes the demo MOCK_PROFILE for real data. `profile`
// is the actual backend result (empty/found:false when there is no candidate),
// and `live` is true ONLY when the backend matched a real candidate record.
// Screens that want to preview the feature use MOCK_PROFILE explicitly and mark
// it clearly as demo (see TalentProfileScreen).
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth, useUser } from '@clerk/clerk-expo';
import { fetchTalentProfile, getTalentslabToken, TalentProfile } from '../data/talentslab';

export function useTalentProfile() {
  const { isSignedIn, getToken } = useAuth();
  const { user } = useUser();
  const [profile, setProfile] = useState<TalentProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;

  const email = user?.primaryEmailAddress?.emailAddress ?? null;

  const run = useCallback(async () => {
    setLoading(true);
    try {
      const token = isSignedIn ? await getTalentslabToken(getTokenRef.current) : null;
      setProfile(await fetchTalentProfile(token, email));
    } catch {
      setProfile(null); // unreachable — no data (screens may show a marked demo)
    } finally {
      setLoading(false);
    }
  }, [isSignedIn, email]);

  useEffect(() => { run(); }, [run]);

  // "Live" only when the backend actually resolved a candidate record. A
  // found:false / null profile is NOT live and must not be shown as the user's
  // real data.
  const live = profile?.found === true;

  return { profile, loading, live, reload: run };
}
