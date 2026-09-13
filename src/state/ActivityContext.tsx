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
  /** Общее время от старта до финиша, за вычетом пауз. */
  durationSec: number;
  /**
   * Время в движении — без остановок у светофоров и передышек. По нему
   * считается темп, как у часов и Strava. У старых записей его нет — тогда
   * темп считается по общему времени.
   */
  movingSec?: number;
  steps: number;
  coords: WorkoutCoord[];
  /** Набор высоты в метрах. Появился позже — у старых записей его нет. */
  elevationGainM?: number;
  /**
   * Шаги измерены шагомером телефона, а не выведены из расстояния.
   *
   * Хранится, чтобы в истории можно было честно показать «≈», когда это
   * прикидка. Разница между измеренным и вычисленным легко доходит до четверти,
   * и выдавать одно за другое — врать человеку, который сверяется с часами.
   */
  stepsMeasured?: boolean;
  /** Шаги этой тренировки уже добавлены в дневную отметку челленджа. */
  addedToChallenge?: boolean;
}

/**
 * Время, по которому считается темп: в движении, если известно, иначе общее.
 *
 * Garmin и Strava делят дистанцию на время в движении. Если делить на общее,
 * каждая минута у светофора замедляет темп, и человек, сверившись с часами,
 * видит у нас другое число и не понимает, чему верить.
 */
export function paceTimeSec(w: { durationSec: number; movingSec?: number }): number {
  return typeof w.movingSec === 'number' && w.movingSec > 0 ? w.movingSec : w.durationSec;
}

/** Темп в секундах на километр. 0 — дистанции слишком мало, чтобы считать. */
export function paceSecPerKm(distanceM: number, durationSec: number): number {
  if (distanceM < 20 || durationSec <= 0) return 0;
  return durationSec / (distanceM / 1000);
}

/** «5′23″» — темп в привычном для бегунов виде. */
export function formatPace(distanceM: number, durationSec: number): string {
  const p = paceSecPerKm(distanceM, durationSec);
  if (!p) return '—';
  return `${Math.floor(p / 60)}′${String(Math.round(p % 60)).padStart(2, '0')}″`;
}

/** «53:42» или «1:12:05» — часы появляются только когда они есть. */
export function formatDuration(sec: number): string {
  const s = Math.max(0, Math.round(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  const mm = String(m).padStart(h ? 2 : 1, '0');
  return h ? `${h}:${mm}:${String(r).padStart(2, '0')}` : `${mm}:${String(r).padStart(2, '0')}`;
}

/** «9,99 км» — километры с запятой, как принято в русском. */
export function formatDistance(distanceM: number): string {
  return `${(distanceM / 1000).toFixed(2).replace('.', ',')} км`;
}

export interface DayBar { label: string; steps: number; isToday: boolean }

interface ActivityState {
  workouts: Workout[];
  loaded: boolean;
  addWorkout: (w: Omit<Workout, 'id'>) => Workout;
  removeWorkout: (id: string) => void;
  /** Отметить, что шаги тренировки уже ушли в дневной зачёт челленджа. */
  markAdded: (id: string) => void;
  todaySteps: number;
  todayDistanceM: number;
  weekly: DayBar[];
}

const KEY = 'dvg.workouts.v1';
const Ctx = createContext<ActivityState | null>(null);
const WEEKDAYS = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];

const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

/**
 * Перевести расстояние в ЗАЧЁТНЫЕ шаги челленджа.
 *
 * Это правило зачёта, а не измерение. У бега оно официальное: 1 км = 2000
 * шагов — и это заведомо больше, чем человек делает на самом деле (реальный бег
 * — около 1000–1100 шагов на километр). Так задумано: бег ценится выше ходьбы.
 * Менять эту цифру нельзя, пока идёт челлендж, — она одинакова для всех, в том
 * числе для тех, кто отмечается вручную и трекером не пользуется.
 *
 * У ходьбы 0,72 м на шаг — средняя длина шага взрослого. Здесь это уже не
 * правило, а прикидка, и она нужна лишь как запасной путь: если в телефоне есть
 * шагомер, шаги берутся у него (см. state/pedometer.ts).
 */
export function distanceToSteps(distanceM: number, type: WorkoutType): number {
  if (distanceM <= 0) return 0;
  return type === 'run' ? Math.round((distanceM / 1000) * 2000) : Math.round(distanceM / 0.72);
}

/**
 * Длиннее этого шаг не бывает. Два метра — это уже спринтер на дорожке; на
 * пробежке по городу шаг в полтора раза короче.
 */
export const MAX_STRIDE_M = 2;

/**
 * Можно ли верить показанию шагомера при такой дистанции.
 *
 * Датчик иногда отдаёт заведомую неправду: 221 шаг на 3,4 км. Так бывает, когда
 * телефон лежал неподвижно в руке или в креплении и акселерометр не увидел
 * шагов, или когда история шагов не отдалась и в ход пошёл счётчик, живший
 * только пока приложение было на экране. Показывать такое как «шаги по датчику»
 * — врать. Проверка простая: пройти дистанцию за меньшее число шагов, чем
 * дистанция ÷ самый длинный возможный шаг, нельзя.
 */
export function stepsPlausible(steps: number, distanceM: number): boolean {
  if (distanceM < 100) return true; // на коротком отрезке проверять нечего
  return steps >= distanceM / MAX_STRIDE_M;
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

  // Помечаем тренировку засчитанной, чтобы её шаги нельзя было добавить в
  // дневную отметку дважды. Без этого человек, открывший историю на следующий
  // день, мог накинуть себе ту же пробежку ещё раз.
  const markAdded = useCallback((id: string) => {
    setWorkouts((prev) => {
      const next = prev.map((x) => (x.id === id ? { ...x, addedToChallenge: true } : x));
      saveJSON(KEY, next);
      return next;
    });
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
    return { workouts, loaded, addWorkout, removeWorkout, markAdded, todaySteps, todayDistanceM, weekly };
  }, [workouts, loaded, addWorkout, removeWorkout, markAdded]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useActivities(): ActivityState {
  const c = useContext(Ctx);
  if (!c) throw new Error('useActivities must be used within ActivityProvider');
  return c;
}
