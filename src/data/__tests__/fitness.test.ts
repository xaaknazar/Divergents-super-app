// Рекорды и прогресс целей — чистые правила, которые легко перепутать: темп
// «лучше» — это меньше, а рекорд темпа не должен доставаться спринту на 200 м.
import { computeRecords, goalProgress, metricBest, goalValueText, FitnessMetric } from '../fitness';
import type { Workout } from '../../state/ActivityContext';

const NOW = Date.parse('2026-09-07T10:00:00Z');
const day = (d: number) => new Date(NOW - d * 86_400_000).toISOString();

function w(over: Partial<Workout>): Workout {
  return { id: over.id ?? String(Math.random()), type: 'run', dateISO: day(1), distanceM: 5000, durationSec: 1800, steps: 5000, coords: [], ...over };
}

describe('рекорды', () => {
  it('самая длинная пробежка и ходьба — отдельно', () => {
    const r = computeRecords([w({ id: 'a', distanceM: 5000 }), w({ id: 'b', distanceM: 8000 }), w({ id: 'c', type: 'walk', distanceM: 12_000 })], NOW);
    expect(r.longestRun?.id).toBe('b');
    expect(r.longestWalk?.id).toBe('c');
    expect(r.runs).toBe(2);
    expect(r.walks).toBe(1);
    expect(r.totalM).toBe(25_000);
  });

  it('темп — только на пробежке от километра', () => {
    const r = computeRecords([
      w({ id: 'sprint', distanceM: 300, durationSec: 60 }),      // 3:20/км — но 300 м
      w({ id: 'run', distanceM: 5000, durationSec: 1500 }),     // 5:00/км
      w({ id: 'slow', distanceM: 6000, durationSec: 2400 }),    // 6:40/км
    ], NOW);
    expect(r.fastestRun?.id).toBe('run');
  });

  it('темп считается по времени в движении', () => {
    const r = computeRecords([
      w({ id: 'a', distanceM: 5000, durationSec: 1800, movingSec: 1500 }),  // 5:00 в движении
      w({ id: 'b', distanceM: 5000, durationSec: 1600 }),                    // 5:20
    ], NOW);
    expect(r.fastestRun?.id).toBe('a');
  });

  it('километры за неделю — только последние 7 дней', () => {
    const r = computeRecords([w({ distanceM: 3000, dateISO: day(1) }), w({ distanceM: 4000, dateISO: day(6) }), w({ distanceM: 10_000, dateISO: day(9) })], NOW);
    expect(r.weekM).toBe(7000);
  });
});

describe('прогресс целей', () => {
  const records = computeRecords([w({ distanceM: 6000, durationSec: 2160 })], NOW); // 6 км, 6:00/км

  it('дистанция: доля от цели', () => {
    const p = goalProgress({ id: '1', kind: 'run_distance', title: '', target: 10_000, createdISO: '' }, records, []);
    expect(p.current).toBe(6000);
    expect(p.ratio).toBeCloseTo(0.6);
    expect(p.done).toBe(false);
  });

  it('темп: лучше — значит меньше, доля считается наоборот', () => {
    const p = goalProgress({ id: '1', kind: 'run_pace', title: '', target: 300, createdISO: '' }, records, []); // цель 5:00
    expect(p.current).toBe(360);
    expect(p.ratio).toBeCloseTo(300 / 360);
    expect(p.done).toBe(false);
    const done = goalProgress({ id: '1', kind: 'run_pace', title: '', target: 400, createdISO: '' }, records, []);
    expect(done.done).toBe(true);
  });

  it('свой показатель: максимум и минимум', () => {
    const pull: FitnessMetric = { id: 'p', name: 'Подтягивания', unit: 'раз', direction: 'max', entries: [{ dateISO: day(3), value: 8 }, { dateISO: day(1), value: 11 }] };
    const weight: FitnessMetric = { id: 'w', name: 'Вес', unit: 'кг', direction: 'min', entries: [{ dateISO: day(3), value: 84 }, { dateISO: day(1), value: 81 }] };
    expect(metricBest(pull)).toBe(11);
    expect(metricBest(weight)).toBe(81);
    expect(goalProgress({ id: '1', kind: 'metric', metricId: 'p', title: '', target: 15, createdISO: '' }, records, [pull]).ratio).toBeCloseTo(11 / 15);
    expect(goalProgress({ id: '1', kind: 'metric', metricId: 'w', title: '', target: 78, createdISO: '' }, records, [weight]).ratio).toBeCloseTo(78 / 81);
  });

  it('подписи значений', () => {
    expect(goalValueText('run_distance', 10_000)).toBe('10 км');
    expect(goalValueText('run_distance', 7500)).toBe('7,5 км');
    expect(goalValueText('run_pace', 330)).toBe('5:30 /км');
    expect(goalValueText('metric', 12, 'раз')).toBe('12 раз');
  });
});

// Программы: «30 отжиманий, 21 день». Ошибиться легко в границах: какой день
// сегодня, что считать пропуском, откуда считать серию.
import { programStats, dayKey, shiftKey, daysBetween, FitnessProgram } from '../fitness';

function program(over: Partial<FitnessProgram> = {}): FitnessProgram {
  return { id: 'p', title: 'Отжимания', unit: 'раз', target: 30, days: 21, startKey: '2026-09-01', remindAt: null, log: {}, createdISO: '', ...over };
}
const at = (iso: string) => new Date(iso); // местное время машины тестов

describe('программы', () => {
  it('ключи дней и сдвиги', () => {
    expect(dayKey(at('2026-09-07T10:00:00'))).toBe('2026-09-07');
    expect(shiftKey('2026-09-01', 20)).toBe('2026-09-21');
    expect(shiftKey('2026-08-30', 3)).toBe('2026-09-02');
    expect(daysBetween('2026-09-01', '2026-09-07')).toBe(6);
  });

  it('сегодня — седьмой день; сделанные, пропущенные и будущие', () => {
    const p = program({ log: { '2026-09-01': 30, '2026-09-02': 30, '2026-09-03': 12, '2026-09-05': 40 } });
    const s = programStats(p, at('2026-09-07T09:00:00'));
    expect(s.dayIndex).toBe(7);
    expect(s.finished).toBe(false);
    expect(s.done).toBe(3);                // 1, 2, 5
    expect(s.missed).toBe(3);              // 3 (12 < 30), 4, 6
    expect(s.todayDone).toBe(false);
    expect(s.grid[6].state).toBe('today');
    expect(s.grid[7].state).toBe('future');
    expect(s.grid[2].state).toBe('missed');
  });

  it('серия считается от сегодня, если сделано, иначе от вчера', () => {
    const base = { '2026-09-04': 30, '2026-09-05': 30, '2026-09-06': 30 };
    expect(programStats(program({ log: base }), at('2026-09-07T09:00:00')).streak).toBe(3);
    expect(programStats(program({ log: { ...base, '2026-09-07': 30 } }), at('2026-09-07T09:00:00')).streak).toBe(4);
    expect(programStats(program({ log: { ...base, '2026-09-07': 30 } }), at('2026-09-07T09:00:00')).todayDone).toBe(true);
  });

  it('частичный результат сегодня — не пропуск и не выполнено', () => {
    const s = programStats(program({ log: { '2026-09-07': 10 } }), at('2026-09-07T20:00:00'));
    expect(s.grid[6].state).toBe('partial');
    expect(s.todayValue).toBe(10);
  });

  it('после последнего дня программа завершена, серия не растёт', () => {
    const s = programStats(program({ days: 3, log: { '2026-09-01': 30, '2026-09-02': 30, '2026-09-03': 30 } }), at('2026-09-10T09:00:00'));
    expect(s.finished).toBe(true);
    expect(s.done).toBe(3);
    expect(s.missed).toBe(0);
    expect(s.streak).toBe(3);
  });

  it('до старта — день 0, ничего не пропущено', () => {
    const s = programStats(program({ startKey: '2026-09-10' }), at('2026-09-07T09:00:00'));
    expect(s.dayIndex).toBeLessThan(1);
    expect(s.missed).toBe(0);
  });
});
