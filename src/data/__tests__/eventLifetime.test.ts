// Когда событие уходит из ленты. Границы здесь коварные: время встречи хранится
// без пояса и означает Алматы, а ошибка на один день не видна глазу — поездка
// просто исчезнет на сутки раньше или позже, и никто не поймёт почему.
import { eventHiddenFromMs, isEventPast, meetAtAlmatyDate } from '../eventLifetime';

// Алматы = UTC+5: полночь 13 сентября по Алматы — это 19:00 UTC 12 сентября.
const T = (iso: string) => Date.parse(iso);

describe('дата встречи по Алматы', () => {
  it('строка без пояса — это местная дата, и часы её не сдвигают', () => {
    // Приложение пишет с пробелом, админка — с T. Вечер остаётся тем же днём.
    expect(meetAtAlmatyDate('2026-09-12 19:00')).toEqual([2026, 8, 12]);
    expect(meetAtAlmatyDate('2026-09-12T23:30')).toEqual([2026, 8, 12]);
    expect(meetAtAlmatyDate('2026-09-12T19:00:00')).toEqual([2026, 8, 12]);
    expect(meetAtAlmatyDate('2026-09-12')).toEqual([2026, 8, 12]);
  });

  it('строка с поясом переводится в Алматы', () => {
    // 21:00 UTC 12 сентября = 02:00 13 сентября по Алматы.
    expect(meetAtAlmatyDate('2026-09-12T21:00:00Z')).toEqual([2026, 8, 13]);
  });

  it('пусто или мусор — срока нет', () => {
    expect(meetAtAlmatyDate('')).toBeNull();
    expect(meetAtAlmatyDate(null)).toBeNull();
    expect(meetAtAlmatyDate('12–14 июля')).toBeNull();
  });
});

describe('когда событие прошло', () => {
  it('однодневное — с полуночи по Алматы после дня встречи', () => {
    const hidden = eventHiddenFromMs('2026-09-12 19:00', 1);
    expect(hidden).toBe(T('2026-09-12T19:00:00Z')); // 00:00 13 сентября Алматы
    expect(isEventPast('2026-09-12 19:00', 1, T('2026-09-12T18:59:00Z'))).toBe(false);
    expect(isEventPast('2026-09-12 19:00', 1, T('2026-09-12T19:00:00Z'))).toBe(true);
  });

  it('в момент встречи и вечером того же дня ещё не прошло', () => {
    // 19:30 по Алмату 12 сентября = 14:30 UTC — люди только собрались.
    expect(isEventPast('2026-09-12 19:00', 1, T('2026-09-12T14:30:00Z'))).toBe(false);
  });

  it('трёхдневная поездка живёт до полуночи после третьего дня', () => {
    // Старт 12-го, дни 12, 13, 14 → скрыть с 00:00 15-го Алматы = 19:00 UTC 14-го.
    expect(eventHiddenFromMs('2026-09-12 08:00', 3)).toBe(T('2026-09-14T19:00:00Z'));
    expect(isEventPast('2026-09-12 08:00', 3, T('2026-09-14T18:00:00Z'))).toBe(false);
    expect(isEventPast('2026-09-12 08:00', 3, T('2026-09-14T19:00:00Z'))).toBe(true);
  });

  it('ноль или мусор в днях считаются одним днём', () => {
    expect(eventHiddenFromMs('2026-09-12 08:00', 0)).toBe(eventHiddenFromMs('2026-09-12 08:00', 1));
    expect(eventHiddenFromMs('2026-09-12 08:00', NaN)).toBe(eventHiddenFromMs('2026-09-12 08:00', 1));
  });

  it('без времени встречи не прошло никогда', () => {
    expect(isEventPast(null, 1, T('2030-01-01T00:00:00Z'))).toBe(false);
    expect(isEventPast('', 3, T('2030-01-01T00:00:00Z'))).toBe(false);
  });
});
