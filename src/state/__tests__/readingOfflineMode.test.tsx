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
  authorize: jest.fn(), selectApps: jest.fn(), clock: jest.fn(async () => mockClock),
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
/** The phone stopped the approach (pause before the goal ends it in this test journal). */
function stopOnPhone(elapsedMs: number) { journal = { ...journal, status: 'paused', elapsedMs }; }

test('without internet the screen shows today from the phone clock, not an error', async () => {
  const h = await openOffline();
  expect(h.result.current.error).toBeUndefined();
  expect(h.result.current.data?.currentDay).toBe(today);
  expect(h.result.current.data?.me?.history.find(d => d.day === today)).toBeUndefined();
});

test('«Старт» in airplane mode starts the timer on the phone and queues the start with the phone time', async () => {
  const h = await openOffline();
  const before = Date.now();
  await act(async () => { await h.result.current.start('Книга', { author: 'Автор', bookKey: 'ol:OL1W' }); });
  expect(h.result.current.error).toBeUndefined();
  expect(readingNative.start).toHaveBeenCalledTimes(1);
  const [, sessionId, deviceId, book, budgetMs, targetMs] = jest.mocked(readingNative.start).mock.calls[0];
  expect([sessionId, deviceId, book, targetMs]).toEqual(['session-1', 'phone', 'Книга', 3_600_000]);
  expect(budgetMs).toBeLessThanOrEqual(readingDayEnd(startDate, today) - before);
  expect(queued()).toEqual([expect.objectContaining({ action: 'start', sessionId: 'session-1', book: 'Книга', author: 'Автор', bookKey: 'ol:OL1W' })]);
  expect(queued()[0].startedAt).toBeGreaterThanOrEqual(before);
  expect(h.result.current.data?.session).toMatchObject({ id: 'session-1', status: 'running', day: today });
  expect(h.result.current.timerState).toBe('running');
});

test('pages are saved on the phone, the journal is released and a second approach can start offline', async () => {
  const h = await openOffline();
  await act(async () => { await h.result.current.start('Книга'); });
  stopOnPhone(25 * 60000);
  await act(async () => { await h.result.current.retry(); });
  await act(async () => { await h.result.current.report(12); });
  await act(async () => { await h.result.current.retry(); });
  expect(queued().map(c => [c.action, c.sessionId, c.elapsedMs ?? c.pages])).toEqual([
    ['start', 'session-1', undefined], ['stop', 'session-1', 25 * 60000], ['report', 'session-1', 12]]);
  expect(readingNative.acknowledge).toHaveBeenCalledWith('demo-reader', 'session-1');
  expect(h.result.current.data?.session).toBeNull();
  expect(h.result.current.data?.me?.history.find(d => d.day === today)).toMatchObject({ elapsedMs: 25 * 60000, pages: 12 });
  expect(h.result.current.pendingToday).toBe(1);
  // Second approach: the goal now needs only the remaining 35 minutes.
  await act(async () => { await h.result.current.start('Другая книга'); });
  expect(jest.mocked(readingNative.start).mock.calls[1].slice(1, 4)).toEqual(['session-2', 'phone', 'Другая книга']);
  expect(jest.mocked(readingNative.start).mock.calls[1][5]).toBe(35 * 60000);
});

test('when internet returns, the queued approach is delivered in order with its phone time', async () => {
  const h = await openOffline();
  await act(async () => { await h.result.current.start('Книга'); });
  const startedAt = queued()[0].startedAt;
  stopOnPhone(30 * 60000);
  await act(async () => { await h.result.current.retry(); });
  await act(async () => { await h.result.current.report(20); });
  // Back online: the server accepts everything and confirms the approach.
  send.mockReset().mockResolvedValue({ ok: true });
  fetchDetail.mockReset().mockResolvedValue({ ...cached, currentDay: today, dayEnd: readingDayEnd(startDate, today), serverNow: Date.now(),
    reportedSessionIds: ['session-1'], me: { ...cached.me!, history: [{ day: today, state: 'open', pages: 20, elapsedMs: 30 * 60000 }] } });
  await act(async () => { await h.result.current.retry(); });
  expect(send.mock.calls.map(c => c[1].action)).toEqual(['start', 'stop', 'report']);
  expect(send.mock.calls[0][1]).toMatchObject({ sessionId: 'session-1', startedAt });
  expect(queued()).toEqual([]);
  expect(h.result.current.offline).toBe(false);
  expect(h.result.current.pendingApproaches).toBe(0);
  // Server numbers replace the phone copy; nothing is counted twice.
  expect(h.result.current.data?.me?.history.find(d => d.day === today)).toMatchObject({ elapsedMs: 30 * 60000, pages: 20 });
});

test('an old server without offline support refuses the offline start before touching the timer', async () => {
  mockDisk[cacheKey] = { ...cached, supportsOfflineStart: undefined };
  const h = await openOffline();
  await act(async () => { await h.result.current.start('Книга'); });
  expect(h.result.current.error).toMatch(/после обновления сервера/);
  expect(readingNative.start).not.toHaveBeenCalled(); expect(queued()).toEqual([]);
});

test('a start the server later refuses drops its queued time and pages and is shown to the reader', async () => {
  const h = await openOffline();
  await act(async () => { await h.result.current.start('Книга'); });
  stopOnPhone(15 * 60000);
  await act(async () => { await h.result.current.retry(); });
  await act(async () => { await h.result.current.report(5); });
  send.mockReset().mockImplementation(async (_token, command) => {
    if (command.action === 'start') throw new ReadingApiError('Подход начат больше 7 дней назад и уже не принимается.', 409, 'offline_too_old');
    return { ok: true };
  });
  fetchDetail.mockReset().mockResolvedValue({ ...cached, currentDay: today, dayEnd: readingDayEnd(startDate, today), serverNow: Date.now() });
  await act(async () => { await h.result.current.retry(); });
  expect(queued()).toEqual([]);
  expect(send.mock.calls.map(c => c[1].action)).toEqual(['start']);
  expect(h.result.current.rejectedApproaches).toEqual([expect.objectContaining({ sessionId: 'session-1', book: 'Книга',
    elapsedMs: 15 * 60000, pages: 5, message: expect.stringMatching(/7 дней/) })]);
  await act(async () => { await h.result.current.dismissRejected(); });
  expect(h.result.current.rejectedApproaches).toEqual([]);
});

test('a slow network does not hold «Старт»: after the deadline the timer starts on the phone', async () => {
  jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask'] });
  try {
    fetchDetail.mockReset().mockImplementation(() => new Promise(() => {}));
    send.mockReset().mockImplementation(() => new Promise(() => {}));
    const h = await renderHook(() => useReadingChallenge('reading-demo'));
    await act(async () => { await jest.advanceTimersByTimeAsync(20_000); });
    let starting!: Promise<void>;
    await act(async () => { starting = h.result.current.start('Книга'); });
    await act(async () => { await jest.advanceTimersByTimeAsync(30_000); await starting; });
    expect(readingNative.start).toHaveBeenCalledTimes(1);
    expect(queued()).toEqual([expect.objectContaining({ action: 'start', sessionId: 'session-1' })]);
    await h.unmount();
  } finally { jest.useRealTimers(); }
});

test('the start time comes from the last server time + the monotonic clock, not from the phone date', async () => {
  // Last answer from the server 2 hours ago; the monotonic clock has advanced by exactly 2 hours since.
  const serverNow = Date.now() - 2 * 3_600_000;
  mockDisk[READING_CLOCK_KEY] = { serverNow, uptimeMs: 1_000_000, bootId: 'boot-a' };
  mockClock = { uptimeMs: 1_000_000 + 2 * 3_600_000, bootId: 'boot-a' };
  const h = await openOffline();
  await act(async () => { await h.result.current.start('Книга'); });
  expect(queued()[0]).toMatchObject({ action: 'start', startedAt: serverNow + 2 * 3_600_000, startedAtSource: 'synced', syncedAt: serverNow });
});

test('after a reboot without internet only the phone date is known and it is marked as such', async () => {
  mockDisk[READING_CLOCK_KEY] = { serverNow: Date.now() - 3_600_000, uptimeMs: 5_000_000, bootId: 'boot-a' };
  mockClock = { uptimeMs: 60_000, bootId: 'boot-b' };
  const h = await openOffline();
  const before = Date.now();
  await act(async () => { await h.result.current.start('Книга'); });
  expect(queued()[0]).toMatchObject({ startedAtSource: 'device' });
  expect(queued()[0].syncedAt).toBeUndefined();
  expect(queued()[0].startedAt).toBeGreaterThanOrEqual(before);
});

const NONCE = '07'.repeat(16);
test('a successful refresh anchors the monotonic clock to the signed server time for its own nonce only', async () => {
  mockClock = { uptimeMs: 42_000, bootId: 'boot-a' };
  const serverNow = Date.now() - 1000;
  fetchDetail.mockReset().mockResolvedValue({ ...cached, currentDay: today, dayEnd: readingDayEnd(startDate, today), serverNow,
    clock: { serverNow, nonce: NONCE, token: 'signed-1' } });
  send.mockReset().mockResolvedValue({ ok: true });
  const h = await renderHook(() => useReadingChallenge('reading-demo'));
  await waitFor(() => expect(mockDisk[READING_CLOCK_KEY]).toEqual({ serverNow, uptimeMs: 42_000, bootId: 'boot-a', nonce: NONCE, token: 'signed-1' }));
  expect(fetchDetail.mock.calls[0][2]).toBe(NONCE);
  await h.unmount();
  // A replayed answer for another request (other nonce) is never used as a signed anchor.
  fetchDetail.mockReset().mockResolvedValue({ ...cached, currentDay: today, dayEnd: readingDayEnd(startDate, today), serverNow: serverNow - 86_400_000,
    clock: { serverNow: serverNow - 86_400_000, nonce: 'старый-nonce-0000000000', token: 'old' } });
  const again = await renderHook(() => useReadingChallenge('reading-demo'));
  await waitFor(() => expect(mockDisk[READING_CLOCK_KEY]?.serverNow).toBe(serverNow - 86_400_000));
  expect(mockDisk[READING_CLOCK_KEY].token).toBeUndefined();
  await again.unmount();
});

test('the offline start carries the signed anchor and the App Attest signature of its timing', async () => {
  const serverNow = Date.now() - 3_600_000;
  mockDisk[READING_CLOCK_KEY] = { serverNow, uptimeMs: 1_000, bootId: 'boot-a', nonce: NONCE, token: 'signed-1' };
  mockDisk[readingAttestKey('demo-reader')] = { keyId: 'key-1' };
  mockClock = { uptimeMs: 1_000 + 3_600_000, bootId: 'boot-a' };
  const h = await openOffline();
  await act(async () => { await h.result.current.start('Книга'); });
  const start = queued()[0];
  expect(start).toMatchObject({ startedAt: serverNow + 3_600_000, startedAtSource: 'synced', syncedAt: serverNow, syncNonce: NONCE, syncToken: 'signed-1',
    attestKeyId: 'key-1', assertion: `signed:divergents-reading-start:session-1:${serverNow + 3_600_000}:synced:${serverNow}:${NONCE}` });
});

test('when the server checks App Attest, the app registers its key once', async () => {
  fetchDetail.mockReset().mockResolvedValue({ ...cached, currentDay: today, dayEnd: readingDayEnd(startDate, today), serverNow: Date.now(), supportsAttest: true });
  send.mockReset().mockResolvedValue({ ok: true });
  const h = await renderHook(() => useReadingChallenge('reading-demo'));
  await waitFor(() => expect(mockDisk[readingAttestKey('demo-reader')]).toEqual({ keyId: 'key-1' }));
  expect(send.mock.calls.map(c => c[1])).toEqual([expect.objectContaining({ action: 'attestKey', keyId: 'key-1', attestation: 'attestation-1' })]);
  expect(readingNative.attest.attestKey).toHaveBeenCalledWith('key-1', 'divergents-reading-key:demo-reader:key-1');
  await h.unmount();
});

test('a stop the server refuses for good is shown, the queue moves on and the phone timer is released', async () => {
  const h = await openOffline();
  await act(async () => { await h.result.current.start('Книга'); });
  stopOnPhone(20 * 60000);
  await act(async () => { await h.result.current.retry(); });
  await act(async () => { await h.result.current.report(8); });
  send.mockReset().mockImplementation(async (_token, command) => {
    if (command.action === 'stop') throw new ReadingApiError('Остановите сеанс на устройстве, где начали чтение', 403, 'device');
    return { ok: true };
  });
  fetchDetail.mockReset().mockResolvedValue({ ...cached, currentDay: today, dayEnd: readingDayEnd(startDate, today), serverNow: Date.now() });
  await act(async () => { await h.result.current.retry(); });
  expect(queued()).toEqual([]);
  expect(h.result.current.rejectedApproaches).toEqual([expect.objectContaining({ sessionId: 'session-1', elapsedMs: 20 * 60000, pages: 8,
    message: expect.stringMatching(/устройстве/) })]);
  expect(journal).toBeNull();
});

test('«Старт» in the last minute before midnight starts a full approach for the next day', async () => {
  const dayEnd = readingDayEnd(startDate, today);
  const serverNow = dayEnd - 30_000;
  const live = { ...cached, currentDay: today, dayEnd, serverNow };
  fetchDetail.mockReset().mockResolvedValue(live);
  send.mockReset().mockResolvedValue({ ok: true });
  const h = await renderHook(() => useReadingChallenge('reading-demo'));
  await waitFor(() => expect(h.result.current.offline).toBe(false));
  await waitFor(() => expect(h.result.current.busy).toBe(false));
  // After the start reaches the server it is placed on the next day (counts from 00:00).
  fetchDetail.mockReset().mockImplementation(async () => send.mock.calls.some(c => c[1].action === 'start') ? { ...live, session: { id: 'session-1',
    deviceId: 'phone', day: today + 1, book: 'Книга', author: null, bookKey: null, fromPage: null, startedAt: new Date(dayEnd).toISOString(),
    budgetMs: 86_400_000, elapsedMs: null, status: 'running' as const } } : live);
  await act(async () => { await h.result.current.start('Книга'); });
  expect(h.result.current.error).toBeUndefined();
  const [, , , , budgetMs, targetMs] = jest.mocked(readingNative.start).mock.calls[0];
  expect(targetMs).toBe(3_600_000);
  expect(budgetMs).toBeGreaterThan(23 * 3_600_000);
  await h.unmount();
});

test('an approach blocked by an open session on another device stays queued until it is closed there', async () => {
  const h = await openOffline();
  await act(async () => { await h.result.current.start('Книга'); });
  stopOnPhone(20 * 60000);
  await act(async () => { await h.result.current.retry(); });
  await act(async () => { await h.result.current.report(8); });
  send.mockReset().mockRejectedValue(new ReadingApiError('Сначала завершите предыдущий сеанс и внесите страницы', 409, 'session_pending'));
  fetchDetail.mockReset().mockResolvedValue({ ...cached, currentDay: today, dayEnd: readingDayEnd(startDate, today), serverNow: Date.now() });
  await act(async () => { await h.result.current.retry(); });
  expect(queued().map(c => c.action)).toEqual(['start', 'stop', 'report']);
  expect(h.result.current.rejectedApproaches).toEqual([]);
  expect(h.result.current.error).toMatch(/завершите предыдущий сеанс/);
});

test('time the server accepts without credit (overlap) is shown to the reader', async () => {
  const h = await openOffline();
  await act(async () => { await h.result.current.start('Книга'); });
  stopOnPhone(20 * 60000);
  await act(async () => { await h.result.current.retry(); });
  await act(async () => { await h.result.current.report(8); });
  send.mockReset().mockImplementation(async (_token, command) => command.action === 'stop'
    ? { ok: true, rejected: 'overlap', message: 'Подход пересекается по времени с другим подходом и не засчитан.' } : { ok: true });
  fetchDetail.mockReset().mockResolvedValue({ ...cached, currentDay: today, dayEnd: readingDayEnd(startDate, today), serverNow: Date.now(), reportedSessionIds: ['session-1'] });
  await act(async () => { await h.result.current.retry(); });
  expect(queued()).toEqual([]);
  expect(h.result.current.rejectedApproaches).toEqual([expect.objectContaining({ sessionId: 'session-1', elapsedMs: 20 * 60000,
    message: expect.stringMatching(/пересекается/) })]);
});

test('a timer whose start was refused while it was launching is released on the next sync', async () => {
  journal = { accountId: 'demo-reader', sessionId: 'refused-1', deviceId: 'phone', book: 'Книга', budgetMs: 3_600_000, targetMs: 3_600_000,
    anchorMs: 1, bootId: 'boot', elapsedMs: null, integrity: 'ok', status: 'running' };
  mockDisk['dvg.readingRejected.v1.demo-reader.reading-demo'] = [{ sessionId: 'refused-1', book: 'Книга', message: 'Отказ', at: 1 }];
  const h = await openOffline();
  await waitFor(() => expect(readingNative.acknowledge).toHaveBeenCalledWith('demo-reader', 'refused-1'));
  expect(readingNative.pause).toHaveBeenCalled();
  expect(journal).toBeNull();
  expect(h.result.current.sessionNotice).toBeUndefined();
  expect(h.result.current.rejectedApproaches).toHaveLength(1);
});

test('a 4xx without the reading API code (proxy, firewall) never drops queued approaches', async () => {
  const h = await openOffline();
  await act(async () => { await h.result.current.start('Книга'); });
  stopOnPhone(20 * 60000);
  await act(async () => { await h.result.current.retry(); });
  await act(async () => { await h.result.current.report(8); });
  send.mockReset().mockRejectedValue(new ReadingApiError('Invalid host', 400));
  fetchDetail.mockReset().mockResolvedValue({ ...cached, currentDay: today, dayEnd: readingDayEnd(startDate, today), serverNow: Date.now() });
  await act(async () => { await h.result.current.retry(); });
  expect(queued().map(c => c.action)).toEqual(['start', 'stop', 'report']);
  expect(h.result.current.rejectedApproaches).toEqual([]);
});

test('a slow answer (long round trip) is not used as a clock anchor', async () => {
  let uptime = 1_000;
  jest.mocked(readingNative.clock).mockImplementation(async () => ({ uptimeMs: (uptime += 30_000), bootId: 'boot-a' }));
  fetchDetail.mockReset().mockResolvedValue({ ...cached, currentDay: today, dayEnd: readingDayEnd(startDate, today), serverNow: Date.now() });
  send.mockReset().mockResolvedValue({ ok: true });
  const h = await renderHook(() => useReadingChallenge('reading-demo'));
  await waitFor(() => expect(h.result.current.offline).toBe(false));
  expect(mockDisk[READING_CLOCK_KEY]).toBeUndefined();
  await h.unmount();
});
