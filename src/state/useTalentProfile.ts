// Loads the signed-in user's Talentslab profile (Gallup/MBTI/Gardner/reports).
// IMPORTANT: never substitutes the demo MOCK_PROFILE for real data. `profile`
// is the actual backend result (empty/found:false when there is no candidate),
// and `live` is true ONLY when the backend matched a real candidate record.
// Screens that want to preview the feature use MOCK_PROFILE explicitly and mark
// it clearly as demo (see TalentProfileScreen).
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth, useUser } from '@clerk/clerk-expo';
import {
  fetchTalentProfile,
  getTalentslabToken,
  profileFromSavedResume,
  ResumeAnswers,
  TalentProfile,
} from '../data/talentslab';
import { loadJSON, saveJSON } from './persist';

const CACHE_KEY = 'dvg.talentProfileCache.v1';
type ProfileSource = 'live' | 'cache' | 'local' | null;
interface CachedTalentProfile { identity: string; profile: TalentProfile; savedAt: number }

export function useTalentProfile() {
  const { isSignedIn, getToken } = useAuth();
  const { user } = useUser();
  const [profile, setProfile] = useState<TalentProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [unavailable, setUnavailable] = useState(false);
  const [source, setSource] = useState<ProfileSource>(null);
  const requestRef = useRef(0);
  const profileIdentityRef = useRef<string | null>(null);
  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;

  const email = user?.primaryEmailAddress?.emailAddress ?? null;
  const identity = user?.id ?? email ?? (isSignedIn ? 'signed-in' : 'signed-out');

  // `silent` refetches without flipping `loading` — used for focus/foreground
  // refreshes so the screen doesn't flash its full-screen spinner every time.
  const run = useCallback(async (silent?: boolean) => {
    const request = ++requestRef.current;
    if (!silent) setLoading(true);
    setUnavailable(false);
    if (profileIdentityRef.current !== identity) { setProfile(null); setSource(null); }

    const restoreSaved = async (): Promise<{ profile: TalentProfile | null; source: ProfileSource }> => {
      const [cached, answers] = await Promise.all([
        loadJSON<CachedTalentProfile | null>(CACHE_KEY, null),
        loadJSON<ResumeAnswers>('dvg.resume', {}),
      ]);
      const local = profileFromSavedResume(answers, email);
      if (cached?.identity === identity && cached.profile?.found) {
        return {
          profile: {
            ...cached.profile,
            fullName: cached.profile.fullName || local?.fullName || null,
            email: cached.profile.email || local?.email || email,
            phone: cached.profile.phone || local?.phone || null,
            currentCity: cached.profile.currentCity || local?.currentCity || null,
            photoUrl: cached.profile.photoUrl || local?.photoUrl || null,
            resume: { ...(cached.profile.resume ?? {}), ...(local?.resume ?? {}) },
          },
          source: 'cache',
        };
      }
      return { profile: local, source: local ? 'local' : null };
    };

    try {
      if (!isSignedIn) {
        if (request === requestRef.current) { setProfile(null); setSource(null); }
        return;
      }
      // Hydrate immediately from the last verified profile/local questionnaire;
      // the network refresh below can then update it without a blank screen.
      if (profileIdentityRef.current !== identity) {
        const saved = await restoreSaved();
        if (request === requestRef.current && saved.profile) {
          profileIdentityRef.current = identity;
          setProfile(saved.profile);
          setSource(saved.source);
        }
      }
      const token = isSignedIn ? await getTalentslabToken(getTokenRef.current) : null;
      const next = await fetchTalentProfile(token, email);
      if (request === requestRef.current) {
        profileIdentityRef.current = identity;
        if (next.found) {
          setProfile(next);
          setSource('live');
          saveJSON(CACHE_KEY, { identity, profile: next, savedAt: Date.now() } satisfies CachedTalentProfile);
        } else {
          // A confirmed missing server record must not erase a questionnaire that
          // was saved locally while Talentslab was unavailable.
          const saved = await restoreSaved();
          if (request !== requestRef.current) return;
          setProfile(saved.profile ?? next);
          setSource(saved.profile ? saved.source : 'live');
          saveJSON(CACHE_KEY, null);
        }
      }
    } catch {
      // Cold-start fallback: restore the last verified server profile, then merge
      // any newer locally saved questionnaire fields on top.
      const saved = await restoreSaved();
      if (request === requestRef.current) {
        if (saved.profile) {
          profileIdentityRef.current = identity;
          setProfile(saved.profile);
          setSource(saved.source);
        }
        setUnavailable(true);
      }
    } finally {
      if (request === requestRef.current) setLoading(false);
    }
  }, [isSignedIn, email, identity]);

  useEffect(() => { run(); }, [run]);

  // "Live" only when the backend actually resolved a candidate record. A
  // found:false / null profile is NOT live and must not be shown as the user's
  // real data.
  const currentProfile = profileIdentityRef.current === identity ? profile : null;
  const live = source === 'live' && currentProfile?.found === true;

  return { profile: currentProfile, loading, live, unavailable, source, reload: run };
}
