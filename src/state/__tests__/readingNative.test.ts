import { requireOptionalNativeModule } from 'expo-modules-core';
import { readingNative, NativeReadingSession } from '../readingNative';

jest.mock('expo-modules-core', () => {
  const native = { capabilities: jest.fn(), snapshot: jest.fn(), pause: jest.fn(), start: jest.fn(), acknowledge: jest.fn() };
  return { requireOptionalNativeModule: () => native };
});
const native = requireOptionalNativeModule('ReadingFocus') as unknown as {
  capabilities: jest.Mock; snapshot: jest.Mock; pause: jest.Mock; start: jest.Mock; acknowledge: jest.Mock;
  reconcileLiveActivity?: jest.Mock; restoreLiveActivity?: jest.Mock;
  endLiveActivities?: jest.Mock;
  resume?: jest.Mock; finish?: jest.Mock;
  allowedAppsStatus?: jest.Mock; selectAllowedApps?: jest.Mock;
};
const qa: NativeReadingSession = { accountId: 'qa-no-real-account', sessionId: 'qa-session', deviceId: 'qa-iphone',
  book: 'Проверка блокировки', budgetMs: 60000, targetMs: 15000, anchorMs: 1, bootId: 'boot', elapsedMs: 30000, integrity: 'ok', status: 'paused' };
beforeEach(() => {
  native.capabilities.mockReset(); native.pause.mockReset(); native.start.mockReset();
  native.snapshot.mockReset().mockResolvedValue(null); native.acknowledge.mockReset().mockResolvedValue(undefined);
  delete native.reconcileLiveActivity; delete native.restoreLiveActivity;
  delete native.endLiveActivities;
  delete native.resume; delete native.finish;
  delete native.allowedAppsStatus; delete native.selectAllowedApps;
});

test('old native binaries cannot silently enable reader-app exceptions', async () => {
  await expect(readingNative.allowedAppsStatus('reader')).resolves.toEqual({ count: 0, revision: 'unsupported', editable: false, needsReselection: false });
  await expect(readingNative.selectAllowedApps('reader')).rejects.toThrow('недоступен');
});
test('allowed-apps status and picker are account/revision bound and do not expose tokens', async () => {
  const status = { count: 2, revision: 'revision-1', editable: true, needsReselection: false };
  native.allowedAppsStatus = jest.fn().mockResolvedValue(JSON.stringify({ ...status, applicationTokens: ['opaque'] }));
  native.selectAllowedApps = jest.fn().mockResolvedValue(status);
  await expect(readingNative.allowedAppsStatus('reader')).resolves.toEqual(status);
  await expect(readingNative.selectAllowedApps('reader', 'revision-1')).resolves.toEqual(status);
  expect(native.allowedAppsStatus).toHaveBeenCalledWith('reader');
  expect(native.selectAllowedApps).toHaveBeenCalledWith('reader', 'revision-1');
  expect(native.start).not.toHaveBeenCalled();
  expect(native.pause).not.toHaveBeenCalled();
});
test('a cancelled picker may return the unchanged revision; an empty saved selection resets to strict mode', async () => {
  const status = { count: 0, revision: 'empty', editable: true, needsReselection: false };
  native.selectAllowedApps = jest.fn().mockResolvedValue(JSON.stringify(status));
  await expect(readingNative.selectAllowedApps('reader')).resolves.toEqual(status);
  expect(native.selectAllowedApps).toHaveBeenCalledWith('reader', null);
});
test.each([-1, 51, 1.5])('out-of-range exception count %s rejects instead of promising an invalid shield policy', async count => {
  native.allowedAppsStatus = jest.fn().mockResolvedValue({ count, revision: 'bad', editable: true, needsReselection: false });
  await expect(readingNative.allowedAppsStatus('reader')).rejects.toThrow();
});

test.each(['resume', 'finish'] as const)('%s does not pretend an old native binary supports resumable sessions', async method => {
  await expect(readingNative[method]('reader', 'session', 'old-generation')).rejects.toThrow();
  expect(native.start).not.toHaveBeenCalled();
  expect(native.pause).not.toHaveBeenCalled();
  expect(native.acknowledge).not.toHaveBeenCalled();
});
test.each(['resume', 'finish'] as const)('%s preserves native cumulative timing and session protocol markers', async method => {
  const session = { ...qa, accountId: 'reader', resumeVersion: 1, terminal: method === 'finish', canResume: false,
    status: method === 'resume' ? 'running' : 'paused', generation: 'new-monitor-generation', accumulatedMs: 30000, deadlineMs: 3600001 };
  native[method] = jest.fn().mockResolvedValue(JSON.stringify(session));
  await expect(readingNative[method]('reader', 'qa-session', 'old-generation')).resolves.toEqual(session);
  expect(native[method]).toHaveBeenCalledWith('reader', 'qa-session', 'old-generation');
});
test('new resumable QA evidence is not treated as a completed legacy QA journal', async () => {
  const session = { ...qa, resumeVersion: 1, terminal: false, canResume: true };
  native.snapshot.mockResolvedValue(JSON.stringify(session));
  await expect(readingNative.snapshot()).resolves.toEqual(session);
  expect(native.acknowledge).not.toHaveBeenCalled();
});

test('older binaries retain the existing pause fallback when card cleanup is unavailable', async () => {
  await expect(readingNative.endLiveActivities()).resolves.toBeUndefined();
  expect(native.start).not.toHaveBeenCalled();
  expect(native.acknowledge).not.toHaveBeenCalled();
});
test('account-exit card cleanup calls the native method without deleting session evidence', async () => {
  native.endLiveActivities = jest.fn().mockResolvedValue(undefined);
  await readingNative.endLiveActivities();
  expect(native.endLiveActivities).toHaveBeenCalledTimes(1);
  expect(native.acknowledge).not.toHaveBeenCalled();
  expect(native.start).not.toHaveBeenCalled();
});

test.each(['reconcileLiveActivity', 'restoreLiveActivity'] as const)('%s gracefully supports older native binaries', async method => {
  await expect(readingNative[method]('reader', 'session')).resolves.toEqual({ state: 'unsupported', canRestore: false });
});
test.each(['reconcileLiveActivity', 'restoreLiveActivity'] as const)('%s parses the native JSON status without changing session evidence', async method => {
  const status = { state: 'missing', canRestore: true };
  native[method] = jest.fn().mockResolvedValue(JSON.stringify(status));
  await expect(readingNative[method]('reader', 'session')).resolves.toEqual(status);
  expect(native[method]).toHaveBeenCalledWith('reader', 'session');
  expect(native.start).not.toHaveBeenCalled();
  expect(native.acknowledge).not.toHaveBeenCalled();
});
test('activity status supports an object bridge response and surfaces native request diagnostics', async () => {
  const status = { state: 'error', canRestore: true, error: 'Activity request was denied' };
  native.reconcileLiveActivity = jest.fn().mockResolvedValue(status);
  await expect(readingNative.reconcileLiveActivity('reader', 'session')).resolves.toEqual(status);
});
test('invalid card status rejects without affecting a running timer', async () => {
  native.restoreLiveActivity = jest.fn().mockResolvedValue('{"state":"active"}');
  await expect(readingNative.restoreLiveActivity('reader', 'session')).rejects.toThrow();
  expect(native.pause).not.toHaveBeenCalled();
  expect(native.start).not.toHaveBeenCalled();
});
test('activity errors attached to start cannot invalidate valid timer evidence', async () => {
  const session = { ...qa, accountId: 'user_real', status: 'running', liveActivity: { state: 'error', error: 'request failed' } };
  native.start.mockResolvedValue(JSON.stringify(session));
  await expect(readingNative.start('user_real', 'qa-session', 'phone', 'Книга', 60_000, 60_000)).resolves.toEqual(
    expect.objectContaining({ accountId: 'user_real', status: 'running' }),
  );
});

test.each([
  ['all-apps', 0, 'all-apps'],
  ['selected', 3, 'selected'],
  [undefined, 0, 'selected'],
])('normalizes capability mode %s without changing selectedCount %s', async (blockingMode, selectedCount, expectedMode) => {
  native.capabilities.mockResolvedValue({ available: true, authorized: true, selectedCount, platform: 'ios',
    ...(blockingMode ? { blockingMode } : {}) });
  await expect(readingNative.capabilities()).resolves.toEqual({
    available: true, authorized: true, selectedCount, platform: 'ios', blockingMode: expectedMode,
  });
});

test.each(['all-apps', 'selected', undefined] as const)('retains the actual or legacy session mode %s across native reads', async blockingMode => {
  const session = { ...qa, accountId: 'user_real', ...(blockingMode ? { blockingMode } : {}) };
  native.snapshot.mockResolvedValue(JSON.stringify(session));
  native.pause.mockResolvedValue(JSON.stringify(session));
  native.start.mockResolvedValue(JSON.stringify(session));
  await expect(readingNative.snapshot()).resolves.toEqual(session);
  await expect(readingNative.pause()).resolves.toEqual(session);
  await expect(readingNative.start('user_real', 'qa-session', 'phone', 'Книга', 60_000, 60_000)).resolves.toEqual(session);
});

test('legacy completed QA session is safely acknowledged without any server request', async () => {
  native.snapshot.mockResolvedValue(JSON.stringify(qa));
  await expect(readingNative.snapshot()).resolves.toBeNull();
  expect(native.acknowledge).toHaveBeenCalledWith('qa-no-real-account', 'qa-session');
});
test('concurrent refresh and timer poll share a single QA migration', async () => {
  native.snapshot.mockResolvedValue(JSON.stringify(qa));
  await expect(Promise.all([readingNative.snapshot(), readingNative.snapshot()])).resolves.toEqual([null, null]);
  expect(native.acknowledge).toHaveBeenCalledTimes(1);
});
test('failed local cleanup remains retryable and does not report success', async () => {
  native.snapshot.mockResolvedValue(JSON.stringify(qa)); native.acknowledge.mockRejectedValueOnce(new Error('storage'));
  await expect(readingNative.snapshot()).rejects.toThrow('очистку проверочного таймера');
  await expect(readingNative.snapshot()).resolves.toBeNull(); expect(native.acknowledge).toHaveBeenCalledTimes(2);
});
test.each([
  { ...qa, status: 'running' },
  { ...qa, accountId: 'user_real', elapsedMs: 0 },
  { ...qa, deviceId: 'real-phone' },
  { ...qa, book: 'Реальная книга' },
  { ...qa, budgetMs: 3600000 },
])('never clears a live test or a non-QA session: %j', async session => {
  native.snapshot.mockResolvedValue(JSON.stringify(session));
  await expect(readingNative.snapshot()).resolves.toEqual(session); expect(native.acknowledge).not.toHaveBeenCalled();
});
