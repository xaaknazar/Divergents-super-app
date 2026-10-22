import { act, renderHook, waitFor } from '@testing-library/react-native';
import { AppState, type AppStateStatus } from 'react-native';
import { readingNative, type ReadingAllowedAppsStatus, type ReadingCapabilities } from '../readingNative';
import { useReadingAllowedApps } from '../useReadingAllowedApps';

let mockAccount: string | undefined = 'reader-a';
jest.mock('@clerk/clerk-expo', () => ({ useAuth: () => ({ userId: mockAccount }) }));
jest.mock('../readingNative', () => ({ readingNative: {
  capabilities: jest.fn(), allowedAppsStatus: jest.fn(), selectAllowedApps: jest.fn(), authorize: jest.fn(),
  start: jest.fn(), pause: jest.fn(), finish: jest.fn(), acknowledge: jest.fn(),
} }));
const capabilities = jest.mocked(readingNative.capabilities);
const status = jest.mocked(readingNative.allowedAppsStatus);
const select = jest.mocked(readingNative.selectAllowedApps);
const authorize = jest.mocked(readingNative.authorize);
const supported: ReadingCapabilities = { available: true, authorized: true, blockingMode: 'all-apps',
  platform: 'ios', selectedCount: 0, supportsAllowedApps: true };
const first: ReadingAllowedAppsStatus = { count: 2, revision: 'rev-a', editable: true, needsReselection: false };
let foreground: ((state: AppStateStatus) => void) | undefined;

function deferred<T>() {
  let resolve!: (value: T) => void, reject!: (error: unknown) => void;
  const promise = new Promise<T>((done, fail) => { resolve = done; reject = fail; });
  return { promise, resolve, reject };
}
async function ready() {
  const hook = await renderHook(() => useReadingAllowedApps('challenge-a'));
  await waitFor(() => expect(hook.result.current?.count).toBe(2));
  return hook;
}
beforeEach(() => {
  mockAccount = 'reader-a'; foreground = undefined;
  jest.clearAllMocks();
  capabilities.mockReset().mockResolvedValue(supported);
  status.mockReset().mockResolvedValue(first);
  select.mockReset().mockResolvedValue({ ...first, count: 3, revision: 'rev-b' });
  authorize.mockReset().mockResolvedValue(undefined);
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_event, listener) => {
    foreground = listener; return { remove: jest.fn() };
  });
});
afterEach(() => { jest.restoreAllMocks(); });

test('uses only the current account and fresh native revision without touching a timer', async () => {
  const h = await ready();
  expect(status).toHaveBeenCalledWith('reader-a');
  status.mockResolvedValue({ ...first, revision: 'fresh-revision' });
  await act(async () => { await h.result.current!.choose(); });
  expect(select).toHaveBeenCalledWith('reader-a', 'fresh-revision');
  expect(h.result.current).toMatchObject({ count: 3, busy: false, editable: true });
  expect(readingNative.start).not.toHaveBeenCalled();
  expect(readingNative.pause).not.toHaveBeenCalled();
  expect(readingNative.finish).not.toHaveBeenCalled();
  expect(readingNative.acknowledge).not.toHaveBeenCalled();
});

test.each([
  { ...supported, supportsAllowedApps: false },
  { ...supported, blockingMode: 'selected' as const },
])('does not expose unavailable exception controls %#', async caps => {
  capabilities.mockResolvedValue(caps);
  const h = await renderHook(() => useReadingAllowedApps('challenge-a'));
  await waitFor(() => expect(capabilities).toHaveBeenCalled());
  expect(h.result.current).toBeUndefined();
  expect(status).not.toHaveBeenCalled();
  expect(select).not.toHaveBeenCalled();
});

test('does not invent zero allowed apps while the first native status is unknown', async () => {
  const pending = deferred<ReadingAllowedAppsStatus>();
  status.mockReturnValueOnce(pending.promise);
  const h = await renderHook(() => useReadingAllowedApps('challenge-a'));
  await waitFor(() => expect(status).toHaveBeenCalledTimes(1));
  expect(h.result.current).toMatchObject({ count: null, editable: false, busy: true });
  await act(async () => { pending.resolve(first); });
  expect(h.result.current?.count).toBe(2);
});

test('does not claim a zero selection after the first status read fails', async () => {
  status.mockRejectedValueOnce(new Error('Не удалось прочитать настройки'));
  const h = await renderHook(() => useReadingAllowedApps('challenge-a'));
  await waitFor(() => expect(h.result.current?.error).toBe('Не удалось прочитать настройки'));
  expect(h.result.current).toMatchObject({ count: null, editable: false, busy: false });
  await act(async () => { await h.result.current!.retry(); });
  expect(h.result.current).toMatchObject({ count: 2, editable: true, busy: false });
  expect(h.result.current?.error).toBeUndefined();
});

test('a failed foreground refresh retains the last known selection without promising a new one', async () => {
  const h = await ready();
  status.mockRejectedValueOnce(new Error('Настройки временно недоступны'));
  await act(async () => { foreground?.('active'); });
  await waitFor(() => expect(h.result.current?.error).toBe('Настройки временно недоступны'));
  expect(h.result.current?.count).toBe(2);
  expect(select).not.toHaveBeenCalled();
});

test('authorizes if necessary, retains the existing selection until native confirmation and locks duplicate opens', async () => {
  const h = await ready();
  capabilities.mockResolvedValue({ ...supported, authorized: false });
  const pending = deferred<ReadingAllowedAppsStatus>(); select.mockReturnValueOnce(pending.promise);
  let choosing!: Promise<void>;
  await act(async () => { choosing = h.result.current!.choose(); });
  await waitFor(() => expect(select).toHaveBeenCalledTimes(1));
  expect(authorize).toHaveBeenCalledTimes(1);
  expect(h.result.current).toMatchObject({ count: 2, busy: true });
  await act(async () => { await h.result.current!.choose(); foreground?.('active'); });
  expect(select).toHaveBeenCalledTimes(1);
  expect(status).toHaveBeenCalledTimes(2);
  await act(async () => { pending.resolve({ ...first, count: 4, revision: 'saved' }); await choosing; });
  expect(h.result.current).toMatchObject({ count: 4, busy: false });
});

test('a native cancellation or failed picker never fabricates a changed count', async () => {
  const h = await ready();
  select.mockResolvedValueOnce(first);
  await act(async () => { await h.result.current!.choose(); });
  expect(h.result.current).toMatchObject({ count: 2, busy: false });
  select.mockRejectedValueOnce(new Error('Выбор отменён'));
  await act(async () => { await h.result.current!.choose(); });
  expect(h.result.current).toMatchObject({ count: 2, busy: false, error: 'Выбор отменён' });
});

test('disallows choices for a current approach or a native noneditable journal', async () => {
  const h = await renderHook(() => useReadingAllowedApps('challenge-a', 'session-a'));
  await waitFor(() => expect(h.result.current?.count).toBe(2));
  expect(h.result.current?.editable).toBe(false);
  await act(async () => { await h.result.current!.choose(); });
  expect(select).not.toHaveBeenCalled();
  const other = await ready();
  status.mockResolvedValue({ ...first, editable: false });
  await act(async () => { await other.result.current!.choose(); });
  expect(other.result.current?.editable).toBe(false);
  expect(select).not.toHaveBeenCalled();
});

test('foreground and finishing an approach refresh current status and reselect requirement', async () => {
  const h = await renderHook(({ sessionId }: { sessionId?: string }) => useReadingAllowedApps('challenge-a', sessionId),
    { initialProps: { sessionId: 'session-a' as string | undefined } });
  await waitFor(() => expect(h.result.current?.count).toBe(2));
  status.mockResolvedValue({ ...first, count: 0, needsReselection: true });
  await act(async () => { foreground?.('active'); });
  await waitFor(() => expect(h.result.current?.needsReselection).toBe(true));
  expect(h.result.current?.editable).toBe(false);
  await h.rerender({ sessionId: undefined });
  await waitFor(() => expect(h.result.current?.editable).toBe(true));
});

test('new Screen Time authorization refreshes exceptions without requiring an app foreground event', async () => {
  status.mockResolvedValueOnce({ ...first, editable: false, needsReselection: true });
  const h = await renderHook(({ authorized }: { authorized: boolean }) =>
    useReadingAllowedApps('challenge-a', undefined, authorized), { initialProps: { authorized: false } });
  await waitFor(() => expect(h.result.current?.needsReselection).toBe(true));
  expect(h.result.current?.editable).toBe(false);
  await h.rerender({ authorized: true });
  await waitFor(() => expect(status).toHaveBeenCalledTimes(2));
  expect(h.result.current).toMatchObject({ count: 2, editable: true, needsReselection: false, busy: false });
  expect(select).not.toHaveBeenCalled();
});

test('a stale idle choose callback cannot open the picker after a session starts', async () => {
  const h = await renderHook(({ sessionId }: { sessionId?: string }) => useReadingAllowedApps('challenge-a', sessionId),
    { initialProps: { sessionId: undefined as string | undefined } });
  await waitFor(() => expect(h.result.current?.count).toBe(2));
  const staleChoose = h.result.current!.choose;
  await h.rerender({ sessionId: 'new-session' });
  await waitFor(() => expect(h.result.current?.busy).toBe(false));
  await act(async () => { await staleChoose(); });
  expect(select).not.toHaveBeenCalled();
  expect(h.result.current?.editable).toBe(false);
});

test('a session starting during a capability wait prevents the picker from opening', async () => {
  const h = await renderHook(({ sessionId }: { sessionId?: string }) => useReadingAllowedApps('challenge-a', sessionId),
    { initialProps: { sessionId: undefined as string | undefined } });
  await waitFor(() => expect(h.result.current?.count).toBe(2));
  const pending = deferred<ReadingCapabilities>(); capabilities.mockReturnValueOnce(pending.promise);
  let choosing!: Promise<void>;
  await act(async () => { choosing = h.result.current!.choose(); });
  await h.rerender({ sessionId: 'new-session' });
  await act(async () => { pending.resolve(supported); await choosing; });
  expect(select).not.toHaveBeenCalled();
  expect(h.result.current?.editable).toBe(false);
  expect(h.result.current?.busy).toBe(false);
});

test('rechecks native support at choose time instead of trusting a previous render', async () => {
  const h = await ready();
  capabilities.mockResolvedValue({ ...supported, supportsAllowedApps: false });
  await act(async () => { await h.result.current!.choose(); });
  expect(select).not.toHaveBeenCalled();
});

test('logout invalidates the native picker owner and ignores its late success', async () => {
  const h = await renderHook(() => useReadingAllowedApps('challenge-a'));
  await waitFor(() => expect(h.result.current?.count).toBe(2));
  const pending = deferred<ReadingAllowedAppsStatus>(); select.mockReturnValueOnce(pending.promise);
  let choosing!: Promise<void>;
  await act(async () => { choosing = h.result.current!.choose(); });
  await waitFor(() => expect(select).toHaveBeenCalledTimes(1));
  mockAccount = undefined;
  await h.rerender(undefined);
  await waitFor(() => expect(status).toHaveBeenCalledWith(''));
  expect(h.result.current).toBeUndefined();
  await act(async () => { pending.resolve({ ...first, count: 7 }); await choosing; });
  expect(h.result.current).toBeUndefined();
});

test('an old account picker cannot expose its result or error in another account', async () => {
  const h = await ready();
  const pending = deferred<ReadingAllowedAppsStatus>(); select.mockReturnValueOnce(pending.promise);
  let choosing!: Promise<void>;
  await act(async () => { choosing = h.result.current!.choose(); });
  await waitFor(() => expect(select).toHaveBeenCalledTimes(1));
  mockAccount = 'reader-b'; status.mockResolvedValue({ ...first, count: 0, revision: 'b' });
  await h.rerender(undefined);
  await waitFor(() => expect(h.result.current?.count).toBe(0));
  await act(async () => { pending.reject(new Error('Ошибка старого аккаунта')); await choosing; });
  expect(h.result.current).toMatchObject({ count: 0, busy: false });
  expect(h.result.current?.error).toBeUndefined();
});

test('A-to-B-to-A does not revive an old picker or stale handler', async () => {
  const h = await ready();
  const staleChoose = h.result.current!.choose;
  const pending = deferred<ReadingAllowedAppsStatus>(); select.mockReturnValueOnce(pending.promise);
  let choosing!: Promise<void>;
  await act(async () => { choosing = staleChoose(); });
  await waitFor(() => expect(select).toHaveBeenCalledTimes(1));
  mockAccount = 'reader-b'; status.mockResolvedValue({ ...first, count: 0 });
  await h.rerender(undefined);
  await waitFor(() => expect(h.result.current?.count).toBe(0));
  mockAccount = 'reader-a'; status.mockResolvedValue({ ...first, count: 1, revision: 'new-a' });
  await h.rerender(undefined);
  await waitFor(() => expect(h.result.current?.count).toBe(1));
  await act(async () => { pending.resolve({ ...first, count: 9 }); await choosing; await staleChoose(); });
  expect(h.result.current?.count).toBe(1);
  expect(select).toHaveBeenCalledTimes(1);
});

test('a stale challenge callback cannot open the picker in another challenge', async () => {
  const h = await renderHook(({ challengeId }: { challengeId: string }) => useReadingAllowedApps(challengeId),
    { initialProps: { challengeId: 'challenge-a' } });
  await waitFor(() => expect(h.result.current?.count).toBe(2));
  const staleChoose = h.result.current!.choose;
  await h.rerender({ challengeId: 'challenge-b' });
  await waitFor(() => expect(h.result.current?.busy).toBe(false));
  await act(async () => { await staleChoose(); });
  expect(select).not.toHaveBeenCalled();
});

test('unmount during the authorization wait never opens a picker', async () => {
  const h = await ready();
  capabilities.mockResolvedValue({ ...supported, authorized: false });
  const pending = deferred<void>(); authorize.mockReturnValueOnce(pending.promise);
  let choosing!: Promise<void>;
  await act(async () => { choosing = h.result.current!.choose(); });
  await waitFor(() => expect(authorize).toHaveBeenCalledTimes(1));
  await h.unmount();
  pending.resolve(); await choosing;
  expect(select).not.toHaveBeenCalled();
});
