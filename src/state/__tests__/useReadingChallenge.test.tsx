import { act, renderHook, waitFor } from '@testing-library/react-native';
import { readingOperationId, useReadingChallenge } from '../useReadingChallenge';
import { readingFixture } from '../../storybook/readingFixtures';
import { fetchReadingDetail, sendReadingCommand } from '../../data/reading';
import { readingNative } from '../readingNative';
import { READING_OUTBOX_KEY } from '../readingOutbox';
import { saveJSON } from '../persist';
import { AppState, AppStateStatus } from 'react-native';

let mockAccount = 'demo-reader';
let mockDisk: Record<string, any> = {};
jest.mock('@clerk/clerk-expo', () => ({ useAuth: () => ({ userId: mockAccount, getToken: async () => 'token' }) }));
jest.mock('../../data/api', () => ({ API_BASE: 'https://example.test' }));
jest.mock('../../data/reading', () => ({ ...jest.requireActual('../../data/reading'), fetchReadingDetail: jest.fn(), sendReadingCommand: jest.fn() }));
jest.mock('../persist', () => ({ loadJSON: jest.fn(async (key, fallback) => mockDisk[key] ?? fallback),
  readJSON: jest.fn(async (key, fallback) => ({ ok: true, value: mockDisk[key] ?? fallback })),
  saveJSON: jest.fn(async (key, value) => { mockDisk[key] = JSON.parse(JSON.stringify(value)); }) }));
jest.mock('../readingNative', () => ({ ...jest.requireActual('../readingNative'), readingNative: { capabilities: jest.fn(),
  snapshot: jest.fn(async () => null), remainingMs: jest.fn(async () => 1800000), pause: jest.fn(), start: jest.fn(), acknowledge: jest.fn(), authorize: jest.fn(), selectApps: jest.fn(),
  reconcileLiveActivity: jest.fn(), restoreLiveActivity: jest.fn(), configurePageReminder: jest.fn(async () => {}) } }));
jest.mock('expo-crypto', () => ({ CryptoDigestAlgorithm: { SHA256: 'SHA256' },
  digestStringAsync: async (algorithm: string, value: string) => value.includes('report') ? 'b'.repeat(64) : 'a'.repeat(64), randomUUID: () => 'random-id' }));
const fetchDetail = jest.mocked(fetchReadingDetail), send = jest.mocked(sendReadingCommand);
const local = { accountId: 'demo-reader', sessionId: 's1', deviceId: 'phone', book: 'Книга', budgetMs: 3600000,
  anchorMs: 1, bootId: 'boot', elapsedMs: 1800000, integrity: 'ok' as const, status: 'paused' as const };
const server = { ...readingFixture, session: { id: 's1', deviceId: 'phone', day: 1, book: 'Книга', budgetMs: 3600000,
  startedAt: '2026-11-01T00:00:00Z', elapsedMs: null, status: 'running' as const } };
const selectedCapabilities = { available: true, authorized: true, selectedCount: 1, platform: 'ios', blockingMode: 'selected' as const };
test('an unreported server approach blocks any new timer even without a local journal', async () => {
  fetchDetail.mockResolvedValue({ ...server, session: { ...server.session, status: 'awaiting_pages', elapsedMs: 3600000 } });
  const h = await renderHook(() => useReadingChallenge('reading-demo'));
  await waitFor(() => expect(h.result.current.busy).toBe(false));
  expect(h.result.current.awaitingPages).toBe(true); expect(h.result.current.startBlocked).toBe(true);
  await act(async () => { await h.result.current.start('Другая книга'); });
  expect(send).not.toHaveBeenCalled(); expect(readingNative.start).not.toHaveBeenCalled();
  expect(h.result.current.error).toMatch(/сохраните страницы/);
});
test('reminder routing is attached only to the matching owner and server approach', async () => {
  fetchDetail.mockResolvedValue(server);
  jest.mocked(readingNative.snapshot).mockResolvedValue({ ...local, status: 'running' });
  const h = await renderHook(() => useReadingChallenge('reading-demo'));
  await waitFor(() => expect(h.result.current.busy).toBe(false));
  expect(readingNative.configurePageReminder).toHaveBeenCalledWith('demo-reader', 's1', 'reading-demo');
  jest.mocked(readingNative.configurePageReminder).mockClear();
  jest.mocked(readingNative.snapshot).mockResolvedValue({ ...local, accountId: 'another-account' });
  await act(async () => { await h.result.current.retry(); });
  expect(readingNative.configurePageReminder).not.toHaveBeenCalled();
});
beforeEach(() => { jest.clearAllMocks(); mockAccount = 'demo-reader'; mockDisk = {};
  jest.spyOn(AppState, 'addEventListener').mockImplementation(() => ({ remove: jest.fn() }));
  fetchDetail.mockReset().mockResolvedValue(readingFixture); send.mockReset().mockResolvedValue({ ok: true });
  jest.mocked(readingNative.capabilities).mockReset().mockResolvedValue(selectedCapabilities);
  jest.mocked(readingNative.snapshot).mockReset().mockResolvedValue(null);
  jest.mocked(readingNative.pause).mockReset().mockResolvedValue(null);
  jest.mocked(readingNative.start).mockReset();
  jest.mocked(readingNative.authorize).mockReset().mockResolvedValue(undefined);
  jest.mocked(readingNative.selectApps).mockReset().mockResolvedValue(undefined);
  jest.mocked(readingNative.acknowledge).mockReset().mockResolvedValue(undefined);
  jest.mocked(readingNative.reconcileLiveActivity).mockReset().mockResolvedValue({ state: 'unsupported', canRestore: false });
  jest.mocked(readingNative.restoreLiveActivity).mockReset().mockResolvedValue({ state: 'unsupported', canRestore: false });
});

test('a missing card is reconciled offline and recreated only by an explicit owner action', async () => {
  fetchDetail.mockRejectedValue(new Error('offline'));
  jest.mocked(readingNative.snapshot).mockResolvedValue({ ...local, status: 'running' });
  jest.mocked(readingNative.reconcileLiveActivity).mockResolvedValue({ state: 'missing', canRestore: true });
  jest.mocked(readingNative.restoreLiveActivity).mockResolvedValue({ state: 'active', canRestore: false, activityId: 'card-1' });
  const h = await renderHook(() => useReadingChallenge('reading-demo'));
  await waitFor(() => expect(h.result.current.liveActivityStatus?.state).toBe('missing'));
  expect(h.result.current.data).toBeNull();
  expect(readingNative.restoreLiveActivity).not.toHaveBeenCalled();
  await act(async () => { await h.result.current.restoreLiveActivity(); });
  expect(readingNative.restoreLiveActivity).toHaveBeenCalledWith('demo-reader', 's1');
  expect(h.result.current.liveActivityStatus?.state).toBe('active');
  expect(readingNative.start).not.toHaveBeenCalled();
  expect(send).not.toHaveBeenCalled();
  expect(readingNative.acknowledge).not.toHaveBeenCalled();
});
test('foreground reconciles an existing card without recreating a dismissed card', async () => {
  let foreground: ((state: AppStateStatus) => void) | undefined;
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_event, callback) => {
    foreground = callback; return { remove: jest.fn() };
  });
  fetchDetail.mockResolvedValue(server);
  jest.mocked(readingNative.snapshot).mockResolvedValue({ ...local, status: 'running' });
  jest.mocked(readingNative.reconcileLiveActivity).mockResolvedValue({ state: 'active', canRestore: false });
  const h = await renderHook(() => useReadingChallenge('reading-demo'));
  await waitFor(() => expect(h.result.current.busy).toBe(false));
  expect(readingNative.reconcileLiveActivity).toHaveBeenCalledTimes(1);
  jest.mocked(readingNative.reconcileLiveActivity).mockResolvedValue({ state: 'missing', canRestore: true });
  await act(async () => { foreground?.('active'); });
  await waitFor(() => expect(h.result.current.liveActivityStatus?.state).toBe('missing'));
  expect(readingNative.reconcileLiveActivity).toHaveBeenCalledTimes(2);
  expect(readingNative.restoreLiveActivity).not.toHaveBeenCalled();
});
test('foreground card recovery remains local while a server request is stalled', async () => {
  let foreground: ((state: AppStateStatus) => void) | undefined;
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_event, callback) => {
    foreground = callback; return { remove: jest.fn() };
  });
  let finish!: (value: typeof server) => void;
  fetchDetail.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  jest.mocked(readingNative.snapshot).mockResolvedValue({ ...local, status: 'running' });
  jest.mocked(readingNative.reconcileLiveActivity).mockResolvedValue({ state: 'active', canRestore: false });
  jest.mocked(readingNative.restoreLiveActivity).mockResolvedValue({ state: 'active', canRestore: false });
  const h = await renderHook(() => useReadingChallenge('reading-demo'));
  await waitFor(() => expect(fetchDetail).toHaveBeenCalledTimes(1));
  expect(h.result.current.busy).toBe(true);
  jest.mocked(readingNative.reconcileLiveActivity).mockResolvedValue({ state: 'missing', canRestore: true });
  await act(async () => { foreground?.('active'); });
  await waitFor(() => expect(h.result.current.liveActivityStatus?.state).toBe('missing'));
  expect(h.result.current.busy).toBe(true);
  expect(fetchDetail).toHaveBeenCalledTimes(1);
  expect(readingNative.restoreLiveActivity).not.toHaveBeenCalled();
  await act(async () => { await h.result.current.restoreLiveActivity(); });
  expect(readingNative.restoreLiveActivity).toHaveBeenCalledWith('demo-reader', 's1');
  await act(async () => { finish(server); });
});
test('the one-second timer reads do not update or recreate the card', async () => {
  jest.useFakeTimers();
  try {
    fetchDetail.mockResolvedValue(server);
    jest.mocked(readingNative.snapshot).mockResolvedValue({ ...local, status: 'running' });
    jest.mocked(readingNative.reconcileLiveActivity).mockResolvedValue({ state: 'active', canRestore: false });
    const h = await renderHook(() => useReadingChallenge('reading-demo'));
    await waitFor(() => expect(h.result.current.busy).toBe(false));
    const reconciles = jest.mocked(readingNative.reconcileLiveActivity).mock.calls.length;
    for (let i = 0; i < 4; i++) await act(async () => { jest.advanceTimersByTime(1000); });
    expect(readingNative.reconcileLiveActivity).toHaveBeenCalledTimes(reconciles);
    expect(readingNative.restoreLiveActivity).not.toHaveBeenCalled();
    await h.unmount();
  } finally { jest.useRealTimers(); }
});
test.each(['disabled', 'unsupported'] as const)('a %s card cannot be restored through the hook', async state => {
  jest.mocked(readingNative.snapshot).mockResolvedValue({ ...local, status: 'running' });
  jest.mocked(readingNative.reconcileLiveActivity).mockResolvedValue({ state, canRestore: false });
  const h = await renderHook(() => useReadingChallenge('reading-demo'));
  await waitFor(() => expect(h.result.current.liveActivityStatus?.state).toBe(state));
  await act(async () => { await h.result.current.restoreLiveActivity(); });
  expect(readingNative.restoreLiveActivity).not.toHaveBeenCalled();
});
test('a foreign session is ignored and an own paused card only reconciles without offering restore', async () => {
  jest.mocked(readingNative.snapshot).mockResolvedValue({ ...local, status: 'running', accountId: 'someone-else' });
  const h = await renderHook(() => useReadingChallenge('reading-demo'));
  await waitFor(() => expect(h.result.current.busy).toBe(false));
  expect(h.result.current.liveActivityStatus).toBeNull();
  expect(readingNative.reconcileLiveActivity).not.toHaveBeenCalled();
  jest.mocked(readingNative.snapshot).mockResolvedValue(local);
  jest.mocked(readingNative.reconcileLiveActivity).mockResolvedValue({ state: 'paused', canRestore: false });
  await act(async () => { await h.result.current.retry(); });
  expect(h.result.current.liveActivityStatus).toBeNull();
  expect(readingNative.reconcileLiveActivity).toHaveBeenCalledWith('demo-reader', 's1');
  expect(readingNative.restoreLiveActivity).not.toHaveBeenCalled();
});
test('a lock-screen pause freezes the app immediately on foreground despite a stalled server', async () => {
  jest.useFakeTimers();
  try {
    mockDisk['dvg.readingDetail.demo-reader.reading-demo'] = server;
    let foreground: ((state: AppStateStatus) => void) | undefined;
    jest.spyOn(AppState, 'addEventListener').mockImplementation((_event, callback) => {
      foreground = callback; return { remove: jest.fn() };
    });
    let fail!: (reason: Error) => void;
    fetchDetail.mockImplementation(() => new Promise((_resolve, reject) => { fail = reject; }));
    jest.mocked(readingNative.snapshot).mockResolvedValue({ ...local, status: 'running', elapsedMs: null });
    const h = await renderHook(() => useReadingChallenge('reading-demo'));
    await waitFor(() => expect(h.result.current.timerState).toBe('running'));
    await waitFor(() => expect(fetchDetail).toHaveBeenCalledTimes(1));
    expect(h.result.current.busy).toBe(true);
    const pausedElapsed = 123456;
    jest.mocked(readingNative.snapshot).mockResolvedValue({ ...local, elapsedMs: pausedElapsed, targetMs: 1800000 });
    jest.mocked(readingNative.reconcileLiveActivity).mockResolvedValue({ state: 'paused', canRestore: false });
    await act(async () => { foreground?.('active'); });
    expect(h.result.current.timerState).toBe('paused');
    expect(h.result.current.awaitingPages).toBe(true);
    expect(h.result.current.remainingMs).toBe(1800000 - pausedElapsed);
    expect(h.result.current.canPauseLocally).toBe(false);
    expect(h.result.current.liveActivityStatus).toBeNull();
    const frozen = h.result.current.remainingMs;
    for (let i = 0; i < 5; i++) await act(async () => { jest.advanceTimersByTime(1000); });
    expect(h.result.current.remainingMs).toBe(frozen);
    expect(send).not.toHaveBeenCalled();
    expect(readingNative.start).not.toHaveBeenCalled();
    expect(readingNative.restoreLiveActivity).not.toHaveBeenCalled();
    await act(async () => { fail(new Error('offline')); });
    expect(h.result.current.timerState).toBe('paused');
    expect(h.result.current.remainingMs).toBe(frozen);
    const reconciles = jest.mocked(readingNative.reconcileLiveActivity).mock.calls.length;
    fetchDetail.mockRejectedValue(new Error('offline'));
    for (let i = 0; i < 4; i++) await act(async () => { jest.advanceTimersByTime(1000); });
    expect(readingNative.reconcileLiveActivity).toHaveBeenCalledTimes(reconciles);
    expect(h.result.current.remainingMs).toBe(frozen);
    await h.unmount();
  } finally { jest.useRealTimers(); }
});
test('restore rechecks the actual session before requesting a replacement', async () => {
  fetchDetail.mockRejectedValue(new Error('offline'));
  jest.mocked(readingNative.snapshot).mockResolvedValue({ ...local, status: 'running' });
  jest.mocked(readingNative.reconcileLiveActivity).mockResolvedValue({ state: 'missing', canRestore: true });
  const h = await renderHook(() => useReadingChallenge('reading-demo'));
  await waitFor(() => expect(h.result.current.liveActivityStatus?.state).toBe('missing'));
  jest.mocked(readingNative.snapshot).mockResolvedValue({ ...local, status: 'running', accountId: 'someone-else' });
  await act(async () => { await h.result.current.restoreLiveActivity(); });
  expect(readingNative.restoreLiveActivity).not.toHaveBeenCalled();
  expect(h.result.current.liveActivityStatus).toBeNull();
  expect(h.result.current.canPauseLocally).toBe(false);
});
test('a pending restore never blocks local pause or brings its old card status back', async () => {
  fetchDetail.mockRejectedValue(new Error('offline'));
  jest.mocked(readingNative.snapshot).mockResolvedValue({ ...local, status: 'running' });
  jest.mocked(readingNative.pause).mockResolvedValue(local);
  jest.mocked(readingNative.reconcileLiveActivity).mockResolvedValue({ state: 'missing', canRestore: true });
  let finish!: (value: { state: 'active'; canRestore: boolean }) => void;
  jest.mocked(readingNative.restoreLiveActivity).mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  const h = await renderHook(() => useReadingChallenge('reading-demo'));
  await waitFor(() => expect(h.result.current.liveActivityStatus?.state).toBe('missing'));
  let restored!: Promise<void>;
  await act(async () => { restored = h.result.current.restoreLiveActivity(); });
  expect(h.result.current.liveActivityBusy).toBe(true);
  await act(async () => { await h.result.current.pauseLocally(); });
  expect(readingNative.pause).toHaveBeenCalledTimes(1);
  expect(h.result.current.liveActivityStatus).toBeNull();
  await act(async () => { finish({ state: 'active', canRestore: false }); await restored; });
  expect(h.result.current.liveActivityStatus).toBeNull();
  expect(h.result.current.liveActivityBusy).toBe(false);
  expect(send).not.toHaveBeenCalled();
});
test('failed card operations remain inline and do not stop or zero-credit a reading session', async () => {
  fetchDetail.mockResolvedValue(server);
  jest.mocked(readingNative.snapshot).mockResolvedValue({ ...local, status: 'running' });
  jest.mocked(readingNative.reconcileLiveActivity).mockRejectedValue(new Error('ActivityKit'));
  jest.mocked(readingNative.restoreLiveActivity).mockRejectedValue(new Error('ActivityKit'));
  const h = await renderHook(() => useReadingChallenge('reading-demo'));
  await waitFor(() => expect(h.result.current.busy).toBe(false));
  expect(h.result.current.liveActivityStatus?.state).toBe('error');
  await act(async () => { await h.result.current.restoreLiveActivity(); });
  expect(h.result.current.liveActivityStatus?.state).toBe('error');
  expect(h.result.current.liveActivityBusy).toBe(false);
  expect(h.result.current.error).toBeUndefined();
  expect(h.result.current.timerState).toBe('running');
  expect(readingNative.pause).not.toHaveBeenCalled();
  expect(send).not.toHaveBeenCalled();
});
test('account switching rejects the old restore handler and discards a late card response', async () => {
  fetchDetail.mockRejectedValue(new Error('offline'));
  jest.mocked(readingNative.snapshot).mockResolvedValue({ ...local, status: 'running' });
  jest.mocked(readingNative.reconcileLiveActivity).mockResolvedValue({ state: 'missing', canRestore: true });
  let finish!: (value: { state: 'active'; canRestore: boolean }) => void;
  jest.mocked(readingNative.restoreLiveActivity).mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  const h = await renderHook(() => useReadingChallenge('reading-demo'));
  await waitFor(() => expect(h.result.current.liveActivityStatus?.state).toBe('missing'));
  const oldRestore = h.result.current.restoreLiveActivity;
  let restored!: Promise<void>;
  await act(async () => { restored = oldRestore(); });
  mockAccount = 'another-reader';
  await h.rerender({});
  await act(async () => { finish({ state: 'active', canRestore: false }); await restored; await oldRestore(); await h.result.current.restoreLiveActivity(); });
  expect(readingNative.restoreLiveActivity).toHaveBeenCalledTimes(1);
  expect(h.result.current.liveActivityStatus).toBeNull();
  expect(h.result.current.liveActivityBusy).toBe(false);
});

test.each([
  ['all-apps', 0, true, true, 'ready'],
  ['all-apps', 4, true, true, 'ready'],
  ['selected', 0, true, true, 'selection'],
  ['selected', 2, true, true, 'ready'],
  ['all-apps', 0, false, true, 'permission'],
  ['all-apps', 0, true, false, 'unavailable'],
] as const)('protection honors %s with count=%s, authorized=%s, available=%s', async (blockingMode, selectedCount, authorized, available, protection) => {
  jest.mocked(readingNative.capabilities).mockResolvedValue({ ...selectedCapabilities, blockingMode, selectedCount, authorized, available });
  const h = await renderHook(() => useReadingChallenge('reading-demo'));
  await waitFor(() => expect(h.result.current.busy).toBe(false));
  expect(h.result.current.protection).toBe(protection);
  expect(h.result.current.blockingMode).toBe(blockingMode);
});

test('strict preparation requests authorization without opening a selection picker', async () => {
  const caps = { ...selectedCapabilities, blockingMode: 'all-apps' as const, selectedCount: 0, authorized: false };
  jest.mocked(readingNative.capabilities).mockResolvedValue(caps);
  jest.mocked(readingNative.authorize).mockImplementation(async () => {
    jest.mocked(readingNative.capabilities).mockResolvedValue({ ...caps, authorized: true });
  });
  const h = await renderHook(() => useReadingChallenge('reading-demo'));
  await waitFor(() => expect(h.result.current.busy).toBe(false));
  await act(async () => { await h.result.current.prepare(); await h.result.current.prepare(); });
  expect(readingNative.authorize).toHaveBeenCalledTimes(1);
  expect(readingNative.selectApps).not.toHaveBeenCalled();
  expect(h.result.current.protection).toBe('ready');
});

test('selected mode still opens the picker and cannot start without a selection', async () => {
  jest.mocked(readingNative.capabilities).mockResolvedValue({ ...selectedCapabilities, selectedCount: 0 });
  const h = await renderHook(() => useReadingChallenge('reading-demo'));
  await waitFor(() => expect(h.result.current.busy).toBe(false));
  await act(async () => { await h.result.current.prepare(); await h.result.current.start('Книга'); });
  expect(readingNative.selectApps).toHaveBeenCalledTimes(1);
  expect(readingNative.start).not.toHaveBeenCalled();
  expect(send).not.toHaveBeenCalled();
});

test('strict authorized mode starts with zero selected apps and preserves server-confirmed timing', async () => {
  mockDisk['dvg.readingDevice.v1'] = 'phone';
  jest.mocked(readingNative.capabilities).mockResolvedValue({ ...selectedCapabilities, blockingMode: 'all-apps', selectedCount: 0 });
  send.mockImplementation(async (_token, command) => {
    if (command.action === 'start') fetchDetail.mockResolvedValue({ ...server, session: { ...server.session, id: 'random-id' } });
    return { ok: true };
  });
  jest.mocked(readingNative.start).mockResolvedValue({ ...local, sessionId: 'random-id', status: 'running', blockingMode: 'all-apps', elapsedMs: null });
  const h = await renderHook(() => useReadingChallenge('reading-demo'));
  await waitFor(() => expect(h.result.current.busy).toBe(false));
  await act(async () => { await h.result.current.start('Книга'); });
  expect(readingNative.start).toHaveBeenCalledWith('demo-reader', 'random-id', 'phone', 'Книга', 3600000, 2400000);
  expect(h.result.current.error).toBeUndefined();
  expect(h.result.current.timerState).toBe('running');
  expect(h.result.current.blockingMode).toBe('all-apps');
  expect(readingNative.selectApps).not.toHaveBeenCalled();
  expect(send.mock.calls.map(c => c[1].action)).toEqual(['start']);
});

test.each([undefined, 'selected', 'all-apps'] as const)('an existing session keeps its own %s policy after a strict-mode update', async blockingMode => {
  fetchDetail.mockResolvedValue(server);
  jest.mocked(readingNative.capabilities).mockResolvedValue({ ...selectedCapabilities, blockingMode: 'all-apps', selectedCount: 0 });
  jest.mocked(readingNative.snapshot).mockResolvedValue({ ...local, status: 'running', blockingMode });
  const h = await renderHook(() => useReadingChallenge('reading-demo'));
  await waitFor(() => expect(h.result.current.timerState).toBe('running'));
  expect(h.result.current.blockingMode).toBe(blockingMode ?? 'selected');
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
test.each(['missing', 'corrupt'] as const)('cold offline restart with %s detail cache still offers an owner-only local pause', async cache => {
  if (cache === 'corrupt') mockDisk['dvg.readingDetail.demo-reader.reading-demo'] = { broken: true };
  fetchDetail.mockRejectedValue(new Error('offline'));
  jest.mocked(readingNative.snapshot).mockResolvedValue({ ...local, status: 'running', blockingMode: 'all-apps' });
  jest.mocked(readingNative.pause).mockResolvedValue({ ...local, blockingMode: 'all-apps' });
  const h = await renderHook(() => useReadingChallenge('reading-demo'));
  await waitFor(() => expect(h.result.current.error).toContain('Нет подтверждения сервера'));
  expect(h.result.current.data).toBeNull();
  expect(h.result.current.canPauseLocally).toBe(true);
  await act(async () => { await h.result.current.pauseLocally(); });
  expect(readingNative.pause).toHaveBeenCalledTimes(1);
  expect(h.result.current.canPauseLocally).toBe(false);
  expect(h.result.current.awaitingPages).toBe(false);
  expect(h.result.current.sessionNotice).toBeUndefined();
  expect(send).not.toHaveBeenCalled();
  expect(readingNative.acknowledge).not.toHaveBeenCalled();
  expect(mockDisk[READING_OUTBOX_KEY]?.commands ?? []).toEqual([]);
});
test('cold native ownership enables emergency pause before a server request returns', async () => {
  jest.mocked(readingNative.snapshot).mockResolvedValue({ ...local, status: 'running' });
  jest.mocked(readingNative.pause).mockResolvedValue(local);
  let finish!: (value: typeof readingFixture) => void;
  fetchDetail.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  const h = await renderHook(() => useReadingChallenge('reading-demo'));
  await waitFor(() => expect(h.result.current.canPauseLocally).toBe(true));
  expect(h.result.current.data).toBeNull(); expect(h.result.current.busy).toBe(true);
  await act(async () => { await h.result.current.pauseLocally(); });
  expect(readingNative.pause).toHaveBeenCalledTimes(1);
  expect(send).not.toHaveBeenCalled(); expect(readingNative.acknowledge).not.toHaveBeenCalled();
  jest.mocked(readingNative.snapshot).mockResolvedValue(local);
  await act(async () => { finish(readingFixture); });
});
test('an emergency pause for another challenge preserves its evidence without crediting the open page', async () => {
  jest.mocked(readingNative.snapshot).mockResolvedValue({ ...local, status: 'running' });
  jest.mocked(readingNative.pause).mockResolvedValue(local);
  const h = await renderHook(() => useReadingChallenge('reading-demo'));
  await waitFor(() => expect(h.result.current.sessionNotice?.kind).toBe('other-challenge'));
  expect(h.result.current.canPauseLocally).toBe(true);
  await act(async () => { await h.result.current.pauseLocally(); });
  expect(readingNative.pause).toHaveBeenCalledTimes(1);
  expect(h.result.current.canPauseLocally).toBe(false);
  expect(h.result.current.sessionNotice?.kind).toBe('other-challenge');
  expect(send).not.toHaveBeenCalled(); expect(readingNative.acknowledge).not.toHaveBeenCalled();
  expect(mockDisk[READING_OUTBOX_KEY]?.commands ?? []).toEqual([]);
});
test('switching accounts removes emergency-pause authority and rejects the previous handler', async () => {
  fetchDetail.mockRejectedValue(new Error('offline'));
  jest.mocked(readingNative.snapshot).mockResolvedValue({ ...local, status: 'running' });
  const h = await renderHook(() => useReadingChallenge('reading-demo'));
  await waitFor(() => expect(h.result.current.canPauseLocally).toBe(true));
  const previousPause = h.result.current.pauseLocally;
  mockAccount = 'another-reader';
  await h.rerender({});
  expect(h.result.current.canPauseLocally).toBe(false);
  await waitFor(() => expect(h.result.current.busy).toBe(false));
  await act(async () => { await previousPause(); await h.result.current.pauseLocally(); });
  expect(readingNative.pause).not.toHaveBeenCalled();
  expect(send).not.toHaveBeenCalled(); expect(readingNative.acknowledge).not.toHaveBeenCalled();
});
test('emergency pause rechecks ownership when the native session changes after rendering', async () => {
  fetchDetail.mockRejectedValue(new Error('offline'));
  jest.mocked(readingNative.snapshot).mockResolvedValue({ ...local, status: 'running' });
  const h = await renderHook(() => useReadingChallenge('reading-demo'));
  await waitFor(() => expect(h.result.current.canPauseLocally).toBe(true));
  jest.mocked(readingNative.snapshot).mockResolvedValue({ ...local, accountId: 'another-reader', status: 'running' });
  await act(async () => { await h.result.current.pauseLocally(); });
  expect(h.result.current.canPauseLocally).toBe(false);
  expect(readingNative.pause).not.toHaveBeenCalled();
  expect(send).not.toHaveBeenCalled(); expect(readingNative.acknowledge).not.toHaveBeenCalled();
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
test('pause still lifts native protection when snapshot fails and the network is pending', async () => {
  mockDisk['dvg.readingDetail.demo-reader.reading-demo'] = server;
  jest.mocked(readingNative.snapshot).mockResolvedValue({ ...local, status: 'running', blockingMode: 'all-apps' });
  let finish!: (value: typeof server) => void;
  fetchDetail.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  const h = await renderHook(() => useReadingChallenge('reading-demo'));
  await waitFor(() => expect(fetchDetail).toHaveBeenCalled());
  jest.mocked(readingNative.snapshot).mockRejectedValue(new Error('Не удалось прочитать журнал'));
  jest.mocked(readingNative.pause).mockResolvedValue({ ...local, blockingMode: 'all-apps' });
  await act(async () => { await h.result.current.pause(); });
  expect(readingNative.pause).toHaveBeenCalledTimes(1);
  expect(h.result.current.awaitingPages).toBe(true);
  expect(send).not.toHaveBeenCalled();
  expect(readingNative.acknowledge).not.toHaveBeenCalled();
  expect(mockDisk[READING_OUTBOX_KEY]?.commands ?? []).toEqual([]);
  await act(async () => { finish(server); });
});
test('snapshot-failure pause retains exact native evidence for a later successful retry', async () => {
  fetchDetail.mockResolvedValue(server);
  jest.mocked(readingNative.snapshot).mockResolvedValue({ ...local, status: 'running' });
  const h = await renderHook(() => useReadingChallenge('reading-demo'));
  await waitFor(() => expect(h.result.current.busy).toBe(false));
  const evidence = { ...local, elapsedMs: 123456, integrity: 'revoked' as const };
  jest.mocked(readingNative.snapshot).mockRejectedValue(new Error('Не удалось прочитать журнал'));
  jest.mocked(readingNative.pause).mockResolvedValue(evidence);
  await act(async () => { await h.result.current.pause(); });
  await waitFor(() => expect(h.result.current.busy).toBe(false));
  expect(send).not.toHaveBeenCalled();
  jest.mocked(readingNative.snapshot).mockResolvedValue(evidence);
  await act(async () => { await h.result.current.retry(); });
  expect(send.mock.calls.map(c => c[1])).toEqual([expect.objectContaining({
    action: 'stop', challengeId: 'reading-demo', sessionId: 's1', deviceId: 'phone', elapsedMs: 123456, integrity: 'revoked',
  })]);
  expect(readingNative.acknowledge).not.toHaveBeenCalled();
});
test.each(['missing', 'failed'] as const)('snapshot-failure pause with %s evidence never invents a result', async outcome => {
  fetchDetail.mockResolvedValue(server);
  jest.mocked(readingNative.snapshot).mockRejectedValue(new Error('Не удалось прочитать журнал'));
  if (outcome === 'failed') jest.mocked(readingNative.pause).mockRejectedValue(new Error('Не удалось сохранить журнал'));
  const h = await renderHook(() => useReadingChallenge('reading-demo'));
  await waitFor(() => expect(h.result.current.busy).toBe(false));
  await act(async () => { await h.result.current.pause(); });
  expect(readingNative.pause).toHaveBeenCalledTimes(1);
  expect(send).not.toHaveBeenCalled();
  expect(readingNative.acknowledge).not.toHaveBeenCalled();
  expect(mockDisk[READING_OUTBOX_KEY]?.commands ?? []).toEqual([]);
  expect(h.result.current.error).toContain('журнал');
});
test.each([
  [{ ...local, accountId: 'another-reader' }, 'other-account'],
  [{ ...local, sessionId: 'another-session' }, 'other-challenge'],
] as const)('snapshot-failure pause never credits foreign evidence: %s', async (evidence, notice) => {
  fetchDetail.mockResolvedValue(server);
  jest.mocked(readingNative.snapshot).mockRejectedValue(new Error('Не удалось прочитать журнал'));
  jest.mocked(readingNative.pause).mockResolvedValue(evidence);
  const h = await renderHook(() => useReadingChallenge('reading-demo'));
  await waitFor(() => expect(h.result.current.busy).toBe(false));
  await act(async () => { await h.result.current.pause(); });
  expect(readingNative.pause).toHaveBeenCalledTimes(1);
  expect(h.result.current.sessionNotice?.kind).toBe(notice);
  expect(h.result.current.awaitingPages).toBe(false);
  expect(send).not.toHaveBeenCalled();
  expect(readingNative.acknowledge).not.toHaveBeenCalled();
  expect(mockDisk[READING_OUTBOX_KEY]?.commands ?? []).toEqual([]);
});
test('a pending pause cannot attach old evidence to the next signed-in account', async () => {
  fetchDetail.mockResolvedValue(server);
  jest.mocked(readingNative.snapshot).mockRejectedValue(new Error('Не удалось прочитать журнал'));
  let finish!: (value: typeof local) => void;
  jest.mocked(readingNative.pause).mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  const h = await renderHook(() => useReadingChallenge('reading-demo'));
  await waitFor(() => expect(h.result.current.busy).toBe(false));
  let pending!: Promise<void>;
  await act(async () => { pending = h.result.current.pause(); });
  await waitFor(() => expect(readingNative.pause).toHaveBeenCalledTimes(1));
  mockAccount = 'another-reader';
  fetchDetail.mockResolvedValue(readingFixture);
  jest.mocked(readingNative.snapshot).mockResolvedValue(null);
  await h.rerender({});
  await waitFor(() => expect(h.result.current.busy).toBe(false));
  await act(async () => { finish(local); await pending; });
  expect(h.result.current.awaitingPages).toBe(false);
  expect(h.result.current.timerState).toBe('ready');
  expect(send).not.toHaveBeenCalled();
  expect(readingNative.acknowledge).not.toHaveBeenCalled();
  expect(mockDisk[READING_OUTBOX_KEY]?.commands ?? []).toEqual([]);
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
test('pending commands of another account do not prevent challenge loading or joining', async () => {
  const foreignReport = { action: 'report', operationId: 'foreign-report', challengeId: 'old', sessionId: 'old-session', pages: 22 };
  mockDisk[READING_OUTBOX_KEY] = { accountId: 'another-reader', commands: [foreignReport] };
  const h = await renderHook(() => useReadingChallenge('reading-demo'));
  await waitFor(() => expect(h.result.current.data?.id).toBe('reading-demo'));
  await act(async () => { await h.result.current.join(); });
  expect(send.mock.calls.map(c => c[1].action)).toEqual(['join']);
  expect(send.mock.calls[0][1]).toEqual(expect.objectContaining({ challengeId: 'reading-demo', acceptRules: true }));
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
