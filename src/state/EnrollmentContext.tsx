// Persisted set of "signups": sport, trips, lectures, course bookmarks.
// Keys are namespaced, e.g. 'sport:football', 'trip:kolsai', 'lecture:lec1', 'bookmark:<courseId>'.
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@clerk/clerk-expo';
import { loadJSON, saveJSON } from './persist';
import { fetchMySportIds, fetchMyTripIds } from '../data/api';

const KEY = 'dvg.enrollments';

interface EnrollState {
  has: (k: string) => boolean;
  toggle: (k: string) => void;
  add: (k: string) => void;
  ready: boolean;
}

const Ctx = createContext<EnrollState | null>(null);

export function EnrollmentProvider({ children }: { children: React.ReactNode }) {
  const { isSignedIn, getToken } = useAuth();
  const [set, setSet] = useState<string[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (isSignedIn === false) {
      setSet([]);
      setReady(true);
      saveJSON(KEY, []);
      return;
    }
    loadJSON<string[]>(KEY, []).then((v) => { setSet(v); setReady(true); });
  }, [isSignedIn]);

  // Server membership is authoritative. Merge it into the local cache so
  // personal activity cards survive reinstalls and appear on every device.
  useEffect(() => {
    if (!isSignedIn) return;
    let alive = true;
    (async () => {
      try {
        const token = await getToken();
        const [tripIds, sportIds] = await Promise.all([fetchMyTripIds(token), fetchMySportIds(token)]);
        if (!alive) return;
        setSet((previous) => {
          const next = Array.from(new Set([
            ...previous,
            ...tripIds.map((id) => `trip:${id}`),
            ...sportIds.map((id) => `sport:${id}`),
          ]));
          saveJSON(KEY, next);
          return next;
        });
      } catch {
        // Keep the local cache when the website is temporarily unavailable.
      }
    })();
    return () => { alive = false; };
  }, [isSignedIn]);

  const value = useMemo<EnrollState>(() => ({
    ready,
    has: (k) => set.includes(k),
    add: (k) => setSet((p) => { if (p.includes(k)) return p; const n = [...p, k]; saveJSON(KEY, n); return n; }),
    toggle: (k) => setSet((p) => { const n = p.includes(k) ? p.filter((x) => x !== k) : [...p, k]; saveJSON(KEY, n); return n; }),
  }), [set, ready]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useEnrollment() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useEnrollment must be used within EnrollmentProvider');
  return c;
}
