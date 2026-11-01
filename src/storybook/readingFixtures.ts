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
