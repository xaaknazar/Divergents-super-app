// Tracks saved + applied vacancies (local, in-session).
import React, { createContext, useContext, useState, useMemo, useCallback, useEffect } from 'react';
import { loadJSON, saveJSON } from './persist';

interface CareerState {
  applied: string[];
  saved: string[];
  isApplied: (id: string) => boolean;
  isSaved: (id: string) => boolean;
  apply: (id: string) => void;
  toggleSave: (id: string) => void;
}

const Ctx = createContext<CareerState | null>(null);

export function CareerProvider({ children }: { children: React.ReactNode }) {
  const [applied, setApplied] = useState<string[]>([]);
  const [saved, setSaved] = useState<string[]>([]);

  useEffect(() => {
    loadJSON<string[]>('dvg.applied', []).then(setApplied);
    loadJSON<string[]>('dvg.saved', []).then(setSaved);
  }, []);

  const apply = useCallback((id: string) =>
    setApplied((p) => { if (p.includes(id)) return p; const n = [...p, id]; saveJSON('dvg.applied', n); return n; }), []);
  const toggleSave = useCallback((id: string) =>
    setSaved((p) => { const n = p.includes(id) ? p.filter((x) => x !== id) : [...p, id]; saveJSON('dvg.saved', n); return n; }), []);

  const value = useMemo<CareerState>(() => ({
    applied, saved,
    isApplied: (id) => applied.includes(id),
    isSaved: (id) => saved.includes(id),
    apply, toggleSave,
  }), [applied, saved, apply, toggleSave]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCareer() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useCareer must be used within CareerProvider');
  return c;
}
