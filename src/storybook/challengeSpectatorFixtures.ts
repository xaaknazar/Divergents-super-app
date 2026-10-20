import type { SpectatorStandings } from '../data/challengeSpectator';
export const spectatorFixture: SpectatorStandings = {
  ok: true, challenge: { id: 'demo-running', title: 'Демо · Активный сезон', currentDay: 3, durationDays: 15 },
  teams: [{ id: 'a', name: 'Демо-север', points: 90, rank: 1, members: 2 }, { id: 'b', name: 'Демо-юг', points: 50, rank: 2, members: 1 }],
  members: [
    { id: 'one', name: 'Демо-А', points: 90, rank: 1, teamRank: 1, teamId: 'a', teamName: 'Демо-север' },
    { id: 'two', name: 'Демо-Б', points: 50, rank: 2, teamRank: 1, teamId: 'b', teamName: 'Демо-юг' },
    { id: 'three', name: 'Демо-В', points: 0, rank: 3, teamRank: 2, teamId: 'a', teamName: 'Демо-север' },
  ],
};
