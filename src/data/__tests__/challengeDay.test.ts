import { Challenge, DEFAULT_CHALLENGE } from '../community';
import { expectedChallengeDay, isChallengeDayLocked, pastDeadlineNow, challengeDayStartMs, marksClosed } from '../challengeDay';

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

// Начало дня нужно, чтобы спросить у шагомера шаги «за сегодня». Ошибка здесь
// не видна на глаз: число просто окажется чужим — либо потеряется вечер
// накануне, либо в день попадут шаги из позавчера.
describe('начало дня челленджа', () => {
  it('днём отсчёт идёт от 23:01 ПРЕДЫДУЩИХ суток', () => {
    const c = challenge();
    // Полдень 6 сентября по Алматы = 07:00 UTC.
    expect(challengeDayStartMs(c, T('2026-09-06T07:00:00Z')))
      .toBe(T('2026-09-05T18:01:00Z'));
  });

  it('в 23:01 начинается новый день, а в 23:00 — ещё старый', () => {
    const c = challenge();
    expect(challengeDayStartMs(c, T('2026-09-05T18:00:59Z')))
      .toBe(T('2026-09-04T18:01:00Z'));
    expect(challengeDayStartMs(c, T('2026-09-05T18:01:00Z')))
      .toBe(T('2026-09-05T18:01:00Z'));
  });

  it('после полуночи день не перезапускается', () => {
    const c = challenge();
    // 00:30 по Алматы 6 сентября = 19:30 UTC 5 сентября. День начался в 23:01
    // накануне, календарная полночь его не делит.
    expect(challengeDayStartMs(c, T('2026-09-05T19:30:00Z')))
      .toBe(T('2026-09-05T18:01:00Z'));
  });

  it('учитывает дедлайн из настроек челленджа', () => {
    const c = challenge({ rules: { flagsToEliminate: 3, reportDeadlineHour: 20 } as any });
    // Дедлайн 20:00 → день переводится в 20:01 Алматы = 15:01 UTC.
    expect(challengeDayStartMs(c, T('2026-09-06T07:00:00Z')))
      .toBe(T('2026-09-05T15:01:00Z'));
  });
});

// ─── Кому отметки уже закрыты ────────────────────────────────────────────────
// Белый флаг 🏳️ и вылет замораживают зачёт так же надёжно, как закрытый день.
// Проверяем именно это: экран записи тренировки предлагал вышедшему «добавить
// шаги в челлендж», сервер отказывал, и отметка откатывалась у него на глазах.
describe('отметки закрыты', () => {
  // Полдень 6 сентября по Алматы — день идёт, дедлайн далеко.
  const noon = T('2026-09-06T07:00:00Z');

  it('днём у обычного участника отметки открыты', () => {
    expect(marksClosed(challenge({ currentDay: 2 }), noon)).toBe(false);
  });

  it('после 23:01 закрыты для всех', () => {
    expect(marksClosed(challenge({ currentDay: 2 }), T('2026-09-06T18:01:00Z'))).toBe(true);
  });

  it('вышедшему по белому флагу — закрыты, даже в разгар дня', () => {
    const c = challenge({ currentDay: 2, whiteFlag: { raised: true, reason: null, left: true, leftDay: 2 } } as any);
    expect(marksClosed(c, noon)).toBe(true);
  });

  it('поднятый флаг без выхода ничего не закрывает: человек ещё в игре', () => {
    const c = challenge({ currentDay: 2, whiteFlag: { raised: true, reason: 'травма', left: false, leftDay: null } } as any);
    expect(marksClosed(c, noon)).toBe(false);
  });

  it('выбывшему по трём флагам — закрыты', () => {
    expect(marksClosed(challenge({ currentDay: 2, eliminated: true } as any), noon)).toBe(true);
  });
});
