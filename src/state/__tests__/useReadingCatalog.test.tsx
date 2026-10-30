import { act, renderHook, waitFor } from '@testing-library/react-native';
import { fetchReadingCatalog, ReadingApiError } from '../../data/reading';
import { READ_DEADLINE_MS } from '../challengeReadCache';
import { readingCatalogCache, readingCatalogKey, READING_CATALOG_CACHE_KEY } from '../readingCatalogCache';
import { useReadingCatalog } from '../useReadingCatalog';

let mockUserId: string | null = 'reader';
const mockToken = jest.fn<Promise<string | null>, []>();
let mockDisk: Record<string, unknown> = {};
jest.mock('@clerk/clerk-expo', () => ({ useAuth: () => ({ userId: mockUserId, getToken: mockToken }) }));
jest.mock('@react-navigation/native', () => ({ useFocusEffect: (cb: () => void) => require('react').useEffect(cb, [cb]) }));
jest.mock('../../data/api', () => ({ API_BASE: 'https://example.test' }));
jest.mock('../../data/reading', () => ({ ...jest.requireActual('../../data/reading'), fetchReadingCatalog: jest.fn() }));
jest.mock('../persist', () => ({
  loadJSON: jest.fn(async (key, fallback) => mockDisk[key] ?? fallback),
  saveJSON: jest.fn(async (key, value) => { mockDisk[key] = JSON.parse(JSON.stringify(value)); }),
  clearKeys: jest.fn(async (keys: string[]) => { keys.forEach(key => { delete mockDisk[key]; }); }),
}));
const catalog = { enabled: true, challenges: [{ id: 'reading', title: 'Extreme reading', startDate: '2026-10-20',
  durationDays: 1, mode: 'continuous' as const, phase: 'active' as const, membership: 'approved' as const }] };
const fetchCatalog = jest.mocked(fetchReadingCatalog);
function saveCatalog(value: unknown = catalog, age = 0) {
  mockDisk[READING_CATALOG_CACHE_KEY] = [[readingCatalogKey('reader'), { data: value, updatedAt: Date.now() - age }]];
}
beforeEach(async () => {
  await readingCatalogCache.reset(); mockDisk = {}; mockUserId = 'reader';
  mockToken.mockReset().mockResolvedValue('token'); fetchCatalog.mockReset().mockResolvedValue(catalog);
});
afterEach(() => jest.useRealTimers());

test('persists the catalog and restores the doorway after cold restart without internet', async () => {
  const first = await renderHook(useReadingCatalog);
  await waitFor(() => expect(first.result.current.items).toEqual(catalog.challenges));
  const disk = JSON.parse(JSON.stringify(mockDisk));
  await first.unmount(); await readingCatalogCache.reset(); mockDisk = disk;
  fetchCatalog.mockRejectedValue(new TypeError('Network request failed'));
  const offline = await renderHook(useReadingCatalog);
  await waitFor(() => expect(offline.result.current.error).toBe(true));
  expect(offline.result.current.items).toEqual(catalog.challenges);
});

test('shows saved cards before a hanging token, keeps them past the read deadline and across days', async () => {
  jest.useFakeTimers(); saveCatalog(catalog, 3 * 86400000);
  mockToken.mockImplementation(() => new Promise(() => {}));
  const h = await renderHook(useReadingCatalog);
  await act(async () => {});
  expect(h.result.current.items).toEqual(catalog.challenges);
  await act(async () => { await jest.advanceTimersByTimeAsync(READ_DEADLINE_MS + 1); });
  expect(h.result.current.error).toBe(true);
  expect(h.result.current.items).toEqual(catalog.challenges);
  expect(fetchCatalog).not.toHaveBeenCalled();
  await h.unmount();
});

test('a missing offline token does not erase saved cards', async () => {
  saveCatalog(); mockToken.mockResolvedValue(null);
  const h = await renderHook(useReadingCatalog);
  await waitFor(() => expect(h.result.current.error).toBe(true));
  expect(h.result.current.items).toEqual(catalog.challenges);
  expect(fetchCatalog).not.toHaveBeenCalled();
});

test('successful disabled/empty responses replace old cards even after another restart', async () => {
  saveCatalog(); fetchCatalog.mockResolvedValue({ enabled: false, challenges: [] });
  const h = await renderHook(useReadingCatalog);
  await waitFor(() => expect(mockDisk[READING_CATALOG_CACHE_KEY]).toEqual(expect.arrayContaining([
    [readingCatalogKey('reader'), expect.objectContaining({ data: { enabled: false, challenges: [] } })],
  ])));
  expect(h.result.current.items).toEqual([]);
  const disk = JSON.parse(JSON.stringify(mockDisk));
  await h.unmount(); await readingCatalogCache.reset(); mockDisk = disk;
  mockToken.mockResolvedValue(null);
  const offline = await renderHook(useReadingCatalog);
  await waitFor(() => expect(offline.result.current.error).toBe(true));
  expect(offline.result.current.items).toEqual([]);
});

test.each([401, 403])('an explicit server denial %s evicts stale cards', async status => {
  saveCatalog(); fetchCatalog.mockRejectedValue(new ReadingApiError('Доступ закрыт', status));
  const h = await renderHook(useReadingCatalog);
  await waitFor(() => expect(h.result.current.error).toBe(true));
  expect(h.result.current.items).toEqual([]);
  expect(mockDisk[READING_CATALOG_CACHE_KEY]).toEqual([]);
});

test('malformed saved data cannot crash the community or invent a challenge', async () => {
  saveCatalog({ enabled: true, challenges: [{ id: 'reading' }] }); mockToken.mockResolvedValue(null);
  const h = await renderHook(useReadingCatalog);
  await waitFor(() => expect(h.result.current.error).toBe(true));
  expect(h.result.current.items).toEqual([]);
});

test('switching accounts hides old cards immediately and ignores the old response', async () => {
  saveCatalog(); let finish!: (value: typeof catalog) => void;
  fetchCatalog.mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
  const h = await renderHook(useReadingCatalog);
  await waitFor(() => expect(h.result.current.items).toEqual(catalog.challenges));
  mockUserId = 'other'; mockToken.mockResolvedValue(null);
  await h.rerender(undefined);
  expect(h.result.current.items).toEqual([]);
  await act(async () => { finish(catalog); });
  expect(h.result.current.items).toEqual([]);
  expect(readingCatalogCache.get(readingCatalogKey('other')).data).toBeNull();
});

test('sign-out invalidates pending writes and removes saved catalog', async () => {
  let finish!: (value: typeof catalog) => void;
  fetchCatalog.mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
  const h = await renderHook(useReadingCatalog);
  await waitFor(() => expect(fetchCatalog).toHaveBeenCalled());
  await act(async () => { await readingCatalogCache.reset(); });
  mockUserId = null; await h.rerender(undefined);
  await act(async () => { finish(catalog); });
  expect(h.result.current.items).toEqual([]);
  expect(mockDisk[READING_CATALOG_CACHE_KEY]).toBeUndefined();
});

test('a late denial for the previous account cannot evict the new account catalog', async () => {
  let deny!: (reason: unknown) => void;
  fetchCatalog.mockReturnValueOnce(new Promise((_resolve, reject) => { deny = reject; }));
  const h = await renderHook(useReadingCatalog);
  await waitFor(() => expect(fetchCatalog).toHaveBeenCalledTimes(1));
  mockUserId = 'other';
  const otherCatalog = { ...catalog, challenges: [{ ...catalog.challenges[0], id: 'other-reading' }] };
  fetchCatalog.mockResolvedValue(otherCatalog);
  await h.rerender(undefined);
  await waitFor(() => expect(h.result.current.items).toEqual(otherCatalog.challenges));
  await act(async () => { deny(new ReadingApiError('Доступ закрыт', 403)); });
  expect(h.result.current.items).toEqual(otherCatalog.challenges);
  expect(mockDisk[READING_CATALOG_CACHE_KEY]).toEqual([
    [readingCatalogKey('other'), expect.objectContaining({ data: otherCatalog })],
  ]);
});

test('retry replaces cached cards with the current server catalog when connection returns', async () => {
  saveCatalog(); fetchCatalog.mockRejectedValue(new TypeError('Network request failed'));
  const h = await renderHook(useReadingCatalog);
  await waitFor(() => expect(h.result.current.error).toBe(true));
  fetchCatalog.mockResolvedValue({ enabled: true, challenges: [] });
  await act(async () => { await h.result.current.retry(); });
  expect(h.result.current.items).toEqual([]); expect(h.result.current.error).toBe(false);
});
