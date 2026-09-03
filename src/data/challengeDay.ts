// Границы дня челленджа на стороне приложения.
//
// Зачёт живёт на сервере, но экран должен знать то же самое: в какой день мы
// сейчас и можно ли ещё отмечаться. Раньше эта арифметика лежала внутри
// контекста, была неотличима от состояния и не покрывалась тестами — а
// ошибиться здесь означает либо принять отметку, которую сервер отвергнет,
// либо запереть человека в рабочий день.
//
// Правило: день N идёт с 23:01 до 23:00:59 следующих суток по Алматы (UTC+5,
// перевода часов в Казахстане нет). Отметки принимаются до 23:00:59 включительно,
// поэтому час с 23:01 до полуночи — «мёртвый»: день уже новый, а записать в него
// ещё нельзя.
import { Challenge, DEFAULT_CHALLENGE, DEFAULT_REPORT_DEADLINE_HOUR } from './community';

export const ALMATY_OFFSET_MS = 5 * 60 * 60 * 1000;
/** День переводится на минуту позже дедлайна отчёта. */
export const DAY_ROLLOVER_MINUTE = 1;

/** Минута суток по Алматы: 23:01 → 1381. */
export function almatyMinuteOfDay(nowMs: number): number {
  const now = new Date(nowMs + ALMATY_OFFSET_MS);
  return now.getUTCHours() * 60 + now.getUTCMinutes();
}

/** Час дедлайна из настроек челленджа (запасное значение — 23). */
export function deadlineHourOf(c: Challenge): number {
  const h = c.rules?.reportDeadlineHour;
  return typeof h === 'number' && h > 0 && h <= 23 ? h : DEFAULT_REPORT_DEADLINE_HOUR;
}

/** Минута суток, начиная с которой сервер отказывает по дедлайну. */
function rolloverMinute(c: Challenge): number {
  return deadlineHourOf(c) * 60 + DAY_ROLLOVER_MINUTE;
}

/**
 * Приём отметок закрыт до полуночи. Без этой проверки человек с 23:01 до 00:00
 * нажимал, отметка улетала на сервер, возвращался отказ и значение откатывалось.
 */
export function pastDeadlineNow(c: Challenge, nowMs = Date.now()): boolean {
  return almatyMinuteOfDay(nowMs) >= rolloverMinute(c);
}

/** Какой день челленджа сейчас по часам телефона (сервер считает так же). */
export function expectedChallengeDay(c: Challenge, nowMs = Date.now()): number {
  if (!c.startISO) return c.currentDay;
  const startMs = Date.parse(c.startISO);
  if (!Number.isFinite(startMs)) return c.currentDay;
  const start = new Date(startMs + ALMATY_OFFSET_MS);
  const now = new Date(nowMs + ALMATY_OFFSET_MS);
  const startDate = Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate());
  const nowDate = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const dateOffset = Math.floor((nowDate - startDate) / (24 * 60 * 60 * 1000));
  const afterRollover = almatyMinuteOfDay(nowMs) >= rolloverMinute(c) ? 1 : 0;
  const day = Math.max(1, dateOffset + 1 + afterRollover);
  // Кламп по длительности — как на сервере. Без него после 23:01 последнего дня
  // ожидаемый день навсегда обгонял серверный и экран оставался «закрытым».
  const total = c.totalDays > 0 ? c.totalDays : day;
  return Math.min(day, total);
}

/** Можно ли сейчас менять отметки. */
export function isChallengeDayLocked(c: Challenge, nowMs = Date.now()): boolean {
  if (c.id === DEFAULT_CHALLENGE.id || c.currentDay <= 0) return false;
  // Два случая: сервер ещё не перевёл день, и «мёртвый час» после дедлайна.
  return expectedChallengeDay(c, nowMs) > c.currentDay || pastDeadlineNow(c, nowMs);
}
