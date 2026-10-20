import { BADGES, computeAchievements } from '../achievementCatalog';
import { applyAchievementUpdate, challengeAchievementUpdate, emptyAchievementLedger, fitnessAchievementUpdate, ledgerStats, longestDayStreak, normalizeAchievementLedger } from '../achievementProgress';
import { captureAchievementRecorder, connectAchievements, stopAchievementSession } from '../achievementEvents';
import type { FitnessProgram } from '../fitness';

const now = new Date('2026-09-30T12:00:00Z');
const program = (patch: Partial<FitnessProgram> = {}): FitnessProgram => ({ id: 'p', title: 'Зарядка', unit: 'мин', target: 10, days: 30, startKey: '2026-09-01', remindAt: null, createdISO: '2026-09-01T12:00:00Z', log: {}, ...patch });
const thirtyDays = Object.fromEntries(Array.from({ length: 30 }, (_, i) => [`2026-09-${String(i + 1).padStart(2, '0')}`, 10]));
beforeEach(() => { jest.useFakeTimers(); jest.setSystemTime(now); });
afterEach(() => { jest.useRealTimers(); stopAchievementSession(); });

it('has distinct reachable badges across every requested category', () => {
  expect(BADGES.length).toBeGreaterThanOrEqual(45);
  expect(new Set(BADGES.map(b => b.id)).size).toBe(BADGES.length);
  expect(new Set(BADGES.map(b => b.category)).size).toBe(7);
  expect(BADGES.every(b => b.goal > 0 && b.desc && b.icon)).toBe(true);
  expect(computeAchievements({}).some(b => b.earned)).toBe(false);
});

it.each([NaN, Infinity, -5])('never awards from invalid progress %s', n => {
  const badges = computeAchievements({ lessonsDone: n, programStreak: n });
  expect(badges.every(b => b.progress >= 0 && b.progress <= 1 && !b.earned)).toBe(true);
});

it('deduplicates repeated actions and backfill; unlocked date is immutable', () => {
  const first = applyAchievementUpdate(emptyAchievementLedger(), { facts: { lessonsDone: ['course:lesson', 'course:lesson'] } }, '2026-09-01T12:00:00Z');
  expect(first.newIds).toEqual(['first-step']);
  const repeat = applyAchievementUpdate(first.ledger, { silent: true, facts: { lessonsDone: ['course:lesson'] } });
  expect(repeat.newIds).toEqual([]);
  expect(repeat.ledger).toBe(first.ledger);
  expect(ledgerStats(repeat.ledger).lessonsDone).toBe(1);
  expect(repeat.ledger.unlocked['first-step']).toBe('2026-09-01T12:00:00Z');
});

it('does not revoke an award when an API returns empty or a workout is removed', () => {
  const first = applyAchievementUpdate(emptyAchievementLedger(), { facts: { workoutsDone: ['w'] } });
  const next = applyAchievementUpdate(first.ledger, { facts: { workoutsDone: [] }, maxima: { workoutsDone: 0 } });
  expect(next.ledger).toBe(first.ledger);
  expect(computeAchievements(ledgerStats(next.ledger), next.ledger.unlocked).find(b => b.id === 'workout-1')?.earned).toBe(true);
});

it('counts the same book once after shelf removal/re-add and review edits', () => {
  let ledger = emptyAchievementLedger();
  for (let i = 0; i < 8; i++) ledger = applyAchievementUpdate(ledger, { facts: { booksRead: ['book-1'], bookReviews: ['book-1'] } }).ledger;
  expect(ledgerStats(ledger)).toMatchObject({ booksRead: 1, bookReviews: 1 });
  expect(ledger.unlocked['book-5']).toBeUndefined();
});

it('restores validated persisted progress and ignores malformed payloads', () => {
  expect(normalizeAchievementLedger(null)).toEqual(emptyAchievementLedger());
  const value = normalizeAchievementLedger({ version: 1, facts: { booksRead: ['one', 'one', null, '', 8] }, maxima: { programStreak: NaN }, unlocked: { 'book-1': 'bad-date', 'unknown-award': '2026-01-01' } });
  expect(value.facts.booksRead).toEqual(['one']);
  expect(value.unlocked).toEqual({});
  expect(value.maxima.programStreak).toBeUndefined();
});

it('awards the 30-day streak immediately on day 30, not when a program is merely created', () => {
  const empty = fitnessAchievementUpdate([program()], [], [], now);
  expect(empty.facts?.programDays).toEqual([]);
  let ledger = applyAchievementUpdate(emptyAchievementLedger(), empty).ledger;
  expect(ledger.unlocked['program-1']).toBeTruthy();
  expect(ledger.unlocked['training-streak-30']).toBeUndefined();
  ledger = applyAchievementUpdate(ledger, fitnessAchievementUpdate([program({ log: thirtyDays })], [], [], now)).ledger;
  expect(ledgerStats(ledger).programStreak).toBe(30);
  expect(ledger.unlocked['training-streak-30']).toBeTruthy();
  expect(ledger.unlocked['program-finish']).toBeTruthy();
});

it('rejects future marks, short results, invalid targets and out-of-program days', () => {
  const update = fitnessAchievementUpdate([program({ log: { ...thirtyDays, '2026-08-31': 100 }, target: 11 }), program({ id: 'bad', target: 0, log: thirtyDays })], [], [], new Date('2026-09-10T12:00:00Z'));
  expect(update.facts?.programDays).toEqual([]);
  expect(update.facts?.programsCompleted).toEqual([]);
  expect(fitnessAchievementUpdate([program({ log: thirtyDays })], [], [], new Date('2026-09-10T12:00:00Z')).facts?.programDays).toHaveLength(10);
});

it('one missed day breaks a streak even when other days exceed their target', () => {
  const log = { ...thirtyDays, '2026-09-15': 9, '2026-09-16': 100 };
  const update = fitnessAchievementUpdate([program({ log })], [], [], now);
  const ledger = applyAchievementUpdate(emptyAchievementLedger(), update).ledger;
  expect(ledgerStats(ledger).programStreak).toBe(15);
  expect(ledger.unlocked['training-streak-30']).toBeUndefined();
  expect(ledger.unlocked['program-finish']).toBeUndefined();
});

it('multiple programs on one day count once; consecutive programs can continue the habit', () => {
  const a = program({ days: 14, log: thirtyDays });
  const b = program({ id: 'b', startKey: '2026-09-15', days: 16, log: thirtyDays });
  const update = fitnessAchievementUpdate([a, b, program({ id: 'duplicate', log: thirtyDays })], [], [], now);
  expect(update.facts?.programDays).toHaveLength(30);
  expect(longestDayStreak(update.facts!.programDays!, '2026-09-30')).toBe(30);
});

it('streaks cross month/year/leap day and do not depend on DST or repeated marks', () => {
  expect(longestDayStreak(['2026-12-31', '2027-01-01', '2027-01-01', '2027-01-02'], '2027-01-02')).toBe(3);
  expect(longestDayStreak(['2024-02-28', '2024-02-29', '2024-03-01'], '2024-03-01')).toBe(3);
  expect(longestDayStreak(['2026-03-07', '2026-03-08', '2026-03-09'], '2026-03-09')).toBe(3);
  expect(longestDayStreak(['2026-02-30', 'invalid', '2028-01-01'], '2026-09-30')).toBe(0);
});

it('does not count too-short, future or invalid saved workouts', () => {
  const workouts = [299, 300, 600, NaN].map((durationSec, i) => ({ id: String(i), durationSec, dateISO: '2026-09-29T12:00:00Z' }));
  workouts.push({ id: 'future', durationSec: 900, dateISO: '2027-01-01T12:00:00Z' });
  expect(fitnessAchievementUpdate([], workouts as any, [], now).facts?.workoutsDone).toEqual(['1', '2']);
});

it('does not award a finisher or podium to spectators, pending or disqualified participants', () => {
  const entry = { challengeId: 'c', status: 'approved', finished: false, currentDay: 30, durationDays: 30, result: { eliminated: false, left: false, teamRank: 1 } };
  const facts = (h: any[]) => challengeAchievementUpdate(h).facts;
  expect(facts([])?.challengeJoined).toEqual([]);
  expect(facts([{ ...entry, status: 'pending' }])?.challengeJoined).toEqual([]);
  expect(facts([entry])?.challengeFinished).toEqual([]);
  expect(facts([entry])?.rankTop3).toEqual([]);
  expect(facts([{ ...entry, finished: true, result: { ...entry.result, eliminated: true } }])?.rankTop3).toEqual([]);
  expect(facts([{ ...entry, finished: true }])?.challengeFinished).toEqual(['c']);
});

it('isolates late responses across accounts and repeated logins; cleanup cannot disconnect a newer session', () => {
  const a = jest.fn(), b = jest.fn();
  const disconnectA = connectAchievements('a', a);
  const oldRecord = captureAchievementRecorder();
  const disconnectB = connectAchievements('b', b);
  disconnectA();
  oldRecord({ facts: { booksRead: ['old'] } });
  captureAchievementRecorder()({ facts: { booksRead: ['new'] } });
  expect(a).not.toHaveBeenCalled();
  expect(b).toHaveBeenCalledTimes(1);
  disconnectB();
  connectAchievements('a', a);
  oldRecord({ facts: { booksRead: ['old'] } });
  expect(a).not.toHaveBeenCalled();
  expect(stopAchievementSession()).toBe('a');
});
