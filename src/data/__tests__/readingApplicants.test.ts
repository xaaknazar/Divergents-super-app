import { fetchReadingApplicant } from '../readingApplicants';
import { netFetch } from '../net';
jest.mock('../api', () => ({ API_BASE: 'https://example.test' }));
jest.mock('../net', () => ({ netFetch: jest.fn() }));
const response = (body: unknown, status = 200) => ({ ok: status === 200, status, json: async () => body } as Response);
const application = { id: 'member', teamId: 'team', name: 'Reader', status: 'pending',
  profileStatus: 'live', profile: { found: true, fullName: 'Reader Name', resume: { city: 'Алматы' } } };
beforeEach(() => { jest.clearAllMocks(); });
test('applicant request requires auth and sends only scoped ids, normalizing the questionnaire', async () => {
  await expect(fetchReadingApplicant(null, 'club', 'member')).rejects.toMatchObject({ status: 401 });
  expect(netFetch).not.toHaveBeenCalled();
  jest.mocked(netFetch).mockResolvedValue(response({ application }));
  const result = await fetchReadingApplicant('token', 'club/one', 'member/two');
  expect(netFetch).toHaveBeenCalledWith('https://example.test/api/mobile/reading-challenges/club%2Fone/applications/member%2Ftwo',
    expect.objectContaining({ headers: { Authorization: 'Bearer token', Accept: 'application/json' }, timeoutMs: 12000, retries: 0 }));
  expect(result.profile?.fullName).toBe('Reader Name'); expect(result.profile?.gallup).toEqual([]);
});
test('missing profile retains the server status and unavailable API never becomes an empty profile', async () => {
  jest.mocked(netFetch).mockResolvedValue(response({ application: { ...application, profile: null, profileStatus: 'unavailable' } }));
  expect(await fetchReadingApplicant('token', 'club', 'member')).toMatchObject({ profile: null, profileStatus: 'unavailable' });
  jest.mocked(netFetch).mockResolvedValue(response({ message: 'Заявка недоступна' }, 404));
  await expect(fetchReadingApplicant('token', 'club', 'member')).rejects.toMatchObject({ status: 404, message: 'Заявка недоступна' });
  jest.mocked(netFetch).mockResolvedValue(response({ application: {} }));
  await expect(fetchReadingApplicant('token', 'club', 'member')).rejects.toMatchObject({ status: 503 });
});
