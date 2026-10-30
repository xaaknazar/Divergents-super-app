import { createChallengeReadCache, challengeReadKey, READ_DEADLINE_MS } from '../challengeReadCache';
import { ReadAccessError } from '../../data/readAccessError';
import { loadJSON, saveJSON } from '../persist';
jest.mock('../persist', () => ({ loadJSON: jest.fn(async () => []), saveJSON: jest.fn(async () => {}), clearKeys: jest.fn(async () => {}) }));
const key = challengeReadKey('user', 'season', 'summary');
beforeEach(() => { jest.useRealTimers(); jest.clearAllMocks(); jest.mocked(loadJSON).mockResolvedValue([]); });
afterEach(() => jest.useRealTimers());

it('shares one request, then serves a fresh cached response without another request', async () => {
  const cache = createChallengeReadCache();
  const loader = jest.fn(async () => ({ points: 12 }));
  await Promise.all([cache.load(key, loader), cache.load(key, loader)]);
  await cache.load(key, loader);
  expect(loader).toHaveBeenCalledTimes(1);
  expect(cache.get(key).data).toEqual({ points: 12 });
});
it('isolates accounts, challenges and summary/day data', async () => {
  const cache = createChallengeReadCache(); await cache.load(key, async () => ({ points: 12 }));
  for (const other of [challengeReadKey('other', 'season', 'summary'), challengeReadKey('user', 'other', 'summary'), challengeReadKey('user', 'season', 'days')]) expect(cache.get(other).data).toBeNull();
});
it('keeps saved content during refresh and after a temporary failure', async () => {
  const cache = createChallengeReadCache(); await cache.load(key, async () => ({ points: 12 }));
  const refresh = cache.load(key, async () => { throw new Error('Network down'); }, true);
  expect(cache.get(key)).toMatchObject({ data: { points: 12 }, loading: true });
  await refresh;
  expect(cache.get(key)).toMatchObject({ data: { points: 12 }, error: true, loading: false });
  await cache.load(key, async () => ({ points: 14 }), true);
  expect(cache.get(key)).toMatchObject({ data: { points: 14 }, error: false });
});
it.each([401, 403, 404])('clears saved data after access error %i', async status => {
  const cache = createChallengeReadCache(); await cache.load(key, async () => ({ points: 12 }));
  await cache.load(key, async () => { throw new ReadAccessError(status); }, true);
  expect(cache.get(key)).toMatchObject({ data: null, error: true });
  expect(saveJSON).toHaveBeenLastCalledWith(expect.any(String), []);
});
it('ends loading on a hung token/request and ignores a late success', async () => {
  jest.useFakeTimers(); const cache = createChallengeReadCache();
  let resolve!: (data: unknown) => void;
  const request = cache.load(key, () => new Promise(done => { resolve = done; }));
  await jest.advanceTimersByTimeAsync(READ_DEADLINE_MS + 1); await request;
  expect(cache.get(key)).toMatchObject({ loading: false, error: true, data: null });
  resolve({ stale: true }); await Promise.resolve();
  expect(cache.get(key).data).toBeNull();
});
it('cannot resurrect data after sign-out while a read is in flight', async () => {
  const cache = createChallengeReadCache(); let resolve!: (data: unknown) => void;
  const request = cache.load(key, () => new Promise(done => { resolve = done; }));
  await Promise.resolve(); await cache.reset(); resolve({ private: true }); await request;
  expect(cache.get(key).data).toBeNull(); expect(saveJSON).not.toHaveBeenCalled();
});
it('hydrates without waiting for the network and never overwrites a fresh response', async () => {
  const cache = createChallengeReadCache(); let disk!: (data: any) => void;
  jest.mocked(loadJSON).mockImplementation(() => new Promise(done => { disk = done; }));
  const hydration = cache.hydrate(); await cache.load(key, async () => ({ points: 20 }));
  disk([[key, { data: { points: 10 }, updatedAt: Date.now() - 10000 }]]); await hydration;
  expect(cache.get(key).data).toEqual({ points: 20 });
});
it('restores persisted results and rejects expired entries', async () => {
  const cache = createChallengeReadCache();
  jest.mocked(loadJSON).mockResolvedValue([[key, { data: { points: 10 }, updatedAt: Date.now() - 60000 }], ['old', { data: {}, updatedAt: Date.now() - 2 * 86400000 }]]);
  await cache.hydrate(); expect(cache.get(key).data).toEqual({ points: 10 }); expect(cache.get('old').data).toBeNull();
});
