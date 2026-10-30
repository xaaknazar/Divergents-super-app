import { FitnessProgram, programStats, shiftKey } from '../fitness';
import { programHistory, programMilestones, programShareCard, programPeriod, programNumber } from '../programResults';

const p = (patch: Partial<FitnessProgram> = {}): FitnessProgram => ({ id: 'p', title: 'Отжимания', unit: 'раз', days: 7, target: 50, startKey: '2026-09-01', createdISO: '2026-09-01T09:00:00Z', remindAt: null, log: {}, ...patch });
const ended = new Date('2026-10-01T12:00:00');
it('uses readable grouping with the iOS brand font', () => { expect(programNumber(1500)).toBe('1 500'); });

it('sums actual repetitions including partial days and extra effort, not target times duration', () => {
  const s = programStats(p({ log: { '2026-09-01': 50, '2026-09-02': 20, '2026-09-03': 75 } }), ended);
  expect(s).toMatchObject({ total: 145, activeDays: 3, done: 2, bestDay: 75, bestStreak: 1 });
});
it('50 per day for 30 days is 1500, with a 30-day personal record', () => {
  const a = p({ days: 30, log: Object.fromEntries(Array.from({ length: 30 }, (_, i) => [shiftKey('2026-09-01', i), 50])) });
  const s = programStats(a, ended);
  expect(s).toMatchObject({ total: 1500, bestStreak: 30, activeDays: 30, done: 30, finished: true });
  expect(programMilestones(a, s).map(b => b.id)).toEqual(['perfect', 'streak']);
});
it('best streak survives a missed last day; unfinished days do not become success badges', () => {
  const a = p({ log: { '2026-09-01': 50, '2026-09-02': 50, '2026-09-03': 50 } });
  const s = programStats(a, ended);
  expect(s.streak).toBe(0);
  expect(s.bestStreak).toBe(3);
  expect(programMilestones(a, s).map(b => b.id)).toEqual(['streak']);
});
it('excludes outside-program, future, negative and non-finite values', () => {
  const a = p({ log: { '2026-08-31': 500, '2026-09-01': 50, '2026-09-02': -30, '2026-09-03': NaN, '2026-09-04': Infinity, '2026-09-05': 1000, '2026-09-09': 500 } });
  expect(programStats(a, new Date('2026-09-04T12:00:00'))).toMatchObject({ total: 50, activeDays: 1, bestDay: 50 });
});
it('finishes immediately after the last daily mark, not before and not because of future logs', () => {
  const a = p({ log: { '2026-09-07': 50 } });
  expect(programStats(a, new Date('2026-09-06T23:59:59')).finished).toBe(false);
  expect(programStats(a, new Date('2026-09-07T10:00:00')).finished).toBe(true);
  expect(programStats(p(), new Date('2026-09-07T23:59:59')).finished).toBe(false);
  expect(programStats(p(), new Date('2026-09-08T00:00:00')).finished).toBe(true);
});
it('old persisted records become history automatically, sorted by actual end date', () => {
  const a = p({ id: 'early' }), b = p({ id: 'late', startKey: '2026-09-20' }), c = p({ id: 'active', startKey: '2026-10-01' });
  expect(programHistory([a, c, b], ended).map(r => r.p.id)).toEqual(['late', 'early']);
  expect(programHistory([a, c, b], new Date('2027-01-01T12:00:00')).find(r => r.p.id === 'early')?.s.total).toBe(0);
});
it('share uses the same real totals, original dates and longest streak as the result', () => {
  const a = p({ unit: 'мин', log: { '2026-09-01': 2.5, '2026-09-02': 3.25 } });
  const card = programShareCard(a, programStats(a, ended));
  expect(card.stats[0]).toEqual({ l: 'Всего за программу', v: '5,75 мин' });
  expect(card.stats[1].v).toBe('0 из 7');
  expect(card.caption).toContain(programPeriod(a));
  expect(card.caption).not.toContain('Без пропусков');
});
it('no activity earns no invented awards', () => {
  expect(programMilestones(p(), programStats(p(), ended))).toEqual([]);
});
