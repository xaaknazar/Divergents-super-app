import type { ChallengeResults, OverallStanding } from '../data/community';
import { demoResults } from './livenFixtures';

const member = (id: string, name: string, teamId: string, rank: number, points: number): OverallStanding => ({
  id, name, teamId, teamName: teamId === 'mine' ? 'Демо-команда' : 'Демо-лидеры',
  rank, points, day: 0, flags: { R: 0, NS: 0, A: 0 }, eliminated: false, left: false, isMe: id === 'me',
});

/** Synthetic final results, deliberately different from any active challenge. */
export const finalResultsFixture: ChallengeResults = {
  ...demoResults,
  challenge: { ...demoResults.challenge, id: 'finished-season', title: 'Демо · Завершённый сезон', winnerTeamId: 'other', winnerTeamName: 'Демо-лидеры' },
  totalMembers: 5,
  me: { ...demoResults.me!, rank: 2, points: 776, pages: 365, steps: 165657, sugarDays: 15, teamRank: 1, canClaimAward: false, isWinnerTeam: false },
  team: { ...demoResults.team!, id: 'mine', rank: 2, points: 824, members: 3, isWinner: false },
  teams: [
    { id: 'other', name: 'Демо-лидеры', rank: 1, points: 3028, members: 2, isMine: false },
    { id: 'mine', name: 'Демо-команда', rank: 2, points: 824, members: 3, isMine: true },
  ],
  overall: [
    member('leader', 'Демо-лидер', 'other', 1, 2428),
    member('me', 'Демо-участник', 'mine', 2, 776),
    member('other-member', 'Демо-соперник', 'other', 3, 600),
    { ...member('left', 'Демо · Белый флаг', 'mine', 4, 48), left: true },
    { ...member('eliminated', 'Демо · Выбыл', 'mine', 5, 0), eliminated: true },
  ],
};
