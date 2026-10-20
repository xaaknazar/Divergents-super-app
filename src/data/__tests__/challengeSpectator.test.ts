import { fetchSpectatorStandings } from '../challengeSpectator';
import { netFetch } from '../net';
import { ReadAccessError } from '../readAccessError';
import { spectatorFixture } from '../../storybook/challengeSpectatorFixtures';
jest.mock('../net', () => ({ netFetch: jest.fn() }));
const fetchMock = jest.mocked(netFetch);
beforeEach(() => jest.clearAllMocks());
it('requires authentication without sending an anonymous request', async () => {
  await expect(fetchSpectatorStandings('season', null)).rejects.toBeInstanceOf(ReadAccessError);
  expect(fetchMock).not.toHaveBeenCalled();
});
it.each([401, 403, 404])('surfaces %s as access revocation, not a transient network error', async status => {
  fetchMock.mockResolvedValue({ ok: false, status } as Response);
  await expect(fetchSpectatorStandings('season', 'token')).rejects.toBeInstanceOf(ReadAccessError);
});
it('uses a read-only bounded request and discards fields outside the public ranking contract', async () => {
  const data = { ...spectatorFixture, private: 'hidden', members: spectatorFixture.members.map(m => ({ ...m, email: 'hidden' })) };
  fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => data } as Response);
  const result = await fetchSpectatorStandings(data.challenge.id, 'token');
  expect(result).toEqual(spectatorFixture);
  expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('/standings'), expect.objectContaining({ timeoutMs: 12000, retries: 0 }));
});
it('rejects responses for another challenge', async () => {
  fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => spectatorFixture } as Response);
  await expect(fetchSpectatorStandings('different', 'token')).rejects.toThrow('Unexpected challenge');
});
