// Strava-style workout history: GPS run/walk sessions recorded on-device.
// Each session stores its route polyline, distance, duration and a steps-
// equivalent (so it can feed the challenge activity metric). Persisted locally —
// no server needed — which also powers the day-by-day activity dynamics.
import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { loadJSON, saveJSON } from './persist';

export type WorkoutType = 'run' | 'walk';
export interface WorkoutCoord { latitude: number; longitude: number }
export interface Workout {
  id: string;
  type: WorkoutType;
  dateISO: string;
  distanceM: number;
  durationSec: number;
  steps: number;
  coords: WorkoutCoord[];
}

export interface DayBar { label: string; steps: number; isToday: boolean }

interface ActivityState {
  workouts: Workout[];
  loaded: boolean;
  addWorkout: (w: Omit<Workout, 'id'>) => Workout;
  removeWorkout: (id: string) => void;
  todaySteps: number;
  todayDistanceM: number;
  weekly: DayBar[];
}

const KEY = 'dvg.workouts.v1';
const Ctx = createContext<ActivityState | null>(null);
const WEEKDAYS = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];

const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

// Convert a tracked distance to a steps-equivalent. Running uses the challenge's
// official rule (1 км = 2000 шагов); walking maps distance at an average stride.
export function distanceToSteps(distanceM: number, type: WorkoutType): number {
  if (distanceM <= 0) return 0;
  return type === 'run' ? Math.round((distanceM / 1000) * 2000) : Math.round(distanceM / 0.72);
}

export function ActivityProvider({ children }: { children: React.ReactNode }) {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let alive = true;
    loadJSON<Workout[]>(KEY, []).then((v) => { if (alive) { setWorkouts(Array.isArray(v) ? v : []); setLoaded(true); } });
    return () => { alive = false; };
  }, []);

  const addWorkout = useCallback((w: Omit<Workout, 'id'>) => {
    const item: Workout = { ...w, id: `${Date.now()}_${Math.round(Math.random() * 1e6)}` };
    setWorkouts((prev) => { const next = [item, ...prev].slice(0, 200); saveJSON(KEY, next); return next; });
    return item;
  }, []);

  const removeWorkout = useCallback((id: string) => {
    setWorkouts((prev) => { const next = prev.filter((x) => x.id !== id); saveJSON(KEY, next); return next; });
  }, []);

  const value = useMemo<ActivityState>(() => {
    const now = new Date();
    const todayK = dayKey(now);
    const todays = workouts.filter((w) => { const d = new Date(w.dateISO); return !isNaN(d.getTime()) && dayKey(d) === todayK; });
    const todaySteps = todays.reduce((s, w) => s + w.steps, 0);
    const todayDistanceM = todays.reduce((s, w) => s + w.distanceM, 0);
    const weekly: DayBar[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now); d.setDate(now.getDate() - i);
      const k = dayKey(d);
      const steps = workouts.filter((w) => { const wd = new Date(w.dateISO); return !isNaN(wd.getTime()) && dayKey(wd) === k; }).reduce((s, w) => s + w.steps, 0);
      weekly.push({ label: WEEKDAYS[d.getDay()], steps, isToday: i === 0 });
    }
    return { workouts, loaded, addWorkout, removeWorkout, todaySteps, todayDistanceM, weekly };
  }, [workouts, loaded, addWorkout, removeWorkout]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useActivities(): ActivityState {
  const c = useContext(Ctx);
  if (!c) throw new Error('useActivities must be used within ActivityProvider');
  return c;
}
