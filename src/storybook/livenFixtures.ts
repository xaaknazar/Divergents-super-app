import { computeAchievements } from '../data/achievementCatalog';
import type { BookListItem } from '../data/books';
import type { ChallengeResults } from '../data/community';
import { FitnessProgram, programStats } from '../data/fitness';

/** Synthetic, development-only fixtures. Never imported by production screens. */
export const demoProgram: FitnessProgram = { id: 'demo-program', title: 'Демо · Неделя движения', unit: 'раз', target: 50,
  days: 7, startKey: '2026-09-01', remindAt: null, createdISO: '2026-09-01T00:00:00Z',
  log: { '2026-09-01': 50, '2026-09-02': 50, '2026-09-03': 25, '2026-09-04': 60, '2026-09-05': 50, '2026-09-06': 50, '2026-09-07': 50 } };
export const demoProgramStats = programStats(demoProgram, new Date(2026, 8, 8));
export const demoBadges = computeAchievements({ lessonsDone: 12, booksRead: 2, programDays: 7 });
export const demoBook: BookListItem = { id: 'demo-book', title: 'Демо · Новая привычка', author: 'Демо-автор', genres: ['Развитие'], comments: 3,
  rating: 4.5, userRating: 4.2, userRatingCount: 8, shelf: { status: 'reading', progress: 35 } };
export const demoResults: ChallengeResults = {
  challenge: { id: 'demo-challenge', title: 'Демо · 21 день развития', seq: 2, startISO: '2026-09-01T00:00:00Z', durationDays: 21,
    countedThroughDay: 21, finished: true, announcedAt: '2026-09-22T00:00:00Z', winnerTeamId: 'demo-team', winnerTeamName: 'Демо-команда' },
  totalMembers: 36,
  me: { points: 650, rank: 4, totalMembers: 36, teamRank: 1, pages: 420, steps: 210000, sugarDays: 18, judgedDays: 21,
    flags: { R: 0, NS: 0, A: 0 }, eliminated: false, left: false, award: false, canClaimAward: true,
    teamPoints: 4200, teamPlace: 1, teamCount: 4, isWinnerTeam: true },
  team: { id: 'demo-team', name: 'Демо-команда', points: 4200, rank: 1, members: 9, pages: 3600, steps: 1600000, sugarDays: 120, isWinner: true },
  teams: [{ id: 'demo-team', name: 'Демо-команда', points: 4200, rank: 1, members: 9, isMine: true }],
  podium: [], overall: [], myDays: [], teamDays: [],
};
