import { requireOptionalNativeModule } from 'expo-modules-core';
import { readingNative, NativeReadingSession } from '../readingNative';

jest.mock('expo-modules-core', () => {
  const native = { snapshot: jest.fn(), acknowledge: jest.fn() };
  return { requireOptionalNativeModule: () => native };
});
const native = requireOptionalNativeModule('ReadingFocus') as unknown as { snapshot: jest.Mock; acknowledge: jest.Mock };
const qa: NativeReadingSession = { accountId: 'qa-no-real-account', sessionId: 'qa-session', deviceId: 'qa-iphone',
  book: 'Проверка блокировки', budgetMs: 60000, targetMs: 15000, anchorMs: 1, bootId: 'boot', elapsedMs: 30000, integrity: 'ok', status: 'paused' };
beforeEach(() => { native.snapshot.mockReset().mockResolvedValue(null); native.acknowledge.mockReset().mockResolvedValue(undefined); });

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
