// Resume gate: after sign-in the user cannot enter the app (Tabs) until their
// Talentslab resume is fully filled (all required fields → completeness 100%).
//
// Policy (chosen product decisions):
//  1. "Filled" means 100% of required fields (REQUIRED_KEYS via useResume).
//  2. A resume already completed on the Talentslab website counts — if the
//     backend reports the candidate as complete (completeness ≥ 100 or
//     resumeStep ≥ 5) the gate passes without re-entering anything.
//  3. If Talentslab is unreachable AND the local resume is not complete, we
//     BLOCK (show the questionnaire) rather than letting the user in.
//
// Once completion is confirmed (locally or by the server) we cache a flag so a
// later offline launch doesn't re-block a user who was already confirmed. The
// flag is a user-scoped key wiped on sign-out (see state/reset.ts).
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import { useAuth } from '@clerk/clerk-expo';
import { useResume } from './useResume';
import { useTalentProfile } from './useTalentProfile';

export const RESUME_COMPLETE_KEY = 'dvg.resumeComplete';

interface ResumeGate {
  ready: boolean;      // enough info to decide whether to block
  complete: boolean;   // resume is fully filled → allow entry
  markComplete: () => void;
}

const Ctx = createContext<ResumeGate | null>(null);

export function ResumeGateProvider({ children }: { children: React.ReactNode }) {
  const { isSignedIn } = useAuth();
  const { completeness, hydrated } = useResume();
  const { profile, loading: profileLoading, live } = useTalentProfile();

  // null = still loading the cached flag from SecureStore.
  const [cached, setCached] = useState<boolean | null>(null);

  useEffect(() => {
    let alive = true;
    SecureStore.getItemAsync(RESUME_COMPLETE_KEY)
      .then((v) => { if (alive) setCached(v === '1'); })
      .catch(() => { if (alive) setCached(false); });
    return () => { alive = false; };
  }, []);

  const localComplete = hydrated && completeness >= 100;
  const serverComplete = live && ((profile?.completeness ?? 0) >= 100 || (profile?.resumeStep ?? 0) >= 5);
  const complete = cached === true || localComplete || serverComplete;

  // Persist the confirmation once, so a later offline launch keeps the user in.
  useEffect(() => {
    if (complete && cached === false) {
      SecureStore.setItemAsync(RESUME_COMPLETE_KEY, '1').catch(() => {});
    }
  }, [complete, cached]);

  const markComplete = useCallback(() => {
    setCached(true);
    SecureStore.setItemAsync(RESUME_COMPLETE_KEY, '1').catch(() => {});
  }, []);

  // We can decide once the cached flag is loaded and the local resume hydrated.
  // If not already complete we additionally wait for the server check to finish
  // (profileLoading=false) so a candidate who is complete on the website isn't
  // shown the form. Per policy, a failed/empty server check + incomplete local
  // resume still resolves to "not complete" → the gate blocks.
  const ready = cached !== null && hydrated && (complete || !profileLoading || !isSignedIn);

  return <Ctx.Provider value={{ ready, complete, markComplete }}>{children}</Ctx.Provider>;
}

export function useResumeGate() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useResumeGate must be used within ResumeGateProvider');
  return c;
}
