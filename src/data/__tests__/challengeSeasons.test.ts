import { fetchSeasonChampion } from '../challengeSeasons';
import { fetchSpectatorStandings } from '../challengeSpectator';
import { spectatorFixture } from '../../storybook/challengeSpectatorFixtures';
jest.mock('../challengeSpectator', () => ({ fetchSpectatorStandings: jest.fn() }));
const standings = jest.mocked(fetchSpectatorStandings);
const season = { id: 'finished', title: 'Сезон 2', season: 2, startISO: null, finished: true };
const result = { ...spectatorFixture, challenge: { ...spectatorFixture.challenge, id: season.id, finished: true }, teams: [
  { id: 'second', name: 'Вторые', rank: 2, points: 20, members: 2 },
  { id: 'winner', name: 'Победители', rank: 1, points: 30, members: 2 },
] };
beforeEach(() => standings.mockReset().mockResolvedValue(result));
it('uses final server rank rather than response order and forwards cancellation', async () => {
  const signal = new AbortController().signal;
  await expect(fetchSeasonChampion(season, 'token', signal)).resolves.toEqual({ id: 'winner', name: 'Победители' });
  expect(standings).toHaveBeenCalledWith(season.id, 'token', signal);
});
it('does not load or crown the current season', async () => {
  await expect(fetchSeasonChampion({ ...season, finished: false }, 'token')).resolves.toBeNull();
  expect(standings).not.toHaveBeenCalled();
});
it('rejects a live ranking even when the catalog says finished', async () => {
  standings.mockResolvedValue({ ...result, challenge: { ...result.challenge, finished: false } });
  await expect(fetchSeasonChampion(season, 'token')).resolves.toBeNull();
});
it.each([{ teams: [] }, { teams: [{ id: 'empty', name: 'Без результата', rank: 1, points: 0, members: 0 }] }])('does not invent a champion with no winning result', async ({ teams }) => {
  standings.mockResolvedValue({ ...result, teams });
  await expect(fetchSeasonChampion(season, 'token')).resolves.toBeNull();
});
