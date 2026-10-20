import { act, renderHook, waitFor } from '@testing-library/react-native';
import { readingOperationId, useReadingChallenge } from '../useReadingChallenge';
import { readingFixture } from '../../storybook/readingFixtures';
import { fetchReadingDetail, sendReadingCommand } from '../../data/reading';
import { readingNative } from '../readingNative';
import { READING_OUTBOX_KEY } from '../readingOutbox';
import { saveJSON } from '../persist';

let mockAccount = 'demo-reader';
let mockDisk: Record<string, any> = {};
jest.mock('@clerk/clerk-expo', () => ({ useAuth: () => ({ userId: mockAccount, getToken: async () => 'token' }) }));
jest.mock('../../data/api', () => ({ API_BASE: 'https://example.test' }));
jest.mock('../../data/reading', () => ({ ...jest.requireActual('../../data/reading'), fetchReadingDetail: jest.fn(), sendReadingCommand: jest.fn() }));
jest.mock('../persist', () => ({ loadJSON: jest.fn(async (key, fallback) => mockDisk[key] ?? fallback),
  readJSON: jest.fn(async (key, fallback) => ({ ok: true, value: mockDisk[key] ?? fallback })),
  saveJSON: jest.fn(async (key, value) => { mockDisk[key] = JSON.parse(JSON.stringify(value)); }) }));
jest.mock('../readingNative', () => ({ ...jest.requireActual('../readingNative'), readingNative: { capabilities: jest.fn(async () => ({ available: true, authorized: true, selectedCount: 1, platform: 'ios' })),
  snapshot: jest.fn(async () => null), remainingMs: jest.fn(async () => 1800000), pause: jest.fn(), start: jest.fn(), acknowledge: jest.fn(), authorize: jest.fn(), selectApps: jest.fn() } }));
jest.mock('expo-crypto', () => ({ CryptoDigestAlgorithm: { SHA256: 'SHA256' },
  digestStringAsync: async (algorithm: string, value: string) => value.includes('report') ? 'b'.repeat(64) : 'a'.repeat(64), randomUUID: () => 'random-id' }));
const fetchDetail = jest.mocked(fetchReadingDetail), send = jest.mocked(sendReadingCommand);
const local = { accountId: 'demo-reader', sessionId: 's1', deviceId: 'phone', book: 'Книга', budgetMs: 3600000,
  anchorMs: 1, bootId: 'boot', elapsedMs: 1800000, integrity: 'ok' as const, status: 'paused' as const };
const server = { ...readingFixture, session: { id: 's1', deviceId: 'phone', day: 1, book: 'Книга', budgetMs: 3600000,
  startedAt: '2026-11-01T00:00:00Z', elapsedMs: null, status: 'running' as const } };
beforeEach(() => { jest.clearAllMocks(); mockAccount = 'demo-reader'; mockDisk = {};
  fetchDetail.mockReset().mockResolvedValue(readingFixture); send.mockReset().mockResolvedValue({ ok: true });
  jest.mocked(readingNative.snapshot).mockReset().mockResolvedValue(null);
});
test('unstable Clerk token function does not trigger refresh loops', async () => {
  const h = await renderHook(() => useReadingChallenge('reading-demo'));
  await waitFor(() => expect(h.result.current.busy).toBe(false));
  for (let i = 0; i < 4; i++) await h.rerender({});
  expect(fetchDetail).toHaveBeenCalledTimes(1);
});
test('cold offline restart restores controls and saves pages before sending', async () => {
  mockDisk['dvg.readingDetail.demo-reader.reading-demo'] = server;
  jest.mocked(readingNative.snapshot).mockResolvedValue(local);
  fetchDetail.mockRejectedValue(new Error('offline')); send.mockRejectedValue(new Error('offline'));
  const h = await renderHook(() => useReadingChallenge('reading-demo'));
  await waitFor(() => expect(h.result.current.error).toContain('Нет подтверждения сервера'));
  expect(h.result.current.data?.id).toBe('reading-demo'); expect(h.result.current.awaitingPages).toBe(true);
  await act(async () => { await h.result.current.report(22); });
  expect(mockDisk[READING_OUTBOX_KEY].commands.map((c: any) => [c.action, c.pages ?? c.elapsedMs])).toEqual([['stop', 1800000], ['report', 22]]);
  const writes = jest.mocked(saveJSON).mock.invocationCallOrder;
  expect(writes[writes.length - 1]).toBeLessThan(send.mock.invocationCallOrder[0]);
});
test('pause is local even while the network request has not returned', async () => {
  mockDisk['dvg.readingDetail.demo-reader.reading-demo'] = server;
  jest.mocked(readingNative.snapshot).mockResolvedValue({ ...local, status: 'running' });
  let finish!: (value: typeof server) => void;
  fetchDetail.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  jest.mocked(readingNative.pause).mockResolvedValue(local);
  const h = await renderHook(() => useReadingChallenge('reading-demo'));
  await waitFor(() => expect(fetchDetail).toHaveBeenCalled());
  await act(async () => { await h.result.current.pause(); });
  expect(readingNative.pause).toHaveBeenCalledTimes(1);
  await act(async () => { finish(server); });
});
test('late response cannot replace a different challenge', async () => {
  let finish!: (value: typeof readingFixture) => void;
  fetchDetail.mockImplementation((_token, id) => id === 'old' ? new Promise(resolve => { finish = resolve; }) : Promise.resolve({ ...readingFixture, id }));
  const h = await renderHook<ReturnType<typeof useReadingChallenge>, { id: string }>(({ id }) => useReadingChallenge(id), { initialProps: { id: 'old' } });
  await waitFor(() => expect(fetchDetail).toHaveBeenCalled());
  await h.rerender({ id: 'new' });
  await waitFor(() => expect(h.result.current.data?.id).toBe('new'));
  await act(async () => { finish({ ...readingFixture, id: 'old' }); });
  expect(h.result.current.data?.id).toBe('new');
});
test('logout clears the reading screen and does not load previous account cache', async () => {
  const h = await renderHook(() => useReadingChallenge('reading-demo'));
  await waitFor(() => expect(h.result.current.data).not.toBeNull());
  mockAccount = ''; await h.rerender({});
  expect(h.result.current.data).toBeNull(); expect(h.result.current.busy).toBe(false);
});
test('late previous-account response cannot replace the signed-in account or acknowledge its session', async () => {
  let finish!: (value: typeof server) => void;
  fetchDetail.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  const h = await renderHook(() => useReadingChallenge('reading-demo'));
  await waitFor(() => expect(fetchDetail).toHaveBeenCalledTimes(1));
  mockAccount = 'next-account'; await h.rerender({});
  await waitFor(() => expect(h.result.current.data).toEqual(readingFixture));
  await act(async () => { finish(server); });
  expect(h.result.current.data).toEqual(readingFixture);
  expect(readingNative.acknowledge).not.toHaveBeenCalled();
  expect(mockDisk['dvg.readingDetail.next-account.reading-demo']).toEqual(readingFixture);
});
test('server-confirmed own paused session is acknowledged, unconfirmed empty real session is retained', async () => {
  jest.mocked(readingNative.snapshot).mockResolvedValue({ ...local, elapsedMs: 0 });
  const h = await renderHook(() => useReadingChallenge('reading-demo'));
  await waitFor(() => expect(h.result.current.busy).toBe(false));
  expect(readingNative.acknowledge).not.toHaveBeenCalled();
  expect(h.result.current.sessionNotice?.kind).toBe('other-challenge');
  fetchDetail.mockResolvedValue({ ...readingFixture, reportedSessionIds: ['s1'] });
  await act(async () => { await h.result.current.retry(); });
  expect(readingNative.acknowledge).toHaveBeenCalledWith('demo-reader', 's1');
  expect(h.result.current.sessionNotice).toBeUndefined();
});
test('foreign native session is a nonblocking notice, never a network error or a reset', async () => {
  const foreign = { ...local, accountId: 'another-reader', status: 'running' as const };
  jest.mocked(readingNative.snapshot).mockResolvedValue(foreign);
  const h = await renderHook(() => useReadingChallenge('reading-demo'));
  await waitFor(() => expect(h.result.current.busy).toBe(false));
  expect(h.result.current.data?.id).toBe('reading-demo');
  expect(h.result.current.error).toBeUndefined();
  expect(h.result.current.sessionNotice?.kind).toBe('other-account');
  expect(h.result.current.startBlocked).toBe(true);
  await act(async () => { await h.result.current.pause(); await h.result.current.retry(); });
  expect(readingNative.pause).not.toHaveBeenCalled();
  expect(readingNative.acknowledge).not.toHaveBeenCalled();
  expect(send).not.toHaveBeenCalled();
  await act(async () => { await h.result.current.start('Новая книга'); });
  expect(readingNative.start).not.toHaveBeenCalled(); expect(send).not.toHaveBeenCalled();
});
test('pending commands of another account do not prevent challenge loading or captain applications', async () => {
  const foreignReport = { action: 'report', operationId: 'foreign-report', challengeId: 'old', sessionId: 'old-session', pages: 22 };
  mockDisk[READING_OUTBOX_KEY] = { accountId: 'another-reader', commands: [foreignReport] };
  const h = await renderHook(() => useReadingChallenge('reading-demo'));
  await waitFor(() => expect(h.result.current.data?.id).toBe('reading-demo'));
  await act(async () => { await h.result.current.join('team-2'); });
  expect(send.mock.calls.map(c => c[1].action)).toEqual(['apply']);
  expect(mockDisk[READING_OUTBOX_KEY].otherAccounts).toEqual([{ accountId: 'another-reader', commands: [foreignReport] }]);
});
test('current account upload failure still refreshes challenge and retry preserves exact payload', async () => {
  const report = { action: 'report', operationId: 'offline-report', challengeId: 'reading-demo', sessionId: 's1', pages: 22 };
  mockDisk[READING_OUTBOX_KEY] = { accountId: 'demo-reader', commands: [report] };
  send.mockRejectedValueOnce(new Error('offline'));
  const h = await renderHook(() => useReadingChallenge('reading-demo'));
  await waitFor(() => expect(h.result.current.error).toContain('Нет подтверждения сервера'));
  expect(h.result.current.data?.id).toBe('reading-demo');
  expect(mockDisk[READING_OUTBOX_KEY].commands).toEqual([report]);
  await act(async () => { await h.result.current.retry(); });
  expect(h.result.current.error).toBeUndefined();
  expect(send.mock.calls.map(c => c[1])).toEqual([report, report]);
});
test('local storage failure does not prevent server teams from loading and can be retried', async () => {
  jest.mocked(readingNative.snapshot).mockRejectedValue(new Error('Не удалось завершить очистку проверочного таймера'));
  const h = await renderHook(() => useReadingChallenge('reading-demo'));
  await waitFor(() => expect(h.result.current.busy).toBe(false));
  expect(h.result.current.data?.id).toBe('reading-demo');
  expect(h.result.current.error).toContain('очистку проверочного таймера');
  jest.mocked(readingNative.snapshot).mockResolvedValue(null);
  await act(async () => { await h.result.current.retry(); });
  expect(h.result.current.error).toBeUndefined();
});
test('a recovered upload does not leave a stale offline error after the queue drains', async () => {
  const stop = { action: 'stop', operationId: await readingOperationId('s1', 'stop'), challengeId: 'reading-demo',
    sessionId: 's1', deviceId: 'phone', elapsedMs: 1800000, integrity: 'ok' };
  mockDisk[READING_OUTBOX_KEY] = { accountId: 'demo-reader', commands: [stop] };
  send.mockRejectedValueOnce(new Error('offline'));
  fetchDetail.mockResolvedValue(server); jest.mocked(readingNative.snapshot).mockResolvedValue(local);
  const h = await renderHook(() => useReadingChallenge('reading-demo'));
  await waitFor(() => expect(h.result.current.busy).toBe(false));
  expect(send).toHaveBeenCalledTimes(2); expect(mockDisk[READING_OUTBOX_KEY].commands).toEqual([]);
  expect(h.result.current.error).toBeUndefined();
});
test('switching back to the owner restores local elapsed time and sends only their stop evidence', async () => {
  mockAccount = 'another-reader';
  jest.mocked(readingNative.snapshot).mockResolvedValue(local);
  fetchDetail.mockImplementation(async () => mockAccount === 'demo-reader' ? server : readingFixture);
  const h = await renderHook(() => useReadingChallenge('reading-demo'));
  await waitFor(() => expect(h.result.current.sessionNotice?.kind).toBe('other-account'));
  mockAccount = 'demo-reader'; await h.rerender({});
  await waitFor(() => expect(h.result.current.busy).toBe(false));
  expect(h.result.current.sessionNotice).toBeUndefined(); expect(h.result.current.awaitingPages).toBe(true);
  expect(send.mock.calls.map(c => [c[1].action, c[1].elapsedMs])).toEqual([['stop', 1800000]]);
  expect(readingNative.acknowledge).not.toHaveBeenCalled();
});
test('retry clears a resolved native conflict and keeps the current challenge accessible', async () => {
  jest.mocked(readingNative.snapshot).mockResolvedValue({ ...local, accountId: 'other' });
  const h = await renderHook(() => useReadingChallenge('reading-demo'));
  await waitFor(() => expect(h.result.current.sessionNotice).toBeDefined());
  jest.mocked(readingNative.snapshot).mockResolvedValue(null);
  await act(async () => { await h.result.current.retry(); });
  expect(h.result.current.sessionNotice).toBeUndefined(); expect(h.result.current.startBlocked).toBe(false);
});
test('a running QA timer is explained specifically, not mistaken for a user account', async () => {
  jest.mocked(readingNative.snapshot).mockResolvedValue({ ...local, accountId: 'qa-no-real-account', deviceId: 'qa-iphone',
    book: 'Проверка блокировки', budgetMs: 60000, status: 'running' });
  const h = await renderHook(() => useReadingChallenge('reading-demo'));
  await waitFor(() => expect(h.result.current.busy).toBe(false));
  expect(h.result.current.sessionNotice?.kind).toBe('test-running'); expect(h.result.current.error).toBeUndefined();
  expect(readingNative.pause).not.toHaveBeenCalled(); expect(readingNative.acknowledge).not.toHaveBeenCalled();
});
