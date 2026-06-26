// Local resume answers (persisted) + submit to Talentslab. Loads any existing
// profile to prefill basic fields.
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth, useUser } from '@clerk/clerk-expo';
import { loadJSON, saveJSON } from './persist';
import { submitResume, getTalentslabToken, ResumeAnswers } from '../data/talentslab';
import { REQUIRED_KEYS } from '../data/resumeSchema';

const KEY = 'dvg.resume';

export function useResume() {
  const { getToken } = useAuth();
  const { user } = useUser();
  const [answers, setAnswers] = useState<ResumeAnswers>({});
  const [hydrated, setHydrated] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;

  useEffect(() => {
    loadJSON<ResumeAnswers>(KEY, {}).then((v) => {
      // prefill email/full name from Clerk if empty
      const email = user?.primaryEmailAddress?.emailAddress;
      const name = user?.fullName;
      setAnswers({ ...(email && !v.email ? { email } : {}), ...(name && !v.full_name ? { full_name: name } : {}), ...v });
      setHydrated(true);
    });
  }, []);

  const setField = useCallback((key: string, value: any) => {
    setAnswers((p) => { const n = { ...p, [key]: value }; saveJSON(KEY, n); return n; });
  }, []);

  const completeness = (() => {
    const filled = REQUIRED_KEYS.filter((k) => {
      const v = answers[k];
      return v !== undefined && v !== null && v !== '' && !(Array.isArray(v) && v.length === 0);
    }).length;
    return Math.round((filled / REQUIRED_KEYS.length) * 100);
  })();

  const submit = useCallback(async () => {
    setSubmitting(true);
    try {
      const token = await getTalentslabToken(getTokenRef.current);
      const email = user?.primaryEmailAddress?.emailAddress ?? null;
      return await submitResume(token, answers, email);
    } catch { return false; }
    finally { setSubmitting(false); }
  }, [answers]);

  return { answers, setField, completeness, submit, submitting, hydrated };
}
