import { Challenge, DEFAULT_CHALLENGE } from '../community';
import { expectedChallengeDay, isChallengeDayLocked, pastDeadlineNow } from '../challengeDay';

// Алматы = UTC+5: 23:00 по Алматы — это 18:00 UTC.
const T = (iso: string) => Date.parse(iso);

const challenge = (over: Partial<Challenge> = {}): Challenge => ({
  ...DEFAULT_CHALLENGE,
  id: 'ch1',
  startISO: '2026-09-05',
  totalDays: 21,
  currentDay: 1,
  ...over,
} as Challenge);

describe('день челленджа на клиенте', () => {
  it('день 1 начинается в 23:01 накануне даты старта', () => {
    const c = challenge();
    // 22:59 Алматы 4 сентября — челлендж ещё не начался, но день не меньше 1.
    expect(expectedChallengeDay(c, T('2026-09-04T17:59:00Z'))).toBe(1);
    // 23:01 Алматы 4 сентября — пошёл день 1.
    expect(expectedChallengeDay(c, T('2026-09-04T18:01:00Z'))).toBe(1);
    // Днём 5 сентября — всё ещё день 1.
    expect(expectedChallengeDay(c, T('2026-09-05T07:00:00Z'))).toBe(1);
  });

  it('день переводится ровно в 23:01, а не в 23:00 и не в полночь', () => {
    const c = challenge({ currentDay: 1 });
    expect(expectedChallengeDay(c, T('2026-09-05T18:00:59Z'))).toBe(1);
    expect(expectedChallengeDay(c, T('2026-09-05T18:01:00Z'))).toBe(2);
    // Полночь ничего не меняет — день уже второй с 23:01.
    expect(expectedChallengeDay(c, T('2026-09-05T19:00:00Z'))).toBe(2);
  });

  it('день не выходит за длительность челленджа', () => {
    const c = challenge({ totalDays: 21, currentDay: 21 });
    expect(expectedChallengeDay(c, T('2026-10-30T10:00:00Z'))).toBe(21);
    // И экран не остаётся заблокированным навсегда после конца.
    expect(isChallengeDayLocked(c, T('2026-10-30T10:00:00Z'))).toBe(false);
  });

  it('отметки закрыты с 23:01 до полуночи', () => {
    const c = challenge({ currentDay: 1 });
    expect(pastDeadlineNow(c, T('2026-09-05T18:00:59Z'))).toBe(false);
    expect(pastDeadlineNow(c, T('2026-09-05T18:01:00Z'))).toBe(true);
    // 00:00 по Алматы = 19:00 UTC — приём открылся снова.
    expect(pastDeadlineNow(c, T('2026-09-05T19:00:00Z'))).toBe(false);
  });

  it('в «мёртвый час» экран заблокирован, даже если сервер уже перевёл день', () => {
    // Сервер отдал currentDay = 2, местное время 23:30 — сервер всё равно
    // откажет по дедлайну, поэтому вводить нельзя.
    const c = challenge({ currentDay: 2 });
    expect(isChallengeDayLocked(c, T('2026-09-05T18:30:00Z'))).toBe(true);
    // После полуночи — можно.
    expect(isChallengeDayLocked(c, T('2026-09-05T19:30:00Z'))).toBe(false);
  });

  it('устаревший день сервера блокирует ввод', () => {
    // Сервер ещё отдаёт день 1, а по часам уже второй: писать нельзя, иначе
    // отметка уйдёт не в тот день.
    const c = challenge({ currentDay: 1 });
    expect(isChallengeDayLocked(c, T('2026-09-06T05:00:00Z'))).toBe(true);
  });

  it('дедлайн берётся из настроек челленджа', () => {
    const c = challenge({ currentDay: 1, rules: { flagsToEliminate: 3, reportDeadlineHour: 20 } });
    // 20:00 Алматы = 15:00 UTC.
    expect(pastDeadlineNow(c, T('2026-09-05T14:59:00Z'))).toBe(false);
    expect(pastDeadlineNow(c, T('2026-09-05T15:01:00Z'))).toBe(true);
  });

  it('демо-челлендж не блокируется', () => {
    expect(isChallengeDayLocked(DEFAULT_CHALLENGE, T('2026-09-05T18:30:00Z'))).toBe(false);
  });
});
