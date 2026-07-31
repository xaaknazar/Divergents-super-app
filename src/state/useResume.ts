// Local resume answers (persisted) + submit to Talentslab.
// Hydration order (never clobbers what the user has typed):
//   1. persisted local answers (dvg.resume)
//   2. Clerk email / full name
//   3. the user's EXISTING Talentslab profile (so opening the form doesn't show
//      blanks and a save can't wipe data already entered on the website — #6)
// A failed submit is remembered (dvg.resumePending) and retried once on the next
// mount, so an offline save still reaches HR when connectivity returns (#4).
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth, useUser } from '@clerk/clerk-expo';
import { loadJSON, saveJSON } from './persist';
import { submitResume, getTalentslabToken, ResumeAnswers } from '../data/talentslab';
import { REQUIRED_KEYS, RESUME_STEPS } from '../data/resumeSchema';
import { useTalentProfile } from './useTalentProfile';

const KEY = 'dvg.resume';
const PENDING = 'dvg.resumePending';
const ALL_KEYS = RESUME_STEPS.flatMap((s) => s.fields.map((f) => f.key));

const isEmpty = (v: any) => v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0);

export function useResume() {
  const { getToken } = useAuth();
  const { user } = useUser();
  const { profile, live } = useTalentProfile();
  const [answers, setAnswers] = useState<ResumeAnswers>({});
  const [hydrated, setHydrated] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;
  const answersRef = useRef(answers);
  answersRef.current = answers;

  useEffect(() => {
    loadJSON<ResumeAnswers>(KEY, {}).then((v) => {
      // prefill email/full name from Clerk if empty AND already available
      const email = user?.primaryEmailAddress?.emailAddress;
      setAnswers({
        ...(email && !v.email ? { email } : {}),
        ...(user?.firstName && !v.first_name ? { first_name: user.firstName } : {}),
        ...(user?.lastName && !v.last_name ? { last_name: user.lastName } : {}),
        ...v,
      });
      setHydrated(true);
    });
  }, []);

  // Clerk's `user` often arrives AFTER the mount effect above ran with user=null,
  // so email/full_name would never prefill. Backfill once it's available, without
  // clobbering anything the user has since typed.
  useEffect(() => {
    if (!hydrated || !user) return;
    const email = user.primaryEmailAddress?.emailAddress;
    setAnswers((p) => {
      const next = { ...p };
      if (email && !p.email) next.email = email;
      if (user.firstName && !p.first_name) next.first_name = user.firstName;
      if (user.lastName && !p.last_name) next.last_name = user.lastName;
      return next;
    });
  }, [hydrated, user]);

  // #6: hydrate empty fields from the EXISTING Talentslab profile once it loads.
  // Only fills fields the user hasn't provided, and only safe value shapes
  // (scalars + string arrays), so nothing typed is overwritten and messy
  // object-arrays are skipped rather than corrupting the form.
  const profileHydrated = useRef(false);
  useEffect(() => {
    if (!hydrated || profileHydrated.current) return;
    if (!live || !profile?.resume) return;
    profileHydrated.current = true;
    const src: any = profile.resume;
    setAnswers((p) => {
      const next = { ...p };
      for (const k of ALL_KEYS) {
        if (!isEmpty(next[k])) continue;
        const v = src[k];
        if (isEmpty(v)) continue;
        if (Array.isArray(v)) { const strs = v.filter((x) => typeof x === 'string'); if (strs.length) next[k] = strs; continue; }
        if (typeof v === 'object') continue;
        next[k] = v;
      }
      saveJSON(KEY, next);
      return next;
    });
  }, [hydrated, live, profile]);

  const setField = useCallback((key: string, value: any) => {
    setAnswers((p) => { const n = { ...p, [key]: value }; saveJSON(KEY, n); return n; });
  }, []);

  const completeness = (() => {
    const filled = REQUIRED_KEYS.filter((k) => !isEmpty(answers[k])).length;
    return Math.round((filled / REQUIRED_KEYS.length) * 100);
  })();

  // Send to Talentslab (retry once). Records success/failure in `dvg.resumePending`
  // so a failed send can be auto-retried on the next mount. Idempotent server-side.
  const send = useCallback(async (a: ResumeAnswers): Promise<boolean> => {
    const token = await getTalentslabToken(getTokenRef.current);
    const email = user?.primaryEmailAddress?.emailAddress ?? null;
    let ok = await submitResume(token, a, email);
    if (!ok) { await new Promise((r) => setTimeout(r, 1200)); ok = await submitResume(token, a, email); }
    saveJSON(PENDING, !ok);
    return ok;
  }, [user]);

  const submit = useCallback(async () => {
    setSubmitting(true);
    try {
      saveJSON(KEY, answers);
      const ok = await send(answers);
      // Mirror the name into Clerk so the greeting shows «Имя» and the profile
      // shows «Имя Фамилия».
      try {
        const fn = typeof answers.first_name === 'string' ? answers.first_name.trim() : '';
        const ln = typeof answers.last_name === 'string' ? answers.last_name.trim() : '';
        const params: { firstName?: string; lastName?: string } = {};
        if (fn) params.firstName = fn;
        if (ln) params.lastName = ln;
        if (user && Object.keys(params).length) await user.update(params);
      } catch {}
      return ok;
    } catch { saveJSON(PENDING, true); return false; }
    finally { setSubmitting(false); }
  }, [answers, send, user]);

  // #4: if a previous submit failed, re-send once on mount (background, silent).
  const resentRef = useRef(false);
  useEffect(() => {
    if (!hydrated || resentRef.current) return;
    resentRef.current = true;
    loadJSON<boolean>(PENDING, false).then((pending) => {
      const a = answersRef.current;
      if (pending && Object.keys(a).length) send(a).catch(() => {});
    });
  }, [hydrated, send]);

  return { answers, setField, completeness, submit, submitting, hydrated };
}
