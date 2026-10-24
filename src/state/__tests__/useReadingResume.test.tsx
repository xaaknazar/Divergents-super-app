import { act, renderHook, waitFor } from '@testing-library/react-native';
import { AppState, type AppStateStatus } from 'react-native';
import { useReadingChallenge } from '../useReadingChallenge';
import { readingNative, type NativeReadingSession } from '../readingNative';
import { READING_OUTBOX_KEY, type ReadingQueue } from '../readingOutbox';
import { readJSON } from '../persist';
import { fetchReadingDetail, sendReadingCommand, type ReadingDetail } from '../../data/reading';
import { readingFixture } from '../../storybook/readingFixtures';

let mockAccount = 'demo-reader';
let mockDisk: Record<string, unknown> = {};
jest.mock('@clerk/clerk-expo', () => ({
  useAuth: () => ({ userId: mockAccount, getToken: async () => 'current-account-token' }),
}));
jest.mock('../../data/api', () => ({ API_BASE: 'https://example.test' }));
jest.mock('../../data/reading', () => ({
  ...jest.requireActual('../../data/reading'),
  fetchReadingDetail: jest.fn(),
  sendReadingCommand: jest.fn(),
}));
jest.mock('../persist', () => ({
  loadJSON: jest.fn(async (key, fallback) => mockDisk[key] ?? fallback),
  readJSON: jest.fn(async (key, fallback) => ({ ok: true, value: mockDisk[key] ?? fallback })),
  saveJSON: jest.fn(async (key, value) => { mockDisk[key] = JSON.parse(JSON.stringify(value)); }),
}));
jest.mock('../readingNative', () => ({
  ...jest.requireActual('../readingNative'),
  readingNative: {
    capabilities: jest.fn(), snapshot: jest.fn(), remainingMs: jest.fn(),
    pause: jest.fn(), resume: jest.fn(), finish: jest.fn(),
    start: jest.fn(), acknowledge: jest.fn(), authorize: jest.fn(), selectApps: jest.fn(),
    reconcileLiveActivity: jest.fn(), restoreLiveActivity: jest.fn(), endLiveActivities: jest.fn(),
  },
}));
jest.mock('expo-crypto', () => ({
  CryptoDigestAlgorithm: { SHA256: 'SHA256' },
  digestStringAsync: async (_algorithm: string, value: string) =>
    jest.requireActual('crypto').createHash('sha256').update(value).digest('hex'),
  randomUUID: () => 'new-session-id',
}));

const fetchDetail = jest.mocked(fetchReadingDetail);
const send = jest.mocked(sendReadingCommand);
const pause = jest.mocked(readingNative.pause);
const resume = jest.mocked(readingNative.resume);
const finish = jest.mocked(readingNative.finish);
const cacheKey = 'dvg.readingDetail.demo-reader.reading-demo';
const softPaused: NativeReadingSession = {
  accountId: 'demo-reader', sessionId: 'session-a', deviceId: 'phone', book: 'Книга',
  budgetMs: 28_800_000, targetMs: 3_600_000, anchorMs: 1_000, bootId: 'boot',
  elapsedMs: 900_000, accumulatedMs: 900_000, deadlineMs: 28_801_000, generation: 'generation-2',
  status: 'paused', integrity: 'ok', blockingMode: 'all-apps',
  resumeVersion: 1, terminal: false, canResume: true,
};
let journal: NativeReadingSession | null;
let server: ReadingDetail;
let foreground: ((state: AppStateStatus) => void) | undefined;

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(done => { resolve = done; });
  return { promise, resolve };
}

function queued() {
  return (mockDisk[READING_OUTBOX_KEY] as ReadingQueue | undefined)?.commands ?? [];
}

async function ready() {
  const hook = await renderHook(() => useReadingChallenge('reading-demo'));
  await waitFor(() => expect(hook.result.current.busy).toBe(false));
  return hook;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockAccount = 'demo-reader';
  journal = { ...softPaused };
  server = {
    ...readingFixture,
    me: { ...readingFixture.me!, elapsedMs: 0, pages: 0,
      history: [{ day: 1, state: 'open', elapsedMs: 0, pages: 0 }] },
    session: {
      id: 'session-a', deviceId: 'phone', day: 1, book: 'Книга',
      budgetMs: softPaused.budgetMs, startedAt: '2026-11-01T00:00:00Z',
      elapsedMs: null, status: 'running',
    },
  };
  mockDisk = { [cacheKey]: JSON.parse(JSON.stringify(server)) };
  jest.mocked(readJSON).mockReset().mockImplementation(async (key, fallback) => ({
    ok: true, value: (mockDisk[key] ?? fallback) as typeof fallback,
  }));
  foreground = undefined;
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_event, callback) => {
    foreground = callback;
    return { remove: jest.fn() };
  });
  fetchDetail.mockReset().mockImplementation(async () => server);
  send.mockReset().mockImplementation(async (_token, command) => {
    if (command.action === 'stop' && server.session) {
      server = { ...server, session: { ...server.session, status: 'awaiting_pages', elapsedMs: command.elapsedMs as number } };
    } else if (command.action === 'report') {
      server = { ...server, session: null, reportedSessionIds: [String(command.sessionId)] };
    }
    return { ok: true };
  });
  jest.mocked(readingNative.capabilities).mockReset().mockResolvedValue({
    available: true, authorized: true, platform: 'ios',
    blockingMode: 'all-apps', selectedCount: 0, supportsResume: true,
  });
  jest.mocked(readingNative.snapshot).mockReset().mockImplementation(async () => journal);
  jest.mocked(readingNative.remainingMs).mockReset().mockImplementation(async () =>
    journal ? journal.budgetMs - (journal.elapsedMs ?? journal.accumulatedMs ?? 0) : 0);
  pause.mockReset().mockImplementation(async () => {
    if (journal) journal = { ...journal, status: 'paused',
      elapsedMs: journal.elapsedMs ?? journal.accumulatedMs ?? 0, canResume: !journal.terminal };
    return journal;
  });
  resume.mockReset().mockImplementation(async (accountId, sessionId, expectedGeneration) => {
    if (!journal) throw new Error('Нет сохранённого сеанса');
    if (journal.accountId !== accountId || journal.sessionId !== sessionId
      || !expectedGeneration || journal.generation !== expectedGeneration) throw new Error('Сеанс изменился');
    journal = { ...journal, status: 'running', elapsedMs: null,
      accumulatedMs: journal.elapsedMs ?? journal.accumulatedMs ?? 0,
      canResume: false, generation: 'generation-resumed' };
    return journal;
  });
  finish.mockReset().mockImplementation(async (accountId, sessionId, expectedGeneration) => {
    if (!journal) throw new Error('Нет сохранённого сеанса');
    if (journal.accountId !== accountId || journal.sessionId !== sessionId
      || !expectedGeneration || journal.generation !== expectedGeneration) throw new Error('Сеанс изменился');
    journal = { ...journal, status: 'paused', terminal: true, canResume: false,
      elapsedMs: journal.elapsedMs ?? journal.accumulatedMs ?? 0 };
    return journal;
  });
  jest.mocked(readingNative.acknowledge).mockReset().mockImplementation(async () => { journal = null; });
  jest.mocked(readingNative.reconcileLiveActivity).mockReset().mockResolvedValue({ state: 'unsupported', canRestore: false });
  jest.mocked(readingNative.restoreLiveActivity).mockReset().mockResolvedValue({ state: 'unsupported', canRestore: false });
});

afterEach(() => { jest.restoreAllMocks(); });

test('the pages form gets exact frozen approach time, not server lag or the daily countdown', async () => {
  journal = { ...softPaused, elapsedMs: 1_500_217, accumulatedMs: 1_500_217, targetMs: 2_100_000 };
  server = { ...server, session: { ...server.session!, elapsedMs: 12_000 } };
  const hook = await ready();
  expect(hook.result.current.sessionElapsedMs).toBe(1_500_217);
  expect(hook.result.current.remainingMs).toBe(599_783);
});

test.each([null, { ...softPaused, accountId: 'another-reader' }, { ...softPaused, sessionId: 'another-session' }])(
  'approach time falls back to confirmed server evidence when native evidence is absent or unrelated: %s', async local => {
    journal = local;
    server = { ...server, session: { ...server.session!, status: 'awaiting_pages', elapsedMs: 720_123 } };
    const hook = await ready();
    expect(hook.result.current.sessionElapsedMs).toBe(720_123);
  },
);

test('unknown approach time stays undefined and does not expose a previous account after switching', async () => {
  journal = null;
  const hook = await ready();
  expect(hook.result.current.sessionElapsedMs).toBeUndefined();
  server = { ...server, session: { ...server.session!, status: 'awaiting_pages', elapsedMs: 720_123 } };
  await act(async () => { await hook.result.current.retry(); });
  expect(hook.result.current.sessionElapsedMs).toBe(720_123);
  mockAccount = 'another-reader';
  await hook.rerender({});
  await waitFor(() => expect(hook.result.current.busy).toBe(false));
  expect(hook.result.current.sessionElapsedMs).toBeUndefined();
});

test('a soft pause stays local through offline retry, foreground and relaunch without creating a stop', async () => {
  journal = { ...softPaused, status: 'running', elapsedMs: null, canResume: false };
  const hook = await ready();
  expect(hook.result.current.resumableSession).toBe(true);
  expect(hook.result.current.canResume).toBe(false);
  fetchDetail.mockRejectedValue(new Error('offline'));

  await act(async () => { await hook.result.current.pause(); });
  await waitFor(() => expect(hook.result.current.busy).toBe(false));
  expect(hook.result.current.timerState).toBe('paused');
  expect(hook.result.current.canResume).toBe(true);
  expect(hook.result.current.awaitingPages).toBe(false);
  expect(hook.result.current.remainingMs).toBe(2_700_000);
  await act(async () => { await hook.result.current.retry(); foreground?.('active'); });
  await waitFor(() => expect(hook.result.current.busy).toBe(false));
  await hook.unmount();
  const relaunched = await ready();

  expect(relaunched.result.current.timerState).toBe('paused');
  expect(relaunched.result.current.resumableSession).toBe(true);
  expect(relaunched.result.current.canResume).toBe(true);
  expect(relaunched.result.current.awaitingPages).toBe(false);
  expect(send).not.toHaveBeenCalled();
  expect(queued()).toEqual([]);
  expect(readingNative.acknowledge).not.toHaveBeenCalled();
});

test('resume uses the same owned native session offline without a start or network command', async () => {
  fetchDetail.mockRejectedValue(new Error('offline'));
  const hook = await ready();
  const reads = fetchDetail.mock.calls.length;

  await act(async () => { await hook.result.current.resume(); });

  expect(resume).toHaveBeenCalledWith('demo-reader', 'session-a', 'generation-2');
  expect(resume).toHaveBeenCalledTimes(1);
  expect(hook.result.current.timerState).toBe('running');
  expect(hook.result.current.resumableSession).toBe(true);
  expect(hook.result.current.canResume).toBe(false);
  expect(journal).toMatchObject({ sessionId: 'session-a', accumulatedMs: 900_000, deadlineMs: softPaused.deadlineMs });
  expect(fetchDetail).toHaveBeenCalledTimes(reads);
  expect(readingNative.start).not.toHaveBeenCalled();
  expect(send).not.toHaveBeenCalled();
  expect(queued()).toEqual([]);
});

test('soft-paused time is never reported without closing the approach first', async () => {
  const hook = await ready();

  await act(async () => { await hook.result.current.report(12); });

  expect(finish).not.toHaveBeenCalled();
  expect(send).not.toHaveBeenCalled();
  expect(queued()).toEqual([]);
  expect(journal).toEqual(softPaused);
  expect(hook.result.current.awaitingPages).toBe(false);
  expect(readingNative.acknowledge).not.toHaveBeenCalled();
});

test('finishing a partial book approach keeps exact time and awaits pages without completing the day', async () => {
  const hook = await ready();
  await act(async () => { await hook.result.current.finish(); });
  await waitFor(() => expect(hook.result.current.busy).toBe(false));
  expect(finish).toHaveBeenCalledWith('demo-reader', 'session-a', 'generation-2');
  expect(send.mock.calls.map(call => call[1])).toEqual([
    expect.objectContaining({ action: 'stop', sessionId: 'session-a', elapsedMs: 900_000 }),
  ]);
  expect(hook.result.current.awaitingPages).toBe(true);
  expect(hook.result.current.canResume).toBe(false);
  expect(hook.result.current.remainingMs).toBe(2_700_000);
  expect(hook.result.current.data?.me?.history[0].state).toBe('open');
  expect(readingNative.acknowledge).not.toHaveBeenCalled();
});

test('saving partial pages seals the owned approach before its immutable stop and report', async () => {
  const hook = await ready();
  await act(async () => { await hook.result.current.saveApproach(15); });
  expect(finish).toHaveBeenCalledWith('demo-reader', 'session-a', 'generation-2');
  expect(send.mock.calls.map(call => call[1])).toEqual([
    expect.objectContaining({ action: 'stop', sessionId: 'session-a', elapsedMs: 900_000, integrity: 'ok' }),
    expect.objectContaining({ action: 'report', sessionId: 'session-a', pages: 15 }),
  ]);
  expect(finish.mock.invocationCallOrder[0]).toBeLessThan(send.mock.invocationCallOrder[0]);
  expect(readingNative.acknowledge).toHaveBeenCalledWith('demo-reader', 'session-a');
  expect(queued()).toEqual([]);
});

test('saving pages during a stalled refresh persists the exact approach before the server answers', async () => {
  const hook = await ready();
  const pending = deferred<ReadingDetail>();
  fetchDetail.mockImplementationOnce(() => pending.promise);
  let refreshing!: Promise<void>;
  await act(async () => { refreshing = hook.result.current.retry(); });
  await waitFor(() => expect(hook.result.current.busy).toBe(true));
  await act(async () => { await hook.result.current.saveApproach(15); });
  const savedBeforeResponse = queued();
  await act(async () => { pending.resolve(server); await refreshing; });
  expect(savedBeforeResponse).toEqual([
    expect.objectContaining({ action: 'stop', elapsedMs: 900_000 }),
    expect.objectContaining({ action: 'report', pages: 15, sessionId: 'session-a' }),
  ]);
  await act(async () => { await hook.result.current.retry(); });
  expect(send.mock.calls.map(call => call[1].action)).toEqual(['stop', 'report']);
});

test('a save snapshot failure is shown inline without an unhandled rejection or invented report', async () => {
  const hook = await ready();
  jest.mocked(readingNative.snapshot).mockRejectedValueOnce(new Error('Не удалось прочитать таймер'));
  await act(async () => { await expect(hook.result.current.saveApproach(15)).resolves.toBeUndefined(); });
  expect(hook.result.current.error).toContain('Не удалось прочитать таймер');
  expect(queued()).toEqual([]); expect(send).not.toHaveBeenCalled();
});

test('rapid save taps seal and report the first submitted page count only once', async () => {
  const hook = await ready();
  await act(async () => { await Promise.all([hook.result.current.saveApproach(15), hook.result.current.saveApproach(202)]); });
  expect(finish).toHaveBeenCalledTimes(1);
  expect(send.mock.calls.map(call => call[1]).filter(c => c.action === 'report')).toEqual([
    expect.objectContaining({ pages: 15, sessionId: 'session-a' }),
  ]);
});

test.each([NaN, -1, 1.5, 10001])('invalid pages %s never seal the timer or poison the durable queue', async pages => {
  const hook = await ready();
  await act(async () => { await hook.result.current.saveApproach(pages); });
  expect(finish).not.toHaveBeenCalled(); expect(send).not.toHaveBeenCalled(); expect(queued()).toEqual([]);
  expect(hook.result.current.canResume).toBe(true);
  expect(hook.result.current.error).toMatch(/количество страниц/);
});

test('recovery rechecks the native journal after waiting for the server', async () => {
  journal = null; mockDisk['dvg.readingDevice.v1'] = 'phone';
  const hook = await ready();
  fetchDetail.mockImplementationOnce(async () => { journal = { ...softPaused }; return server; });
  await act(async () => { await hook.result.current.recover(); });
  expect(send).not.toHaveBeenCalled(); expect(queued()).toEqual([]);
  expect(hook.result.current.error).toMatch(/сохранённое время/);
});

test('stale recovery cannot close an already completed approach with zero pages', async () => {
  journal = null; mockDisk['dvg.readingDevice.v1'] = 'phone';
  const hook = await ready();
  expect(hook.result.current.needsRecovery).toBe(true);
  server = { ...server, session: { ...server.session!, status: 'awaiting_pages', elapsedMs: 3_600_000 } };
  await act(async () => { await hook.result.current.recover(); });
  expect(send).not.toHaveBeenCalled(); expect(queued()).toEqual([]);
  expect(hook.result.current.awaitingPages).toBe(true);
  expect(hook.result.current.error).toMatch(/сохраните страницы/i);
});

test('two books keep separate page reports and share the daily hour: 25 minutes plus 35 minutes', async () => {
  const saved: { sessionId: string; book: string; elapsedMs: number; pages: number }[] = [];
  journal = { ...softPaused, book: 'Первая книга', elapsedMs: 1_500_000, accumulatedMs: 1_500_000 };
  server = { ...server, session: { ...server.session!, book: 'Первая книга' } };
  send.mockImplementation(async (_token, command) => {
    if (command.action === 'start') {
      server = { ...server, session: { id: String(command.sessionId), book: String(command.book),
        deviceId: String(command.deviceId), day: 1, budgetMs: softPaused.budgetMs,
        startedAt: new Date(server.serverNow).toISOString(), elapsedMs: null, status: 'running' } };
    } else if (command.action === 'stop' && server.session) {
      server = { ...server, session: { ...server.session, status: 'awaiting_pages', elapsedMs: Number(command.elapsedMs) } };
    } else if (command.action === 'report' && server.session) {
      expect(server.session.status).toBe('awaiting_pages');
      saved.push({ sessionId: server.session.id, book: server.session.book,
        elapsedMs: server.session.elapsedMs!, pages: Number(command.pages) });
      const elapsedMs = saved.reduce((sum, approach) => sum + approach.elapsedMs, 0);
      const pages = saved.reduce((sum, approach) => sum + approach.pages, 0);
      server = { ...server, session: null, reportedSessionIds: saved.map(approach => approach.sessionId),
        me: { ...server.me!, elapsedMs, pages, completedDays: elapsedMs >= 3_600_000 ? 1 : 0,
          history: [{ day: 1, elapsedMs, pages, state: elapsedMs >= 3_600_000 ? 'complete' : 'open' }] } };
    }
    return { ok: true };
  });
  jest.mocked(readingNative.start).mockImplementation(async (accountId, sessionId, deviceId, book, budgetMs, targetMs) => {
    journal = { ...softPaused, accountId, sessionId, deviceId, book, budgetMs, targetMs,
      accumulatedMs: 0, elapsedMs: null, status: 'running', canResume: false, generation: 'book-b-start' };
    return journal;
  });
  const hook = await ready();

  await act(async () => { await hook.result.current.saveApproach(15); });
  expect(hook.result.current.data?.me?.history[0]).toMatchObject({ state: 'open', elapsedMs: 1_500_000, pages: 15 });
  expect(hook.result.current.remainingMs).toBe(2_100_000);
  expect(hook.result.current.timerState).toBe('ready');
  expect(journal).toBeNull();

  await act(async () => { await hook.result.current.start('Вторая книга'); });
  expect(readingNative.start).toHaveBeenCalledWith('demo-reader', 'new-session-id', 'new-session-id', 'Вторая книга',
    expect.any(Number), 2_100_000);
  expect(hook.result.current.remainingMs).toBe(2_100_000);
  journal = { ...journal!, accumulatedMs: 2_100_000 };
  await act(async () => { await hook.result.current.pause(); });
  await waitFor(() => expect(hook.result.current.busy).toBe(false));
  expect(hook.result.current.canResume).toBe(true);
  expect(saved).toHaveLength(1);
  await act(async () => { await hook.result.current.saveApproach(20); });

  expect(saved).toEqual([
    { sessionId: 'session-a', book: 'Первая книга', elapsedMs: 1_500_000, pages: 15 },
    { sessionId: 'new-session-id', book: 'Вторая книга', elapsedMs: 2_100_000, pages: 20 },
  ]);
  expect(hook.result.current.data?.me?.history[0]).toEqual({ day: 1, state: 'complete', elapsedMs: 3_600_000, pages: 35 });
  expect(hook.result.current.remainingMs).toBe(0);
  expect(hook.result.current.timerState).toBe('complete');
  expect(queued()).toEqual([]);
  const reports = send.mock.calls.map(call => call[1]).filter(command => command.action === 'report');
  expect(new Set(reports.map(command => command.operationId)).size).toBe(2);
});

test('pages after reaching the daily hour close the approach with exact time before sending pages', async () => {
  journal = { ...softPaused, elapsedMs: 3_600_000, accumulatedMs: 3_600_000 };
  const hook = await ready();

  await act(async () => { await hook.result.current.saveApproach(12); });
  await waitFor(() => expect(hook.result.current.busy).toBe(false));

  expect(finish).toHaveBeenCalledWith('demo-reader', 'session-a', 'generation-2');
  expect(send.mock.calls.map(call => call[1])).toEqual([
    expect.objectContaining({ action: 'stop', sessionId: 'session-a', elapsedMs: 3_600_000, integrity: 'ok' }),
    expect.objectContaining({ action: 'report', sessionId: 'session-a', pages: 12 }),
  ]);
  expect(readingNative.acknowledge).toHaveBeenCalledWith('demo-reader', 'session-a');
  expect(queued()).toEqual([]);
});

test('finishing uses the remaining daily goal, not an extra hour for each approach', async () => {
  server = { ...server, me: { ...server.me!, elapsedMs: 2_700_000,
    history: [{ day: 1, state: 'open', elapsedMs: 2_700_000, pages: 0 }] } };
  journal = { ...softPaused, targetMs: 900_000, elapsedMs: 900_000, accumulatedMs: 900_000 };
  const hook = await ready();
  expect(hook.result.current.remainingMs).toBe(0);
  await act(async () => { await hook.result.current.saveApproach(12); });
  expect(finish).toHaveBeenCalledWith('demo-reader', 'session-a', 'generation-2');
  expect(send.mock.calls.map(call => call[1])).toEqual([
    expect.objectContaining({ action: 'stop', elapsedMs: 900_000 }),
    expect.objectContaining({ action: 'report', pages: 12 }),
  ]);
});

test('finish retains exact cumulative time and sends one final stop before pages are acknowledged', async () => {
  journal = { ...softPaused, elapsedMs: 3_700_123, accumulatedMs: 3_700_123 };
  const hook = await ready();
  expect(send).not.toHaveBeenCalled();
  expect(hook.result.current.awaitingPages).toBe(false);

  await act(async () => { await hook.result.current.finish(); });
  await waitFor(() => expect(hook.result.current.busy).toBe(false));
  expect(finish).toHaveBeenCalledWith('demo-reader', 'session-a', 'generation-2');
  expect(finish).toHaveBeenCalledTimes(1);
  expect(hook.result.current.awaitingPages).toBe(true);
  expect(hook.result.current.canResume).toBe(false);
  expect(readingNative.acknowledge).not.toHaveBeenCalled();
  expect(send.mock.calls.map(call => call[1])).toEqual([expect.objectContaining({
    action: 'stop', challengeId: 'reading-demo', sessionId: 'session-a',
    deviceId: 'phone', elapsedMs: 3_700_123, integrity: 'ok',
  })]);
  await act(async () => { await hook.result.current.retry(); await hook.result.current.report(18); });

  expect(send.mock.calls.map(call => call[1].action)).toEqual(['stop', 'report']);
  expect(readingNative.acknowledge).toHaveBeenCalledWith('demo-reader', 'session-a');
  expect(journal).toBeNull();
  expect(queued()).toEqual([]);
});

test('offline partial-book finalization durably queues exact time and pages with one immutable closing operation', async () => {
  journal = { ...softPaused, elapsedMs: 900_217, accumulatedMs: 900_217 };
  const hook = await ready();
  send.mockRejectedValue(new Error('offline'));
  fetchDetail.mockRejectedValue(new Error('offline'));

  await act(async () => { await hook.result.current.finish(); });
  await waitFor(() => expect(hook.result.current.busy).toBe(false));
  await act(async () => { await hook.result.current.report(15); });

  expect(queued()).toEqual([
    expect.objectContaining({ action: 'stop', sessionId: 'session-a', elapsedMs: 900_217 }),
    expect.objectContaining({ action: 'report', sessionId: 'session-a', pages: 15 }),
  ]);
  const stopAttempts = send.mock.calls.map(call => call[1]).filter(command => command.action === 'stop');
  expect(stopAttempts.length).toBeGreaterThan(0);
  expect(new Set(stopAttempts.map(command => JSON.stringify(command))).size).toBe(1);
  expect(journal).toMatchObject({ terminal: true, elapsedMs: 900_217 });
  expect(readingNative.acknowledge).not.toHaveBeenCalled();
});

test.each(['stop', 'report'] as const)('a locally queued %s forbids resuming even before the server state changes', async action => {
  const hook = await ready();
  mockDisk[READING_OUTBOX_KEY] = { accountId: 'demo-reader', commands: [{
    action, operationId: `pending-${action}`, challengeId: 'reading-demo', sessionId: 'session-a',
    ...(action === 'stop' ? { deviceId: 'phone', elapsedMs: 900_000, integrity: 'ok' } : { pages: 5 }),
  }] };

  await act(async () => { await hook.result.current.resume(); });

  expect(resume).not.toHaveBeenCalled();
  expect(send).not.toHaveBeenCalled();
  expect(queued()).toHaveLength(1);
  expect(journal).toEqual(softPaused);
});

test('server awaiting_pages cannot be reopened by an otherwise resumable native journal', async () => {
  server = { ...server, session: { ...server.session!, status: 'awaiting_pages', elapsedMs: 900_000 } };
  mockDisk[cacheKey] = server;
  const hook = await ready();

  expect(hook.result.current.canResume).toBe(false);
  await act(async () => { await hook.result.current.resume(); });
  expect(resume).not.toHaveBeenCalled();
  expect(readingNative.start).not.toHaveBeenCalled();
});

test('a terminal day-end pause cannot resume and still offers pages for its shorter exact result', async () => {
  journal = { ...softPaused, terminal: true, canResume: false, elapsedMs: 321_987, accumulatedMs: 321_987 };
  const hook = await ready();

  expect(hook.result.current.canResume).toBe(false);
  expect(hook.result.current.awaitingPages).toBe(true);
  await act(async () => { await hook.result.current.resume(); });
  expect(resume).not.toHaveBeenCalled();
  expect(send.mock.calls.map(call => call[1])).toEqual([expect.objectContaining({ action: 'stop', elapsedMs: 321_987 })]);
  await act(async () => { await hook.result.current.report(4); });
  expect(send.mock.calls.map(call => call[1])).toEqual([
    expect.objectContaining({ action: 'stop', elapsedMs: 321_987 }),
    expect.objectContaining({ action: 'report', pages: 4 }),
  ]);
  expect(readingNative.acknowledge).toHaveBeenCalledWith('demo-reader', 'session-a');
});

test('legacy paused sessions still close and require pages instead of becoming resumable', async () => {
  const { resumeVersion: _version, terminal: _terminal, canResume: _canResume, ...legacy } = softPaused;
  journal = legacy;
  const hook = await ready();

  expect(hook.result.current.resumableSession).toBe(false);
  expect(hook.result.current.canResume).toBe(false);
  expect(hook.result.current.awaitingPages).toBe(true);
  await act(async () => { await hook.result.current.resume(); });
  expect(resume).not.toHaveBeenCalled();
  expect(send.mock.calls.map(call => call[1])).toEqual([expect.objectContaining({ action: 'stop', elapsedMs: 900_000 })]);
});

test('an actual paused approach takes precedence over a previously completed daily goal', async () => {
  server = { ...server, me: { ...server.me!, completedDays: 1,
    history: [{ day: 1, state: 'complete', elapsedMs: 3_600_000, pages: 30 }] } };
  mockDisk[cacheKey] = server;
  const hook = await ready();

  expect(hook.result.current.timerState).toBe('paused');
  expect(hook.result.current.canResume).toBe(true);
  expect(hook.result.current.awaitingPages).toBe(false);
});

test('account switching rejects old resume and finish handlers without consuming prior-account evidence', async () => {
  const hook = await ready();
  const oldResume = hook.result.current.resume;
  const oldFinish = hook.result.current.finish;
  mockAccount = 'another-reader';
  await hook.rerender({});
  await waitFor(() => expect(hook.result.current.busy).toBe(false));

  await act(async () => {
    await oldResume(); await oldFinish();
    await hook.result.current.resume(); await hook.result.current.finish();
  });

  expect(hook.result.current.canResume).toBe(false);
  expect(hook.result.current.resumableSession).toBe(false);
  expect(resume).not.toHaveBeenCalled();
  expect(finish).not.toHaveBeenCalled();
  expect(send).not.toHaveBeenCalled();
  expect(readingNative.acknowledge).not.toHaveBeenCalled();
  expect(journal).toEqual(softPaused);
});

test.each([
  { accountId: 'another-reader' },
  { sessionId: 'another-session' },
])('resume rechecks native ownership after render: %s', async replacement => {
  const hook = await ready();
  journal = { ...softPaused, ...replacement };

  await act(async () => { await hook.result.current.resume(); });

  expect(resume).not.toHaveBeenCalled();
  expect(send).not.toHaveBeenCalled();
  expect(readingNative.acknowledge).not.toHaveBeenCalled();
});

test('a late native resume result cannot attach the previous account session after an account switch', async () => {
  const hook = await ready();
  const resumed = deferred<NativeReadingSession>();
  resume.mockImplementationOnce(() => resumed.promise);
  let action!: Promise<void>;
  await act(async () => { action = hook.result.current.resume(); });
  await waitFor(() => expect(resume).toHaveBeenCalledTimes(1));
  mockAccount = 'another-reader';
  await hook.rerender({});

  await act(async () => {
    resumed.resolve({ ...softPaused, status: 'running', canResume: false, elapsedMs: null });
    await action;
  });

  expect(hook.result.current.resumableSession).toBe(false);
  expect(hook.result.current.canResume).toBe(false);
  expect(hook.result.current.timerState).not.toBe('running');
  expect(send).not.toHaveBeenCalled();
  expect(readingNative.acknowledge).not.toHaveBeenCalled();
});

test('a newer pause wins over a delayed native resume response and repeated resume taps', async () => {
  const hook = await ready();
  const resumed = deferred<NativeReadingSession>();
  resume.mockImplementationOnce(() => resumed.promise);
  let action!: Promise<void>;
  await act(async () => { action = hook.result.current.resume(); });
  await waitFor(() => expect(resume).toHaveBeenCalledTimes(1));

  await act(async () => {
    await hook.result.current.resume();
    await hook.result.current.pause();
  });
  expect(pause).toHaveBeenCalledTimes(1);
  expect(hook.result.current.timerState).toBe('paused');
  await act(async () => {
    resumed.resolve({ ...softPaused, status: 'running', canResume: false, elapsedMs: null });
    await action;
  });
  await waitFor(() => expect(hook.result.current.busy).toBe(false));

  expect(resume).toHaveBeenCalledTimes(1);
  expect(hook.result.current.timerState).toBe('paused');
  expect(hook.result.current.canResume).toBe(true);
  expect(hook.result.current.awaitingPages).toBe(false);
  expect(send).not.toHaveBeenCalled();
  expect(queued()).toEqual([]);
});

test('an account switch while checking pending commands prevents the native resume from starting', async () => {
  const hook = await ready();
  const checking = deferred<void>();
  const checked = deferred<{ ok: boolean; value: ReadingQueue | null }>();
  jest.mocked(readJSON).mockImplementationOnce(() => {
    checking.resolve();
    return checked.promise;
  });
  let action!: Promise<void>;
  await act(async () => { action = hook.result.current.resume(); });
  await checking.promise;
  mockAccount = 'another-reader';
  await hook.rerender({});

  await act(async () => {
    checked.resolve({ ok: true, value: null });
    await action;
  });
  await waitFor(() => expect(hook.result.current.busy).toBe(false));

  expect(resume).not.toHaveBeenCalled();
  expect(send).not.toHaveBeenCalled();
  expect(hook.result.current.resumableSession).toBe(false);
  expect(journal).toEqual(softPaused);
});

test('unreadable pending-command storage prevents resume without altering the frozen journal', async () => {
  const hook = await ready();
  jest.mocked(readJSON).mockResolvedValueOnce({ ok: false, value: null });

  await act(async () => { await hook.result.current.resume(); });

  expect(resume).not.toHaveBeenCalled();
  expect(send).not.toHaveBeenCalled();
  expect(journal).toEqual(softPaused);
  expect(hook.result.current.timerState).toBe('paused');
});

test('a lock-screen generation change during the queue read rejects stale resume without relocking', async () => {
  const hook = await ready();
  const checking = deferred<void>();
  const checked = deferred<{ ok: boolean; value: ReadingQueue | null }>();
  jest.mocked(readJSON).mockImplementationOnce(() => {
    checking.resolve();
    return checked.promise;
  });
  let action!: Promise<void>;
  await act(async () => { action = hook.result.current.resume(); });
  await checking.promise;
  const newerPause: NativeReadingSession = {
    ...softPaused, generation: 'new-lock-screen-generation', accumulatedMs: 901_234, elapsedMs: 901_234,
  };
  journal = newerPause;

  await act(async () => {
    checked.resolve({ ok: true, value: null });
    await action;
  });

  expect(resume).toHaveBeenCalledWith('demo-reader', 'session-a', 'generation-2');
  expect(journal).toEqual(newerPause);
  expect(hook.result.current.timerState).toBe('paused');
  expect(hook.result.current.error).toBeDefined();
  expect(send).not.toHaveBeenCalled();
  expect(readingNative.start).not.toHaveBeenCalled();
});

test('a protocol-v1 journal without a generation cannot resume or finish', async () => {
  journal = { ...softPaused, generation: undefined, elapsedMs: 3_700_000, accumulatedMs: 3_700_000 };
  const hook = await ready();

  expect(hook.result.current.canResume).toBe(false);
  await act(async () => { await hook.result.current.resume(); await hook.result.current.finish(); });

  expect(resume).not.toHaveBeenCalled();
  expect(finish).not.toHaveBeenCalled();
  expect(journal).toMatchObject({ status: 'paused', terminal: false, elapsedMs: 3_700_000 });
  expect(send).not.toHaveBeenCalled();
  expect(queued()).toEqual([]);
});

test('pause remains immediate while refresh is stalled and its late response never submits a stop', async () => {
  journal = { ...softPaused, status: 'running', elapsedMs: null, canResume: false };
  const response = deferred<ReadingDetail>();
  fetchDetail.mockImplementation(() => response.promise);
  const hook = await renderHook(() => useReadingChallenge('reading-demo'));
  await waitFor(() => expect(fetchDetail).toHaveBeenCalledTimes(1));
  expect(hook.result.current.busy).toBe(true);

  await act(async () => { await hook.result.current.pause(); });
  expect(pause).toHaveBeenCalledTimes(1);
  expect(hook.result.current.timerState).toBe('paused');
  expect(hook.result.current.canResume).toBe(true);
  expect(hook.result.current.awaitingPages).toBe(false);
  expect(send).not.toHaveBeenCalled();
  await act(async () => { response.resolve(server); });
  await waitFor(() => expect(hook.result.current.busy).toBe(false));

  expect(hook.result.current.timerState).toBe('paused');
  expect(send).not.toHaveBeenCalled();
  expect(queued()).toEqual([]);
});
