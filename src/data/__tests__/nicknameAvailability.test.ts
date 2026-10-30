import { checkPublicNickname } from '../nicknameAvailability';
import { checkNicknameAvailable } from '../talentslab';
jest.mock('../talentslab', () => ({ checkNicknameAvailable: jest.fn(), getTalentslabToken: async () => 'talent-token' }));
const originalFetch = global.fetch;
const token = async () => 'site-token';
beforeEach(() => { jest.mocked(checkNicknameAvailable).mockResolvedValue(true); });
afterEach(() => { global.fetch = originalFetch; });
function site(available: unknown) { global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ available }) }); }

it('detects an LMS collision even when Talentslab says available', async () => {
  site(false);
  expect(await checkPublicNickname(token, 'Beknazar')).toBe(false);
  expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/api/mobile/me/nickname?nickname=Beknazar'), expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer site-token' }) }));
});
it('requires both services to confirm availability', async () => {
  site(true);
  expect(await checkPublicNickname(token, 'FreeName')).toBe(true);
  jest.mocked(checkNicknameAvailable).mockResolvedValue(false);
  expect(await checkPublicNickname(token, 'TakenName')).toBe(false);
  jest.mocked(checkNicknameAvailable).mockResolvedValue(null);
  expect(await checkPublicNickname(token, 'FreeName')).toBeNull();
});
it('does not treat malformed JSON or network/auth failure as a free nickname', async () => {
  site(undefined);
  expect(await checkPublicNickname(token, 'FreeName')).toBeNull();
  global.fetch = jest.fn().mockRejectedValue(new Error('offline'));
  expect(await checkPublicNickname(token, 'FreeName')).toBeNull();
  expect(await checkPublicNickname(async () => { throw new Error('session'); }, 'FreeName')).toBeNull();
  jest.mocked(checkNicknameAvailable).mockResolvedValue(false);
  expect(await checkPublicNickname(token, 'TakenName')).toBe(false);
});
