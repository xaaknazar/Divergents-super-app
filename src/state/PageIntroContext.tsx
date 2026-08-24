// First-visit page intros: tracks which tab intros the user has already seen, so
// each page's explainer modal shows exactly once. Device-level (like onboarding)
// — kept across sign-out, so it isn't wiped by clearAllAppData().
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { loadJSON, saveJSON } from './persist';

const KEY = 'dvg.pageIntro.v1';

interface PageIntroState {
  ready: boolean;                    // seen-list loaded from storage
  isSeen: (key: string) => boolean;
  markSeen: (key: string) => void;
  resetAll: () => void;              // re-show every intro (e.g. from Profile)
}

const Ctx = createContext<PageIntroState | null>(null);

export function PageIntroProvider({ children }: { children: React.ReactNode }) {
  // null = still loading; [] = loaded, nothing seen yet.
  const [seen, setSeen] = useState<string[] | null>(null);

  useEffect(() => {
    let alive = true;
    loadJSON<string[]>(KEY, []).then((s) => { if (alive) setSeen(Array.isArray(s) ? s : []); });
    return () => { alive = false; };
  }, []);

  const value = useMemo<PageIntroState>(() => ({
    ready: seen !== null,
    isSeen: (key) => (seen ?? []).includes(key),
    markSeen: (key) => setSeen((prev) => {
      const cur = prev ?? [];
      if (cur.includes(key)) return cur;
      const next = [...cur, key];
      saveJSON(KEY, next);
      return next;
    }),
    resetAll: () => { setSeen([]); saveJSON(KEY, []); },
  }), [seen]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePageIntroState(): PageIntroState {
  const c = useContext(Ctx);
  if (!c) throw new Error('usePageIntroState must be used within PageIntroProvider');
  return c;
}
