// Persisted set of "signups": sport, trips, lectures, course bookmarks.
// Keys are namespaced, e.g. 'sport:football', 'trip:kolsai', 'lecture:lec1', 'bookmark:<courseId>'.
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { loadJSON, saveJSON } from './persist';

const KEY = 'dvg.enrollments';

interface EnrollState {
  has: (k: string) => boolean;
  toggle: (k: string) => void;
  add: (k: string) => void;
  ready: boolean;
}

const Ctx = createContext<EnrollState | null>(null);

export function EnrollmentProvider({ children }: { children: React.ReactNode }) {
  const [set, setSet] = useState<string[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    loadJSON<string[]>(KEY, []).then((v) => { setSet(v); setReady(true); });
  }, []);

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
