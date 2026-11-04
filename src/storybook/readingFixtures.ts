import type { ReadingDetail } from '../data/reading';

export const readingFixture: ReadingDetail = {
  id: 'reading-demo', title: 'Одна книга ближе', startDate: '2026-11-01', durationDays: 21,
  phase: 'active', currentDay: 1, serverNow: 1793512800000, dayEnd: 1793559600000,
  membership: 'approved', session: null, reportedSessionIds: [], applications: [], reviewDays: [],
  me: { userId: 'demo-reader', name: 'Читатель', teamId: 'demo-team', flags: 0, completedDays: 0,
    pages: 12, elapsedMs: 1200000, extraMs: 0, eliminatedOn: null,
    history: [{ day: 1, state: 'open', pages: 12, elapsedMs: 1200000 }] },
  ranking: [{ userId: 'demo-reader', name: 'Читатель', teamId: 'demo-team', flags: 0, completedDays: 0,
    pages: 12, elapsedMs: 1200000, extraMs: 0, eliminatedOn: null,
    history: [{ day: 1, state: 'open', pages: 12, elapsedMs: 1200000 }] }],
  teams: [{ id: 'demo-team', name: 'Книжный клуб', capacity: 20, captainId: 'demo-captain', occupied: 12,
    members: 12, completedDays: 0, pages: 148, completionRate: 0 }],
};
export const continuousReadingFixture: ReadingDetail = {
  ...readingFixture, mode: 'continuous', title: 'Каждый день с книгой', currentDay: 12,
  me: { ...readingFixture.me!, completedDays: 10, pages: 320, elapsedMs: 54_000_000, extraMs: 18_000_000,
    averageMinutes: 75, averagePages: 26.7, daysParticipated: 12, firstDay: 1, streak: 4, bestStreak: 6,
    rankingEligible: true, rankingPending: false, qualificationDaysLeft: 0, pace: 'on_target', flags: 1,
    history: Array.from({ length: 12 }, (_, i) => ({ day: i + 1, state: i === 11 ? 'open' : i === 6 ? 'missed' : 'complete',
      pages: i === 6 ? 0 : 30, elapsedMs: i === 6 ? 0 : 4_500_000 })) },
};
continuousReadingFixture.ranking = [continuousReadingFixture.me!];
continuousReadingFixture.teams = [{ ...readingFixture.teams[0], completionRate: 0.83, averageMinutes: 75 }];

const reader = (userId: string, name: string, averagePages: number, readingDays: number, flags: number, extra: Partial<ReadingDetail['ranking'][number]> = {}) => ({
  userId, name, teamId: null, flags, completedDays: readingDays - flags, pages: Math.round(averagePages * 14), elapsedMs: readingDays * 3_900_000,
  extraMs: 0, eliminatedOn: null, averagePages, readingDays, daysParticipated: 14, firstDay: 1, rankingEligible: true, rankingPending: false,
  qualificationDaysLeft: 0, history: [{ day: 14, state: 'open' as const, pages: 12, elapsedMs: 18 * 60000 }], ...extra,
});
/** Индивидуальный зачёт (20.10.2026): без команд, рейтинг по среднему темпу в страницах. */
export const individualReadingFixture: ReadingDetail = {
  ...readingFixture, mode: 'continuous', format: 'individual', title: '"Extreme reading" Challenge', currentDay: 14, teams: [], participants: 5,
  me: reader('demo-reader', 'Акназар', 22.3, 9, 1),
  ranking: [
    reader('r1', 'Аружан', 41, 14, 0), reader('r2', 'Нурлан', 36.5, 13, 1), reader('demo-reader', 'Акназар', 22.3, 9, 1),
    reader('r4', 'Дана', 18, 1, 0, { daysParticipated: 1, pages: 18 }),
    reader('r5', 'Ербол', 30, 11, 2),
  ],
};
export const readingBookExample = { key: 'ol:OL1W', title: 'Атомные привычки', author: 'Джеймс Клир',
  coverId: null, pages: 15, elapsedMs: 25 * 60000, nextPage: null };

export const readingYearHistoryFixture = {
  challengeId: 'reading-year', title: 'Extreme Reading', own: true, generatedAt: Date.parse('2027-10-31T18:00:00Z'),
  reader: { ...continuousReadingFixture.me!, pages: 8240, elapsedMs: 365 * 72 * 60000, completedDays: 348,
    daysParticipated: 365, averagePages: 22.6, bestStreak: 82, readingDays: 360,
    period: { startsAt: Date.parse('2026-10-31T19:00:00Z'), endsAt: Date.parse('2027-10-31T19:00:00Z'), totalDays: 365, personalDay: 365, completed: true } },
  books: [
    { key: '1', title: 'Атомные привычки', author: 'Джеймс Клир', pages: 320, elapsedMs: 12 * 3600000, coverId: null, nextPage: null, lastReadAt: '2027-10-25', finished: true, editable: true },
    { key: '2', title: 'Племя', author: 'Майкл Моррис', pages: 240, elapsedMs: 8 * 3600000, coverId: null, nextPage: null, lastReadAt: '2027-10-26', finished: true, editable: true },
    { key: '3', title: 'Краткая история Японии', author: 'Ричард Мейсон', pages: 120, elapsedMs: 4 * 3600000, coverId: null, nextPage: null, lastReadAt: '2027-10-30', finished: false, editable: true },
  ],
};

/** Год в процессе: 84-й личный день, реалистичный дневник (норма, недочитанные дни, флаги, снятый флаг, сегодня). */
const activeDays = 84;
const activeHistory = Array.from({ length: activeDays }, (_, i) => {
  const day = i + 1;
  if (day === activeDays) return { day, state: 'open' as const, pages: 9, elapsedMs: 25 * 60000 };
  const missed = [12, 13, 31, 47, 58, 70].includes(day), partial = [13, 47].includes(day);
  const pages = missed ? partial ? 8 : 0 : 14 + ((day * 7) % 19);
  return { day, state: missed ? 'missed' as const : 'complete' as const, pages,
    elapsedMs: missed ? partial ? 25 * 60000 : 0 : (60 + (day * 11) % 35) * 60000,
    ...(day === 12 ? { flagForgivenOn: 18 } : {}), ...(day === 18 ? { flagForgivenForDay: 12 } : {}) };
});
export const readingActiveYearFixture = {
  challengeId: 'reading-year', title: 'Extreme Reading', own: true, generatedAt: Date.parse('2027-01-22T09:00:00Z'),
  reader: { ...continuousReadingFixture.me!, firstDay: 1, history: activeHistory,
    pages: activeHistory.reduce((s, d) => s + d.pages, 0), elapsedMs: activeHistory.reduce((s, d) => s + d.elapsedMs, 0),
    completedDays: activeHistory.filter(d => d.state === 'complete').length, daysParticipated: activeDays, flags: 5 - 1,
    averagePages: activeHistory.reduce((s, d) => s + d.pages, 0) / activeDays, bestStreak: 23, streak: 13,
    readingDays: activeHistory.filter(d => d.elapsedMs > 0).length,
    flagRecovery: { requiredDays: 5, progressDays: 3, daysRemaining: 2, earnedFlags: 5, forgivenFlags: 1 },
    period: { startsAt: Date.parse('2026-10-31T19:00:00Z'), endsAt: Date.parse('2027-10-31T19:00:00Z'), totalDays: 365, personalDay: activeDays, completed: false } },
  books: [
    { key: 'ol:1', title: 'Атомные привычки', author: 'Джеймс Клир', pages: 320, elapsedMs: 12 * 3600000, coverId: null, nextPage: null, lastReadAt: '2026-12-02', finished: true, editable: true },
    { key: 'ol:2', title: 'Племя', author: 'Майкл Моррис', pages: 412, elapsedMs: 19 * 3600000, coverId: null, nextPage: null, lastReadAt: '2027-01-06', finished: true, editable: true },
    { key: 'ol:3', title: 'Краткая история Японии', author: 'Ричард Мейсон', pages: 731, elapsedMs: 41 * 3600000, coverId: null, nextPage: 214, lastReadAt: '2027-01-22', finished: false, editable: true },
  ],
};
