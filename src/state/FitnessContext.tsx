// Цели и свои показатели (турник, планка, вес) — хранятся на телефоне, как и
// тренировки. Рекорды не хранятся: они выводятся из тренировок каждый раз, и
// потому не могут разойтись с историей.
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { loadJSON, saveJSON } from './persist';
import { useActivities } from './ActivityContext';
import { FitnessGoal, FitnessMetric, FitnessProgram, Records, computeRecords, goalProgress, dayKey, programStats } from '../data/fitness';
import { scheduleProgramReminder, cancelProgramReminder } from './programReminders';

const KEY = 'dvg.fitness.v1';

interface Stored { goals: FitnessGoal[]; metrics: FitnessMetric[]; programs: FitnessProgram[] }

interface FitnessState {
  loaded: boolean;
  goals: FitnessGoal[];
  metrics: FitnessMetric[];
  programs: FitnessProgram[];
  records: Records;
  addGoal: (g: Omit<FitnessGoal, 'id' | 'createdISO'>) => FitnessGoal;
  removeGoal: (id: string) => void;
  addMetric: (m: Omit<FitnessMetric, 'id' | 'entries'>) => FitnessMetric;
  removeMetric: (id: string) => void;
  logMetric: (metricId: string, value: number, dateISO?: string) => void;
  removeMetricEntry: (metricId: string, dateISO: string) => void;
  addProgram: (p: Omit<FitnessProgram, 'id' | 'createdISO' | 'log' | 'notificationId' | 'startKey'>) => Promise<FitnessProgram>;
  removeProgram: (id: string) => Promise<void>;
  /** Записать результат за сегодня (или за указанный день). Перезаписывает. */
  logProgram: (id: string, value: number, key?: string) => void;
  setProgramReminder: (id: string, remindAt: FitnessProgram['remindAt']) => Promise<void>;
}

const Ctx = createContext<FitnessState | null>(null);
const newId = () => `${Date.now()}_${Math.round(Math.random() * 1e6)}`;

export function FitnessProvider({ children }: { children: React.ReactNode }) {
  const { workouts } = useActivities();
  const [data, setData] = useState<Stored>({ goals: [], metrics: [], programs: [] });
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let alive = true;
    loadJSON<Partial<Stored> | null>(KEY, null).then((v) => {
      if (!alive) return;
      setData({
        goals: Array.isArray(v?.goals) ? v!.goals! : [],
        metrics: Array.isArray(v?.metrics) ? v!.metrics! : [],
        programs: Array.isArray(v?.programs) ? v!.programs! : [],
      });
      setLoaded(true);
    });
    return () => { alive = false; };
  }, []);

  const commit = useCallback((fn: (prev: Stored) => Stored) => {
    setData((prev) => { const next = fn(prev); saveJSON(KEY, next); return next; });
  }, []);

  const records = useMemo(() => computeRecords(workouts), [workouts]);

  // Достигнутые цели помечаются датой — один раз, при первом достижении.
  // Дальше цель остаётся в списке как трофей, даже если рекорд потом пропадёт
  // вместе с удалённой тренировкой.
  useEffect(() => {
    if (!loaded) return;
    const now = new Date().toISOString();
    let changed = false;
    const goals = data.goals.map((g) => {
      if (g.doneISO) return g;
      if (goalProgress(g, records, data.metrics).done) { changed = true; return { ...g, doneISO: now }; }
      return g;
    });
    if (changed) commit((prev) => ({ ...prev, goals }));
  }, [loaded, records, data.goals, data.metrics, commit]);

  const addGoal = useCallback((g: Omit<FitnessGoal, 'id' | 'createdISO'>) => {
    const goal: FitnessGoal = { ...g, id: newId(), createdISO: new Date().toISOString() };
    commit((prev) => ({ ...prev, goals: [goal, ...prev.goals] }));
    return goal;
  }, [commit]);
  const removeGoal = useCallback((id: string) => commit((prev) => ({ ...prev, goals: prev.goals.filter((g) => g.id !== id) })), [commit]);

  const addMetric = useCallback((m: Omit<FitnessMetric, 'id' | 'entries'>) => {
    const metric: FitnessMetric = { ...m, id: newId(), entries: [] };
    commit((prev) => ({ ...prev, metrics: [...prev.metrics, metric] }));
    return metric;
  }, [commit]);
  const removeMetric = useCallback((id: string) => commit((prev) => ({
    ...prev,
    metrics: prev.metrics.filter((m) => m.id !== id),
    // Цели по удалённому показателю теряют смысл — уходят вместе с ним.
    goals: prev.goals.filter((g) => g.metricId !== id),
  })), [commit]);
  const logMetric = useCallback((metricId: string, value: number, dateISO = new Date().toISOString()) => commit((prev) => ({
    ...prev,
    metrics: prev.metrics.map((m) => (m.id === metricId ? { ...m, entries: [...m.entries, { dateISO, value }] } : m)),
  })), [commit]);
  const removeMetricEntry = useCallback((metricId: string, dateISO: string) => commit((prev) => ({
    ...prev,
    metrics: prev.metrics.map((m) => (m.id === metricId ? { ...m, entries: m.entries.filter((e) => e.dateISO !== dateISO) } : m)),
  })), [commit]);

  // ── Программы ──
  const addProgram = useCallback(async (p: Omit<FitnessProgram, 'id' | 'createdISO' | 'log' | 'notificationId' | 'startKey'>) => {
    const program: FitnessProgram = {
      ...p, id: newId(), createdISO: new Date().toISOString(), log: {}, startKey: dayKey(new Date()), notificationId: null,
    };
    // Напоминание ставим до записи, чтобы id уведомления лёг вместе с программой.
    program.notificationId = await scheduleProgramReminder(program);
    commit((prev) => ({ ...prev, programs: [program, ...prev.programs] }));
    return program;
  }, [commit]);

  const removeProgram = useCallback(async (id: string) => {
    const p = data.programs.find((x) => x.id === id);
    await cancelProgramReminder(p?.notificationId);
    commit((prev) => ({ ...prev, programs: prev.programs.filter((x) => x.id !== id) }));
  }, [commit, data.programs]);

  const logProgram = useCallback((id: string, value: number, key = dayKey(new Date())) => commit((prev) => ({
    ...prev,
    programs: prev.programs.map((p) => (p.id === id ? { ...p, log: { ...p.log, [key]: Math.max(0, value) } } : p)),
  })), [commit]);

  const setProgramReminder = useCallback(async (id: string, remindAt: FitnessProgram['remindAt']) => {
    const p = data.programs.find((x) => x.id === id);
    if (!p) return;
    const notificationId = await scheduleProgramReminder({ ...p, remindAt });
    commit((prev) => ({ ...prev, programs: prev.programs.map((x) => (x.id === id ? { ...x, remindAt, notificationId } : x)) }));
  }, [commit, data.programs]);

  // Законченная программа больше не напоминает. Проверяем при загрузке и при
  // каждом изменении: иначе уведомление жило бы, пока человек не удалит её.
  useEffect(() => {
    if (!loaded) return;
    for (const p of data.programs) {
      if (p.notificationId && programStats(p).finished) {
        void cancelProgramReminder(p.notificationId);
        commit((prev) => ({ ...prev, programs: prev.programs.map((x) => (x.id === p.id ? { ...x, notificationId: null } : x)) }));
      }
    }
  }, [loaded, data.programs, commit]);

  const value = useMemo<FitnessState>(() => ({
    loaded, goals: data.goals, metrics: data.metrics, programs: data.programs, records,
    addGoal, removeGoal, addMetric, removeMetric, logMetric, removeMetricEntry,
    addProgram, removeProgram, logProgram, setProgramReminder,
  }), [loaded, data, records, addGoal, removeGoal, addMetric, removeMetric, logMetric, removeMetricEntry, addProgram, removeProgram, logProgram, setProgramReminder]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useFitness(): FitnessState {
  const c = useContext(Ctx);
  if (!c) throw new Error('useFitness must be used within FitnessProvider');
  return c;
}
