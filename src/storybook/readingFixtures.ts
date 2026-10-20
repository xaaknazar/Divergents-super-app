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
