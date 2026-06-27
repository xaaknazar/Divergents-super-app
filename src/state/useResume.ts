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
      // prefill email/full name from Clerk if empty AND already available
      const email = user?.primaryEmailAddress?.emailAddress;
      const name = user?.fullName;
      setAnswers({ ...(email && !v.email ? { email } : {}), ...(name && !v.full_name ? { full_name: name } : {}), ...v });
      setHydrated(true);
    });
  }, []);

  // Clerk's `user` often arrives AFTER the mount effect above ran with user=null,
  // so email/full_name would never prefill. Backfill once it's available, without
  // clobbering anything the user has since typed.
  useEffect(() => {
    if (!hydrated || !user) return;
    const email = user.primaryEmailAddress?.emailAddress;
    const name = user.fullName;
    setAnswers((p) => {
      const next = { ...p };
      if (email && !p.email) next.email = email;
      if (name && !p.full_name) next.full_name = name;
      return next;
    });
  }, [hydrated, user]);

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
      // Defensive: make sure the latest answers are persisted locally BEFORE we
      // attempt the network call, so nothing is lost if the submit fails and the
      // user reopens the анкета to retry.
      saveJSON(KEY, answers);
      const token = await getTalentslabToken(getTokenRef.current);
      const email = user?.primaryEmailAddress?.emailAddress ?? null;
      // submitResume never throws (returns false on failure). Retry once after a
      // short delay so a single transient network blip doesn't drop the resume —
      // the server is idempotent (upserts the Candidate by email).
      let ok = await submitResume(token, answers, email);
      if (!ok) {
        await new Promise((r) => setTimeout(r, 1200));
        ok = await submitResume(token, answers, email);
      }
      return ok;
    } catch { return false; }
    finally { setSubmitting(false); }
  }, [answers]);

  return { answers, setField, completeness, submit, submitting, hydrated };
}
