// Tracks saved + applied vacancies (local, in-session).
import React, { createContext, useContext, useState, useMemo, useCallback } from 'react';

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

  const apply = useCallback((id: string) => setApplied((p) => (p.includes(id) ? p : [...p, id])), []);
  const toggleSave = useCallback((id: string) =>
    setSaved((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id])), []);

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
