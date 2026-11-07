import { useEffect, useState } from 'react';
import { useAuth, useUser } from '@clerk/clerk-expo';
import { fetchTalentProfile, getTalentslabToken } from '../data/talentslab';
import { loadJSON, saveJSON } from './persist';

/** Only an account-scoped, server-confirmed questionnaire field; never the legacy shared resume draft. */
export function useActivityGender(enabled: boolean) {
  const { userId, getToken } = useAuth();
  const { user } = useUser();
  const email = user?.primaryEmailAddress?.emailAddress;
  const [value, setValue] = useState<{ owner: string; gender: string | null } | null>(null);
  useEffect(() => {
    if (!enabled || !userId) return;
    let cancelled = false;
    const key = `dvg.activityGender.${userId}`;
    void (async () => {
      const saved = await loadJSON<{ owner: string; gender: string | null } | null>(key, null);
      if (!cancelled && saved?.owner === userId) setValue(saved);
      try {
        const profile = await fetchTalentProfile(await getTalentslabToken(getToken), email ?? null);
        const next = { owner: userId, gender: profile.found ? profile.resume?.gender ?? null : null };
        if (!cancelled) { setValue(next); await saveJSON(key, next); }
      } catch { /* Offline: retain only this account's previously verified field. */ }
    })();
    return () => { cancelled = true; };
  }, [enabled, userId, email, getToken]);
  return value && value.owner === userId ? value.gender : null;
}
