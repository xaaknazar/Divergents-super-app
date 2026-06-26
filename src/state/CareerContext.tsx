// Tracks saved + applied vacancies (persisted) and loads the live vacancy
// catalog from the website API. No mock/branded data — empty when the API is
// unreachable so screens can show a proper empty state.
import React, { createContext, useContext, useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useAuth } from '@clerk/clerk-expo';
import { loadJSON, saveJSON } from './persist';
import { Job, fetchVacancies, applyToVacancy } from '../data/career';

interface CareerState {
  applied: string[];
  saved: string[];
  hydrated: boolean;
  isApplied: (id: string) => boolean;
  isSaved: (id: string) => boolean;
  apply: (id: string) => void;
  toggleSave: (id: string) => void;
  // Live vacancy catalog
  jobs: Job[];
  jobsLoading: boolean;
  jobsError: boolean;
  reloadJobs: () => Promise<void>;
  getJob: (id: string) => Job | undefined;
}

const Ctx = createContext<CareerState | null>(null);

const uniq = (xs: string[]) => Array.from(new Set(xs));

export function CareerProvider({ children }: { children: React.ReactNode }) {
  const { getToken } = useAuth();
  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;

  const [applied, setApplied] = useState<string[]>([]);
  const [saved, setSaved] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);

  const [jobs, setJobs] = useState<Job[]>([]);
  const [jobsLoading, setJobsLoading] = useState(true);
  const [jobsError, setJobsError] = useState(false);

  // Hydrate persisted sets. Merge (union) with any in-memory changes the user
  // made before storage resolved, so a fast tap right after launch is not
  // dropped by the async load overwriting state.
  useEffect(() => {
    let active = true;
    Promise.all([loadJSON<string[]>('dvg.applied', []), loadJSON<string[]>('dvg.saved', [])]).then(([a, s]) => {
      if (!active) return;
      setApplied((cur) => uniq([...a, ...cur]));
      setSaved((cur) => uniq([...s, ...cur]));
      setHydrated(true);
    });
    return () => { active = false; };
  }, []);

  const reloadJobs = useCallback(async () => {
    setJobsLoading(true);
    setJobsError(false);
    try {
      const list = await fetchVacancies();
      setJobs(list);
    } catch {
      setJobs([]);
      setJobsError(true);
    } finally {
      setJobsLoading(false);
    }
  }, []);

  useEffect(() => { reloadJobs(); }, [reloadJobs]);

  const apply = useCallback((id: string) =>
    setApplied((p) => {
      if (p.includes(id)) return p;
      const n = [...p, id];
      saveJSON('dvg.applied', n);
      // Best-effort server sync; the local optimistic state is the source of
      // truth, so failure here is silent and never blocks the UI.
      Promise.resolve(getTokenRef.current())
        .then((tok) => applyToVacancy(id, tok))
        .catch(() => {});
      return n;
    }), []);
  const toggleSave = useCallback((id: string) =>
    setSaved((p) => { const n = p.includes(id) ? p.filter((x) => x !== id) : [...p, id]; saveJSON('dvg.saved', n); return n; }), []);

  const value = useMemo<CareerState>(() => ({
    applied, saved, hydrated,
    isApplied: (id) => applied.includes(id),
    isSaved: (id) => saved.includes(id),
    apply, toggleSave,
    jobs, jobsLoading, jobsError, reloadJobs,
    getJob: (id) => jobs.find((j) => j.id === id),
  }), [applied, saved, hydrated, apply, toggleSave, jobs, jobsLoading, jobsError, reloadJobs]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCareer() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useCareer must be used within CareerProvider');
  return c;
}
