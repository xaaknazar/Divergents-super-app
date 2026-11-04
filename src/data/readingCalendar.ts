import type { ReadingDetail } from './reading';

const DAY = 86_400_000;
const ALMATY = 5 * 3_600_000;
type Entry = NonNullable<ReadingDetail['me']>['history'][number];
export type ReadingCalendarState = 'complete' | 'flag' | 'forgiven' | 'today' | 'pending' | 'future' | 'outside';
export type ReadingCalendarCell = { key: string; state: ReadingCalendarState; date: number; personalDay?: number; pages: number; minutes: number };

/** Day of the reader's own calendar (personal day 1 = joining day) → Almaty midnight of that date. */
export const readingPersonalDate = (startsAt: number, firstDay: number, day: number) => startsAt + (day - firstDay) * DAY;
/** Monday-first weekday 0..6 for an Almaty-midnight timestamp. */
export const readingWeekday = (ms: number) => (new Date(ms + ALMATY).getUTCDay() + 6) % 7;
export const READING_WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const MONTHS = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
export const readingMonthShort = (ms: number) => MONTHS[new Date(ms + ALMATY).getUTCMonth()];

function stateOf(entry: Entry | undefined, isToday: boolean): ReadingCalendarState {
  if (!entry) return 'future';
  if (entry.state === 'complete') return 'complete';
  if (entry.state === 'missed') return entry.flagForgivenOn ? 'forgiven' : 'flag';
  if (isToday || entry.state === 'open') return isToday ? 'today' : 'pending';
  return 'pending';
}

/** Weeks × 7 grid (Monday first) ending with the week of the last diary day. Only saved server days are shown. */
export function readingCalendarWeeks(history: Entry[], firstDay: number, startsAt: number, weeks = 12): ReadingCalendarCell[][] {
  if (!history.length) return [];
  const byDay = new Map(history.map(h => [h.day, h]));
  const lastDay = Math.max(...history.map(h => h.day));
  const last = readingPersonalDate(startsAt, firstDay, lastDay);
  const gridStart = last - readingWeekday(last) * DAY - (weeks - 1) * 7 * DAY;
  return Array.from({ length: weeks }, (_, w) => Array.from({ length: 7 }, (_, d) => {
    const date = gridStart + (w * 7 + d) * DAY;
    const day = firstDay + Math.round((date - startsAt) / DAY);
    const entry = byDay.get(day);
    const state: ReadingCalendarState = day < firstDay ? 'outside' : day > lastDay ? 'future' : stateOf(entry, day === lastDay);
    return { key: String(date), state, date, ...(day >= firstDay ? { personalDay: day - firstDay + 1 } : {}),
      pages: entry?.pages ?? 0, minutes: Math.floor((entry?.elapsedMs ?? 0) / 60000) };
  }));
}
