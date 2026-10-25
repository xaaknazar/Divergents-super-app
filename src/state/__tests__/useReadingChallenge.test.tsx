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
test('another installation shows a remote timer notice, never recovery or a destructive command', async () => {
  mockDisk['dvg.readingDevice.v1'] = 'this-iphone';
  fetchDetail.mockResolvedValue({ ...server, session: { ...server.session, deviceId: 'other-ipad' } });
  const h = await renderHook(() => useReadingChallenge('reading-demo'));
  await waitFor(() => expect(h.result.current.sessionNotice?.kind).toBe('other-device'));
  expect(h.result.current.sessionNotice?.message).toContain('Чтение идёт на другом устройстве');
  expect(h.result.current.needsRecovery).toBe(false);
  expect(h.result.current.startBlocked).toBe(true);
  await act(async () => { await h.result.current.recover(); });
  expect(send).not.toHaveBeenCalled();
  expect(readingNative.acknowledge).not.toHaveBeenCalled();
  fetchDetail.mockResolvedValue(readingFixture);
  await act(async () => { await h.result.current.retry(); });
  expect(h.result.current.sessionNotice).toBeUndefined();
  expect(h.result.current.startBlocked).toBe(false);
});
test('recovery is offered only for an explicitly matching installation', async () => {
  mockDisk['dvg.readingDevice.v1'] = 'phone';
  fetchDetail.mockResolvedValue(server);
  const h = await renderHook(() => useReadingChallenge('reading-demo'));
  await waitFor(() => expect(h.result.current.needsRecovery).toBe(true));
  expect(h.result.current.sessionNotice).toBeUndefined();
});
test('running timer uses atomic native measurement even if a later remaining read would be zero', async () => {
  fetchDetail.mockResolvedValue(server);
  jest.mocked(readingNative.snapshot).mockResolvedValue({ ...local, status: 'running', elapsedMs: null,
    targetMs: 3_600_000, measuredElapsedMs: 3_480_000 });
  jest.mocked(readingNative.remainingMs).mockResolvedValue(0);
  const h = await renderHook(() => useReadingChallenge('reading-demo'));
  await waitFor(() => expect(h.result.current.remainingMs).toBe(120_000));
  expect(h.result.current.timerState).toBe('running');
  expect(readingNative.remainingMs).not.toHaveBeenCalled();
  jest.mocked(readingNative.snapshot).mockResolvedValue({ ...local, elapsedMs: 3_480_000,
    measuredElapsedMs: 3_480_000, targetMs: 3_600_000, resumeVersion: 1, terminal: false, canResume: true });
  await act(async () => { await h.result.current.retry(); });
  expect(h.result.current.remainingMs).toBe(120_000);
  expect(h.result.current.timerState).toBe('paused');
  expect(send).not.toHaveBeenCalled();
});
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

test.each(['running', 'unreadable'] as const)('an ambiguous native start (%s journal) never sends a synthetic zero closure', async outcome => {
  mockDisk['dvg.readingDevice.v1'] = 'phone';
  send.mockImplementation(async (_token, command) => {
    if (command.action === 'start') fetchDetail.mockResolvedValue({ ...server, session: { ...server.session, id: 'random-id' } });
    return { ok: true };
  });
  jest.mocked(readingNative.start).mockImplementation(async () => {
    if (outcome === 'unreadable') jest.mocked(readingNative.snapshot).mockRejectedValue(new Error('storage unavailable'));
    else jest.mocked(readingNative.snapshot).mockResolvedValue({ ...local, sessionId: 'random-id',
      status: 'running', elapsedMs: null, measuredElapsedMs: 30_000 });
    throw new Error('native response lost');
  });
  const h = await renderHook(() => useReadingChallenge('reading-demo'));
  await waitFor(() => expect(h.result.current.busy).toBe(false));
  await act(async () => { await h.result.current.start('Книга'); });
  expect(send.mock.calls.map(call => call[1].action)).toEqual(['start']);
  expect(mockDisk[READING_OUTBOX_KEY]?.commands).toEqual([]);
  if (outcome === 'running') expect(h.result.current.timerState).toBe('running');
});

test('terminal upload failures do not turn the one-second clock into a network retry loop', async () => {
  jest.useFakeTimers();
  const previousAppState = AppState.currentState;
  AppState.currentState = 'active';
  try {
    fetchDetail.mockResolvedValue(server);
    jest.mocked(readingNative.snapshot).mockResolvedValue({ ...local, status: 'running', elapsedMs: null });
    const h = await renderHook(() => useReadingChallenge('reading-demo'));
    await waitFor(() => expect(h.result.current.busy).toBe(false));
    send.mockRejectedValue(new Error('offline'));
    jest.mocked(readingNative.snapshot).mockResolvedValue(local);
    await act(async () => { jest.advanceTimersByTime(1000); });
    const attempts = send.mock.calls.length;
    for (let i = 0; i < 10; i++) await act(async () => { jest.advanceTimersByTime(1000); });
    expect(attempts).toBeGreaterThan(0);
    expect(send).toHaveBeenCalledTimes(attempts);
    await h.unmount();
  } finally { AppState.currentState = previousAppState; jest.useRealTimers(); }
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
  // No internet is a calm offline state, not an error banner.
  await waitFor(() => expect(h.result.current.offline).toBe(true));
  expect(h.result.current.error).toBeUndefined();
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

describe('start recovery and responsiveness', () => {
  const reserved = { ...server, session: { ...server.session, id: 'random-id', deviceId: 'phone' } };
  const pendingKey = 'dvg.readingPendingStart.v1.demo-reader.reading-demo';
  const nativeRunning = { ...local, sessionId: 'random-id', status: 'running' as const, elapsedMs: null };
  beforeEach(() => { mockDisk['dvg.readingDevice.v1'] = 'phone'; });

  test('a lost start response is finished with the same session only after an explicit tap', async () => {
    send.mockImplementationOnce(async () => { fetchDetail.mockResolvedValue(reserved); throw new TypeError('Network request failed'); });
    send.mockResolvedValue({ ok: true, sessionId: 'random-id', budgetMs: 3600000 });
    jest.mocked(readingNative.start).mockResolvedValue(nativeRunning);
    const h = await renderHook(() => useReadingChallenge('reading-demo'));
    await waitFor(() => expect(h.result.current.busy).toBe(false));
    await act(async () => { await h.result.current.start('Книга'); });
    expect(h.result.current.error).toContain('Нет подтверждения сервера');
    expect(mockDisk[pendingKey]).toMatchObject({ sessionId: 'random-id', deviceId: 'phone', book: 'Книга' });
    // A background retry delivers the same queued start and sees the reservation, but never launches the timer.
    await act(async () => { await h.result.current.retry(); });
    expect(mockDisk[READING_OUTBOX_KEY].commands).toEqual([]);
    expect(h.result.current.startRecovery).toBe(true);
    expect(h.result.current.needsRecovery).toBe(false);
    expect(readingNative.start).not.toHaveBeenCalled();
    await act(async () => { await h.result.current.continueStart(); });
    expect(readingNative.start).toHaveBeenCalledTimes(1);
    expect(jest.mocked(readingNative.start).mock.calls[0].slice(0, 4)).toEqual(['demo-reader', 'random-id', 'phone', 'Книга']);
    const starts = send.mock.calls.map(c => c[1]).filter(c => c.action === 'start');
    expect(new Set(starts.map(c => `${c.operationId}:${c.sessionId}`)).size).toBe(1);
    expect(send.mock.calls.map(c => c[1].action)).not.toContain('stop');
    expect(mockDisk[pendingKey]).toBeNull();
    expect(h.result.current.startRecovery).toBe(false);
  });

  test('a lost detail response after an accepted start survives an app restart', async () => {
    send.mockImplementation(async (_token, command) => {
      if (command.action === 'start') fetchDetail.mockRejectedValueOnce(new TypeError('Network request failed')).mockResolvedValue(reserved);
      return { ok: true };
    });
    jest.mocked(readingNative.start).mockResolvedValue(nativeRunning);
    const first = await renderHook(() => useReadingChallenge('reading-demo'));
    await waitFor(() => expect(first.result.current.busy).toBe(false));
    await act(async () => { await first.result.current.start('Книга'); });
    expect(first.result.current.error).toBeDefined();
    expect(readingNative.start).not.toHaveBeenCalled();
    await first.unmount();
    const restarted = await renderHook(() => useReadingChallenge('reading-demo'));
    await waitFor(() => expect(restarted.result.current.startRecovery).toBe(true));
    expect(readingNative.start).not.toHaveBeenCalled();
    await act(async () => { await restarted.result.current.continueStart(); });
    expect(readingNative.start).toHaveBeenCalledTimes(1);
    expect(send.mock.calls.filter(c => c[1].action === 'start')).toHaveLength(1);
  });

  test('another phone cannot continue a reservation it did not make', async () => {
    fetchDetail.mockResolvedValue({ ...reserved, session: { ...reserved.session, deviceId: 'ipad' } });
    mockDisk[pendingKey] = { accountId: 'demo-reader', challengeId: 'reading-demo', sessionId: 'random-id', deviceId: 'phone',
      operationId: 'op', book: 'Книга', createdAt: 1 };
    const h = await renderHook(() => useReadingChallenge('reading-demo'));
    await waitFor(() => expect(h.result.current.busy).toBe(false));
    expect(h.result.current.startRecovery).toBe(false);
    // The other phone's running approach is shown as such, never as a local recovery.
    expect(h.result.current.sessionNotice?.kind).toBe('other-device');
    expect(h.result.current.needsRecovery).toBe(false);
    expect(mockDisk[pendingKey]).toBeNull();
    await act(async () => { await h.result.current.continueStart(); });
    expect(readingNative.start).not.toHaveBeenCalled();
  });

  test('a stale attempt that never reached the server is forgotten and a new start works', async () => {
    mockDisk[pendingKey] = { accountId: 'demo-reader', challengeId: 'reading-demo', sessionId: 'old-id', deviceId: 'phone',
      operationId: 'old-op', book: 'Книга', createdAt: 1 };
    send.mockImplementation(async (_token, command) => {
      if (command.action === 'start') fetchDetail.mockResolvedValue(reserved);
      return { ok: true };
    });
    jest.mocked(readingNative.start).mockResolvedValue(nativeRunning);
    const h = await renderHook(() => useReadingChallenge('reading-demo'));
    await waitFor(() => expect(h.result.current.busy).toBe(false));
    expect(mockDisk[pendingKey]).toBeNull();
    await act(async () => { await h.result.current.start('Книга'); });
    expect(readingNative.start).toHaveBeenCalledTimes(1);
    expect(h.result.current.error).toBeUndefined();
  });

  test('a native failure while continuing closes the same reservation with zero credit', async () => {
    fetchDetail.mockResolvedValue(reserved);
    mockDisk[pendingKey] = { accountId: 'demo-reader', challengeId: 'reading-demo', sessionId: 'random-id', deviceId: 'phone',
      operationId: 'op', book: 'Книга', createdAt: 1 };
    jest.mocked(readingNative.start).mockRejectedValue(new Error('Экранное время недоступно'));
    const h = await renderHook(() => useReadingChallenge('reading-demo'));
    await waitFor(() => expect(h.result.current.startRecovery).toBe(true));
    await act(async () => { await h.result.current.continueStart(); });
    expect(h.result.current.error).toContain('Экранное время');
    const sent = send.mock.calls.map(c => c[1]);
    expect(sent.map(c => [c.action, c.sessionId, c.elapsedMs ?? c.pages])).toEqual([['stop', 'random-id', 0], ['report', 'random-id', 0]]);
    expect(mockDisk[pendingKey]).toBeNull();
  });

  test('«Старт» during a background refresh waits for it instead of being ignored', async () => {
    send.mockImplementation(async (_token, command) => {
      if (command.action === 'start') fetchDetail.mockResolvedValue(reserved);
      return { ok: true };
    });
    jest.mocked(readingNative.start).mockResolvedValue(nativeRunning);
    const h = await renderHook(() => useReadingChallenge('reading-demo'));
    await waitFor(() => expect(h.result.current.busy).toBe(false));
    let finish!: (value: typeof readingFixture) => void;
    fetchDetail.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    let refreshing!: Promise<void>, starting!: Promise<void>;
    await act(async () => { refreshing = h.result.current.retry(); });
    expect(h.result.current.busy).toBe(true);
    expect(h.result.current.actionBusy).toBe(false);
    await act(async () => { starting = h.result.current.start('Книга'); });
    expect(h.result.current.actionBusy).toBe(true);
    expect(send).not.toHaveBeenCalled();
    await act(async () => { finish(readingFixture); await refreshing; await starting; });
    expect(send.mock.calls.map(c => c[1].action)).toEqual(['start']);
    expect(readingNative.start).toHaveBeenCalledTimes(1);
    expect(h.result.current.actionBusy).toBe(false);
    expect(h.result.current.error).toBeUndefined();
  });

  test('another screen of the same challenge cannot forget a start that is still in flight', async () => {
    jest.mocked(readingNative.start).mockResolvedValue(nativeRunning);
    const a = await renderHook(() => useReadingChallenge('reading-demo'));
    const b = await renderHook(() => useReadingChallenge('reading-demo'));
    await waitFor(() => expect(a.result.current.busy).toBe(false));
    await waitFor(() => expect(b.result.current.busy).toBe(false));
    // A's POST is accepted, but its detail GET is still on the way; B's GET is served first.
    let answer!: () => void;
    send.mockImplementation(async (_token, command) => {
      if (command.action === 'start') fetchDetail.mockImplementationOnce(() => new Promise(resolve => { answer = () => resolve(reserved); }));
      return { ok: true };
    });
    let starting!: Promise<void>;
    await act(async () => { starting = a.result.current.start('Книга'); });
    await waitFor(() => expect(answer).toBeDefined());
    await act(async () => { await b.result.current.retry(); });
    expect(mockDisk[pendingKey]).toMatchObject({ sessionId: 'random-id' });
    await act(async () => { answer(); await starting; });
    expect(readingNative.start).toHaveBeenCalledTimes(1);
    expect(send.mock.calls.filter(c => c[1].action === 'start')).toHaveLength(1);
  });

  test('an action interrupted by switching challenge does not leave controls busy', async () => {
    let finish!: (value: typeof readingFixture) => void;
    const h = await renderHook((props: { id: string }) => useReadingChallenge(props.id), { initialProps: { id: 'reading-demo' } });
    await waitFor(() => expect(h.result.current.busy).toBe(false));
    fetchDetail.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    let joining!: Promise<void>;
    await act(async () => { joining = h.result.current.join(); });
    expect(h.result.current.actionBusy).toBe(true);
    fetchDetail.mockResolvedValue({ ...readingFixture, id: 'reading-other' });
    await h.rerender({ id: 'reading-other' });
    await act(async () => { finish(readingFixture); await joining; });
    await waitFor(() => expect(h.result.current.busy).toBe(false));
    expect(h.result.current.actionBusy).toBe(false);
  });

  test('two quick «Старт» taps reserve one session', async () => {
    send.mockImplementation(async (_token, command) => {
      if (command.action === 'start') fetchDetail.mockResolvedValue(reserved);
      return { ok: true };
    });
    jest.mocked(readingNative.start).mockResolvedValue(nativeRunning);
    const h = await renderHook(() => useReadingChallenge('reading-demo'));
    await waitFor(() => expect(h.result.current.busy).toBe(false));
    await act(async () => { await Promise.all([h.result.current.start('Книга'), h.result.current.start('Книга')]); });
    expect(send.mock.calls.filter(c => c[1].action === 'start')).toHaveLength(1);
    expect(readingNative.start).toHaveBeenCalledTimes(1);
  });
});
