// Физические показатели: рекорды из тренировок, цели и свои показатели.
//
// Чистые функции без React и хранилища — чтобы правила (что считается
// рекордом, как считается прогресс цели) проверялись тестами, а не глазами.
import type { Workout } from '../state/ActivityContext';
import { paceSecPerKm, paceTimeSec } from '../state/ActivityContext';

// ───────── Цели ─────────

/**
 * Какие цели умеем считать сами:
 *   run_distance — пробежать N км за одну тренировку;
 *   run_pace     — темп быстрее N сек/км (на пробежке от 1 км);
 *   week_km      — N км за неделю (бег и ходьба вместе);
 *   metric       — свой показатель (турник, планка) до значения N.
 */
export type GoalKind = 'run_distance' | 'run_pace' | 'week_km' | 'metric';

export interface FitnessGoal {
  id: string;
  kind: GoalKind;
  title: string;
  /** Целевое значение в базовых единицах: метры, сек/км, метры/неделю, единицы показателя. */
  target: number;
  /** Для kind = 'metric' — id показателя. */
  metricId?: string;
  createdISO: string;
  /** Достигнута — когда именно. Достигнутая цель остаётся в списке как трофей. */
  doneISO?: string;
}

// ───────── Свои показатели ─────────

/** Единица и направление: подтягивания — больше лучше, планка в секундах — больше лучше, бег на 100 м — меньше лучше. */
export interface FitnessMetric {
  id: string;
  name: string;
  unit: string;
  /** 'max' — рекорд это максимум, 'min' — минимум (время). */
  direction: 'max' | 'min';
  entries: { dateISO: string; value: number }[];
}

/** Шаблоны, чтобы не печатать «Подтягивания · раз · больше лучше» руками. */
export const METRIC_PRESETS: { name: string; unit: string; direction: 'max' | 'min' }[] = [
  { name: 'Подтягивания', unit: 'раз', direction: 'max' },
  { name: 'Отжимания', unit: 'раз', direction: 'max' },
  { name: 'Приседания', unit: 'раз', direction: 'max' },
  { name: 'Планка', unit: 'сек', direction: 'max' },
  { name: 'Пресс', unit: 'раз', direction: 'max' },
  { name: 'Вес', unit: 'кг', direction: 'min' },
];

export function metricBest(m: FitnessMetric): number | null {
  if (m.entries.length === 0) return null;
  const vals = m.entries.map((e) => e.value);
  return m.direction === 'max' ? Math.max(...vals) : Math.min(...vals);
}

export function metricLast(m: FitnessMetric): { dateISO: string; value: number } | null {
  if (m.entries.length === 0) return null;
  return [...m.entries].sort((a, b) => Date.parse(b.dateISO) - Date.parse(a.dateISO))[0];
}

// ───────── Рекорды из тренировок ─────────

export interface Records {
  /** Самая длинная пробежка. */
  longestRun: Workout | null;
  /** Самый быстрый темп на пробежке от 1 км: короче — не темп, а спринт до автобуса. */
  fastestRun: Workout | null;
  longestWalk: Workout | null;
  /** Всего километров, бег и ходьба вместе. */
  totalM: number;
  runs: number;
  walks: number;
  /** Километров за последние 7 дней. */
  weekM: number;
}

export const MIN_PACE_RECORD_M = 1000;

export function computeRecords(workouts: Workout[], now = Date.now()): Records {
  let longestRun: Workout | null = null;
  let fastestRun: Workout | null = null;
  let longestWalk: Workout | null = null;
  let totalM = 0, runs = 0, walks = 0, weekM = 0;
  const weekAgo = now - 7 * 86_400_000;
  for (const w of workouts) {
    totalM += w.distanceM;
    const t = Date.parse(w.dateISO);
    if (Number.isFinite(t) && t >= weekAgo && t <= now) weekM += w.distanceM;
    if (w.type === 'run') {
      runs += 1;
      if (!longestRun || w.distanceM > longestRun.distanceM) longestRun = w;
      if (w.distanceM >= MIN_PACE_RECORD_M) {
        const p = paceSecPerKm(w.distanceM, paceTimeSec(w));
        const best = fastestRun ? paceSecPerKm(fastestRun.distanceM, paceTimeSec(fastestRun)) : 0;
        if (p > 0 && (!fastestRun || p < best)) fastestRun = w;
      }
    } else {
      walks += 1;
      if (!longestWalk || w.distanceM > longestWalk.distanceM) longestWalk = w;
    }
  }
  return { longestRun, fastestRun, longestWalk, totalM, runs, walks, weekM };
}

// ───────── Прогресс цели ─────────

export interface GoalProgress {
  /** Текущее значение в базовых единицах. */
  current: number;
  /** 0..1, для полосы. */
  ratio: number;
  done: boolean;
}

/**
 * Насколько цель близка.
 *
 * У темпа «лучше» — это меньше, поэтому доля считается наоборот: цель 5:00 при
 * текущем 6:00 — это 5/6 пути, а не 6/5.
 */
export function goalProgress(goal: FitnessGoal, records: Records, metrics: FitnessMetric[]): GoalProgress {
  const clamp = (x: number) => Math.max(0, Math.min(1, x));
  switch (goal.kind) {
    case 'run_distance': {
      const current = records.longestRun?.distanceM ?? 0;
      return { current, ratio: goal.target > 0 ? clamp(current / goal.target) : 0, done: current >= goal.target && goal.target > 0 };
    }
    case 'week_km': {
      const current = records.weekM;
      return { current, ratio: goal.target > 0 ? clamp(current / goal.target) : 0, done: current >= goal.target && goal.target > 0 };
    }
    case 'run_pace': {
      const r = records.fastestRun;
      const current = r ? paceSecPerKm(r.distanceM, paceTimeSec(r)) : 0;
      if (!current) return { current: 0, ratio: 0, done: false };
      return { current, ratio: clamp(goal.target / current), done: current <= goal.target };
    }
    case 'metric': {
      const m = metrics.find((x) => x.id === goal.metricId);
      const best = m ? metricBest(m) : null;
      if (best == null || !m) return { current: 0, ratio: 0, done: false };
      if (m.direction === 'max') return { current: best, ratio: goal.target > 0 ? clamp(best / goal.target) : 0, done: best >= goal.target };
      return { current: best, ratio: best > 0 ? clamp(goal.target / best) : 0, done: best <= goal.target };
    }
  }
}

/** Подпись значения цели и текущего — в человеческих единицах. */
export function goalValueText(kind: GoalKind, value: number, unit?: string): string {
  switch (kind) {
    case 'run_distance':
    case 'week_km':
      return `${(value / 1000).toFixed(value >= 10_000 ? 0 : 1).replace('.', ',')} км`;
    case 'run_pace':
      return value > 0 ? `${Math.floor(value / 60)}:${String(Math.round(value % 60)).padStart(2, '0')} /км` : '—';
    case 'metric':
      return `${Math.round(value * 10) / 10} ${unit ?? ''}`.trim();
  }
}

// ───────── Программы ─────────
//
// «Каждое утро 30 отжиманий, 21 день». Программа — это ежедневное действие с
// нормой и сроком. Считается по календарным дням телефона: день закрыт, если в
// этот день записано не меньше нормы; прошедший день без записи — пропуск.

export interface FitnessProgram {
  id: string;
  title: string;
  unit: string;
  /** Норма на день. */
  target: number;
  /** Длительность в днях. */
  days: number;
  /** Первый день программы, ключ 'YYYY-MM-DD' по местному времени. */
  startKey: string;
  /** Напоминание: час и минута по местному времени; null — без напоминания. */
  remindAt: { hour: number; minute: number } | null;
  /** Идентификатор запланированного уведомления — чтобы отменить. */
  notificationId?: string | null;
  /** Что сделано по дням: ключ дня → значение. */
  log: Record<string, number>;
  createdISO: string;
}

export const PROGRAM_PRESETS: { title: string; unit: string; target: number }[] = [
  { title: 'Отжимания', unit: 'раз', target: 30 },
  { title: 'Подтягивания', unit: 'раз', target: 10 },
  { title: 'Приседания', unit: 'раз', target: 50 },
  { title: 'Пресс', unit: 'раз', target: 30 },
  { title: 'Планка', unit: 'сек', target: 60 },
  { title: 'Зарядка', unit: 'мин', target: 10 },
];

export const PROGRAM_DURATIONS = [7, 14, 21, 30];

/** Ключ календарного дня по местному времени: '2026-09-07'. */
export function dayKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Ключ через N дней после стартового. */
export function shiftKey(startKey: string, offsetDays: number): string {
  const [y, m, d] = startKey.split('-').map(Number);
  return dayKey(new Date(y, m - 1, d + offsetDays));
}

/** Сколько целых дней между двумя ключами (b − a). */
export function daysBetween(aKey: string, bKey: string): number {
  const [ay, am, ad] = aKey.split('-').map(Number);
  const [by, bm, bd] = bKey.split('-').map(Number);
  return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86_400_000);
}

export type ProgramDayState = 'done' | 'missed' | 'today' | 'future' | 'partial';

export interface ProgramStats {
  /** Номер сегодняшнего дня программы, 1-based; 0 — ещё не началась; > days — завершена. */
  dayIndex: number;
  finished: boolean;
  done: number;
  missed: number;
  /** Сегодня выполнено. */
  todayDone: boolean;
  todayValue: number;
  /** Подряд выполненных дней, считая от сегодня (или вчера, если сегодня ещё нет). */
  streak: number;
  /** Состояние каждого дня для сетки. */
  grid: { key: string; index: number; state: ProgramDayState; value: number }[];
}

export function programStats(p: FitnessProgram, now = new Date()): ProgramStats {
  const todayKey = dayKey(now);
  const dayIndex = daysBetween(p.startKey, todayKey) + 1;
  const finished = dayIndex > p.days;
  const grid: ProgramStats['grid'] = [];
  let done = 0, missed = 0;
  for (let i = 0; i < p.days; i++) {
    const key = shiftKey(p.startKey, i);
    const value = p.log[key] ?? 0;
    const isDone = value >= p.target && p.target > 0;
    let state: ProgramDayState;
    if (i + 1 < dayIndex) state = isDone ? 'done' : 'missed';
    else if (i + 1 === dayIndex) state = isDone ? 'done' : value > 0 ? 'partial' : 'today';
    else state = 'future';
    if (state === 'done') done += 1;
    if (state === 'missed') missed += 1;
    grid.push({ key, index: i + 1, state, value });
  }
  const todayValue = p.log[todayKey] ?? 0;
  const todayDone = todayValue >= p.target && p.target > 0 && dayIndex >= 1 && !finished;

  // Серия: от сегодняшнего дня назад; если сегодня ещё не сделано — от вчера.
  // У завершённой программы «сегодня» нет — считаем от её последнего дня.
  let streak = 0;
  const last = Math.min(dayIndex, p.days);
  let i = todayDone || finished ? last : last - 1;
  while (i >= 1) {
    const g = grid[i - 1];
    if (g && g.state === 'done') { streak += 1; i -= 1; } else break;
  }
  return { dayIndex, finished, done, missed, todayDone, todayValue, streak, grid };
}
