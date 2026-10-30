import { act, renderHook, waitFor } from '@testing-library/react-native';
import { useReadingChallenge } from '../useReadingChallenge';
import { readingFixture } from '../../storybook/readingFixtures';
import { fetchReadingDetail, ReadingApiError, ReadingDetail, sendReadingCommand } from '../../data/reading';
import { readingNative } from '../readingNative';
import { READING_OUTBOX_KEY } from '../readingOutbox';
import { readingDayAt, readingDayEnd } from '../../data/readingOffline';
import { readingClockKey, readingAttestKey } from '../useReadingChallenge';
const READING_CLOCK_KEY = readingClockKey('demo-reader');
import { AppState } from 'react-native';

let mockDisk: Record<string, any> = {};
let mockUuid = 0;
let mockClock: { uptimeMs: number; bootId: string } | null = null;
jest.mock('@clerk/clerk-expo', () => ({ useAuth: () => ({ userId: 'demo-reader', getToken: async () => 'token' }) }));
jest.mock('../../data/api', () => ({ API_BASE: 'https://example.test' }));
jest.mock('../../data/reading', () => ({ ...jest.requireActual('../../data/reading'), fetchReadingDetail: jest.fn(), sendReadingCommand: jest.fn() }));
jest.mock('../persist', () => ({ loadJSON: jest.fn(async (key, fallback) => mockDisk[key] ?? fallback),
  readJSON: jest.fn(async (key, fallback) => ({ ok: true, value: mockDisk[key] ?? fallback })),
  saveJSON: jest.fn(async (key, value) => { mockDisk[key] = JSON.parse(JSON.stringify(value)); }) }));
jest.mock('../readingNative', () => ({ ...jest.requireActual('../readingNative'), readingNative: { capabilities: jest.fn(),
  snapshot: jest.fn(async () => null), remainingMs: jest.fn(async () => 1800000), pause: jest.fn(), start: jest.fn(), acknowledge: jest.fn(),
  authorize: jest.fn(), selectApps: jest.fn(), finish: jest.fn(), resume: jest.fn(), clock: jest.fn(async () => mockClock),
  attest: { supported: jest.fn(async () => true), generateKey: jest.fn(async () => 'key-1'), attestKey: jest.fn(async () => 'attestation-1'),
    assertion: jest.fn(async (_key: string, data: string) => `signed:${data}`) }, reconcileLiveActivity: jest.fn(), restoreLiveActivity: jest.fn(), configurePageReminder: jest.fn(async () => {}) } }));
jest.mock('expo-crypto', () => ({ CryptoDigestAlgorithm: { SHA256: 'SHA256' },
  // Distinct, stable ids per session/action so that several approaches never collide.
  digestStringAsync: async (_algorithm: string, value: string) => {
    let h = 0; for (const ch of value) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    return (h.toString(16).padStart(8, '0').repeat(8)).slice(0, 64);
  },
  randomUUID: () => `session-${++mockUuid}`, getRandomBytes: (n: number) => new Uint8Array(n).fill(7) }));

const fetchDetail = jest.mocked(fetchReadingDetail), send = jest.mocked(sendReadingCommand);
const offline = () => new TypeError('Network request failed');
const DAY = 86_400_000;
// A continuous challenge that started three days ago (Asia/Almaty days), joined on day 1.
const startDate = new Date(Date.now() + 5 * 3_600_000 - 3 * DAY).toISOString().slice(0, 10);
const today = readingDayAt(startDate, Date.now());
const cached: ReadingDetail = { ...readingFixture, mode: 'continuous', format: 'individual', startDate, currentDay: today - 1,
  serverNow: Date.now() - DAY, dayEnd: readingDayEnd(startDate, today - 1), supportsOfflineStart: true, session: null,
  me: { ...readingFixture.me!, history: [{ day: today - 1, state: 'open', pages: 10, elapsedMs: 20 * 60000 }] },
  ranking: [] };
const cacheKey = `dvg.readingDetail.demo-reader.reading-demo`;
const queued = () => (mockDisk[READING_OUTBOX_KEY]?.commands ?? []) as any[];
let journal: any = null;

beforeEach(() => {
  jest.clearAllMocks(); mockUuid = 0; journal = null; mockClock = null;
  mockDisk = { [cacheKey]: cached, 'dvg.readingDevice.v1': 'phone', 'dvg.readingSelectedBook': null };
  jest.spyOn(AppState, 'addEventListener').mockImplementation(() => ({ remove: jest.fn() }));
  fetchDetail.mockReset().mockRejectedValue(offline()); send.mockReset().mockRejectedValue(offline());
  jest.mocked(readingNative.capabilities).mockResolvedValue({ available: true, authorized: true, selectedCount: 1, platform: 'ios', blockingMode: 'selected' });
  jest.mocked(readingNative.snapshot).mockImplementation(async () => journal);
  jest.mocked(readingNative.start).mockImplementation(async (accountId, sessionId, deviceId, book, budgetMs, targetMs) => {
    journal = { accountId, sessionId, deviceId, book, budgetMs, targetMs, anchorMs: 1, bootId: 'boot', elapsedMs: null, integrity: 'ok', status: 'running' };
    return journal;
  });
  jest.mocked(readingNative.pause).mockImplementation(async () => { journal = journal && { ...journal, status: 'paused', elapsedMs: 25 * 60000 }; return journal; });
  jest.mocked(readingNative.acknowledge).mockImplementation(async () => { journal = null; });
});


async function openOffline() {
  const h = await renderHook(() => useReadingChallenge('reading-demo'));
  await waitFor(() => expect(h.result.current.offline).toBe(true));
  await waitFor(() => expect(h.result.current.busy).toBe(false));
  return h;
}

/** A small stateful server: yesterday's approach ran out at midnight, pages were never written. */
function nextDayServer() {
  const yesterday = today - 1;
  const startedAt = readingDayEnd(startDate, yesterday) - 3_600_000;
  let session: any = { id: 'old-1', deviceId: 'phone', day: yesterday, book: 'Вчерашняя книга', author: null, bookKey: null, fromPage: 10,
    startedAt: new Date(startedAt).toISOString(), budgetMs: 3_600_000, elapsedMs: null, status: 'running' };
  const history = [{ day: yesterday, state: 'open' as const, pages: 0, elapsedMs: 0 }];
  const reported: string[] = [];
  send.mockReset().mockImplementation(async (_t, c: any) => {
    if (c.action === 'stop' && session?.id === c.sessionId) session = { ...session, status: 'awaiting_pages', elapsedMs: c.elapsedMs };
    else if (c.action === 'report' && session?.id === c.sessionId) {
      history[0] = { ...history[0], pages: c.pages, elapsedMs: session.elapsedMs, state: session.elapsedMs >= 3_600_000 ? 'complete' as any : 'open' };
      reported.push(session.id); session = null;
    } else if (c.action === 'start') session = { id: c.sessionId, deviceId: c.deviceId, day: today, book: c.book, author: null, bookKey: null,
      fromPage: null, startedAt: new Date().toISOString(), budgetMs: readingDayEnd(startDate, today) - Date.now(), elapsedMs: null, status: 'running' };
    return { ok: true };
  });
  fetchDetail.mockReset().mockImplementation(async () => ({ ...cached, currentDay: today, dayEnd: readingDayEnd(startDate, today), serverNow: Date.now(),
    session, reportedSessionIds: [...reported], me: { ...cached.me!, history: [...history] } }));
  // The phone stopped the timer itself at midnight (deadline): a terminal journal with the full hour.
  journal = { accountId: 'demo-reader', sessionId: 'old-1', deviceId: 'phone', book: 'Вчерашняя книга', budgetMs: 3_600_000, targetMs: 3_600_000,
    anchorMs: 1, bootId: 'boot', elapsedMs: 3_600_000, integrity: 'ok', status: 'paused', resumeVersion: 1, terminal: true, canResume: false, generation: 'g1' };
  return { history: () => history };
}

test('next morning: yesterday\'s unwritten pages can be saved and today\'s timer starts right after', async () => {
  const server = nextDayServer();
  const h = await renderHook(() => useReadingChallenge('reading-demo'));
  await waitFor(() => expect(h.result.current.busy).toBe(false));
  await waitFor(() => expect(h.result.current.awaitingPages).toBe(true));
  expect(h.result.current.data?.session).toMatchObject({ id: 'old-1', day: today - 1, status: 'awaiting_pages' });
  expect(h.result.current.error).toBeUndefined();
  expect(h.result.current.sessionNotice).toBeUndefined();
  await act(async () => { await h.result.current.saveApproach(25, 35); });
  await waitFor(() => expect(h.result.current.data?.session).toBeNull());
  await waitFor(() => expect(h.result.current.busy).toBe(false));
  expect(h.result.current.error).toBeUndefined();
  expect(server.history()[0]).toMatchObject({ day: today - 1, pages: 25, elapsedMs: 3_600_000 });
  expect(journal).toBeNull();
  expect(h.result.current.startBlocked).toBe(false);
  expect(h.result.current.timerState).toBe('ready');
  await act(async () => { await h.result.current.start('Сегодняшняя книга'); });
  expect(h.result.current.error).toBeUndefined();
  expect(jest.mocked(readingNative.start).mock.calls[0].slice(1, 4)).toEqual(['session-1', 'phone', 'Сегодняшняя книга']);
  expect(jest.mocked(readingNative.start).mock.calls[0][5]).toBe(3_600_000);
  await h.unmount();
});

test('next morning without internet: yesterday\'s pages are saved on the phone and today\'s timer starts', async () => {
  const yesterday = today - 1;
  const startedAt = readingDayEnd(startDate, yesterday) - 3_600_000;
  // Last server copy (yesterday evening): the approach was running.
  mockDisk[cacheKey] = { ...cached, currentDay: yesterday, dayEnd: readingDayEnd(startDate, yesterday), serverNow: startedAt,
    session: { id: 'old-1', deviceId: 'phone', day: yesterday, book: 'Вчерашняя книга', author: null, bookKey: null, fromPage: null,
      startedAt: new Date(startedAt).toISOString(), budgetMs: 3_600_000, elapsedMs: null, status: 'running' } };
  journal = { accountId: 'demo-reader', sessionId: 'old-1', deviceId: 'phone', book: 'Вчерашняя книга', budgetMs: 3_600_000, targetMs: 3_600_000,
    anchorMs: 1, bootId: 'boot', elapsedMs: 3_600_000, integrity: 'ok', status: 'paused', resumeVersion: 1, terminal: true, canResume: false, generation: 'g1' };
  const h = await openOffline();
  await waitFor(() => expect(h.result.current.awaitingPages).toBe(true));
  expect(h.result.current.data?.currentDay).toBe(today);
  expect(h.result.current.data?.session).toMatchObject({ id: 'old-1', day: yesterday, status: 'awaiting_pages' });
  await act(async () => { await h.result.current.saveApproach(18); });
  await act(async () => { await h.result.current.retry(); });
  expect(h.result.current.error).toBeUndefined();
  expect(h.result.current.data?.session).toBeNull();
  expect(journal).toBeNull();
  expect(h.result.current.data?.me?.history.find(d => d.day === yesterday)).toMatchObject({ pages: 28, elapsedMs: 80 * 60000, state: 'complete' });
  await act(async () => { await h.result.current.start('Сегодня'); });
  expect(h.result.current.error).toBeUndefined();
  expect(jest.mocked(readingNative.start).mock.calls[0][5]).toBe(3_600_000);
  expect(queued().map(c => [c.action, c.sessionId])).toEqual([['stop', 'old-1'], ['report', 'old-1'], ['start', 'session-1']]);
});

test('a reader who paused before midnight and came back next day can still write those pages', async () => {
  const server = nextDayServer();
  // Soft pause at 23:40 with 20 minutes left; the native deadline later sealed it (terminal after midnight).
  journal = { ...journal, elapsedMs: 40 * 60000, terminal: false, canResume: false };
  jest.mocked(readingNative.finish).mockImplementation(async () => { journal = { ...journal, terminal: true }; return journal; });
  const h = await renderHook(() => useReadingChallenge('reading-demo'));
  await waitFor(() => expect(h.result.current.busy).toBe(false));
  await act(async () => { await h.result.current.saveApproach(12, 22); });
  await waitFor(() => expect(h.result.current.data?.session).toBeNull());
  expect(h.result.current.error).toBeUndefined();
  expect(server.history()[0]).toMatchObject({ pages: 12, elapsedMs: 40 * 60000 });
  await h.unmount();
});
