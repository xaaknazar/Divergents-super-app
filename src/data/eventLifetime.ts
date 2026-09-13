// Срок жизни офлайн-события — зеркало серверного lib/event-lifetime.ts.
//
// Сервер уже не отдаёт прошедшие поездки, спорт и мероприятия. Зачем тогда та
// же проверка здесь? Список кэшируется у CDN и в приложении, и утром после
// поездки человек может получить вчерашний ответ, где она ещё есть. Клиентская
// проверка убирает её сразу, не дожидаясь свежего ответа.
//
// Правило то же, что на сервере: событие прошло с полуночи по Алматы после
// последнего дня. Событие без времени встречи не прошло никогда — у него срок
// неизвестен, а не «нулевой».
//
// `meetAt` хранится без часового пояса («2026-09-12 19:00») и означает местное
// время Алматы. Через Date.parse его разбирать нельзя: на телефоне в другом
// поясе (и в Hermes вообще) результат непредсказуем.

/** Алматы — UTC+5. */
export const ALMATY_OFFSET_MS = 5 * 60 * 60 * 1000;
const DAY_MS = 86_400_000;

/** Календарная дата встречи по Алматы: [год, месяц (0–11), день]. */
export function meetAtAlmatyDate(meetAt: string | null | undefined): [number, number, number] | null {
  if (!meetAt) return null;
  const s = String(meetAt).trim();
  const local = s.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T]\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?)?$/);
  if (local) return [Number(local[1]), Number(local[2]) - 1, Number(local[3])];
  const t = Date.parse(s);
  if (!Number.isFinite(t)) return null;
  const d = new Date(t + ALMATY_OFFSET_MS);
  return [d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()];
}

/** С какого момента событие считается прошедшим, мс. `null` — срок неизвестен. */
export function eventHiddenFromMs(meetAt: string | null | undefined, days = 1): number | null {
  const date = meetAtAlmatyDate(meetAt);
  if (!date) return null;
  const [y, m, d] = date;
  const almatyMidnightUtc = Date.UTC(y, m, d) - ALMATY_OFFSET_MS;
  return almatyMidnightUtc + Math.max(1, Math.floor(days) || 1) * DAY_MS;
}

/** Событие уже прошло? Без срока — никогда. */
export function isEventPast(meetAt: string | null | undefined, days = 1, now = Date.now()): boolean {
  const hiddenFrom = eventHiddenFromMs(meetAt, days);
  return hiddenFrom != null && now >= hiddenFrom;
}
