import { fetchBooks } from '../books';
jest.mock('../achievementEvents', () => ({ captureAchievementRecorder: () => jest.fn() }));
const originalFetch = global.fetch;
beforeEach(() => { global.fetch = jest.fn(); });
afterEach(() => { global.fetch = originalFetch; });
it('distinguishes a genuinely empty library from a failed request', async () => {
  jest.mocked(fetch).mockResolvedValue({ ok: true, json: async () => ({ books: [] }) } as Response);
  await expect(fetchBooks(null)).resolves.toEqual([]);
});
it.each(['network', 'http', 'invalid'])('surfaces %s errors for the catalog recovery UI', async kind => {
  if (kind === 'network') jest.mocked(fetch).mockRejectedValue(new Error('offline'));
  else jest.mocked(fetch).mockResolvedValue({ ok: kind !== 'http', json: async () => ({}) } as Response);
  await expect(fetchBooks(null)).rejects.toThrow();
});
