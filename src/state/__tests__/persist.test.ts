const mockKeychain = new Map<string, string>();
const mockFiles = new Map<string, string>();
let mockFailInfo = false;
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async (k: string) => mockKeychain.get(k) ?? null),
  setItemAsync: jest.fn(async (k: string, v: string) => { mockKeychain.set(k, v); }),
  deleteItemAsync: jest.fn(async (k: string) => { mockKeychain.delete(k); }),
}));
jest.mock('expo-file-system/legacy', () => ({
  documentDirectory: 'file:///docs/',
  getInfoAsync: jest.fn(async (uri: string) => {
    if (mockFailInfo) throw new Error('locked');
    return { exists: uri.endsWith('/') || mockFiles.has(uri) };
  }),
  makeDirectoryAsync: jest.fn(async () => {}),
  readAsStringAsync: jest.fn(async (uri: string) => { const v = mockFiles.get(uri); if (v === undefined) throw new Error('missing'); return v; }),
  writeAsStringAsync: jest.fn(async (uri: string, v: string) => { mockFiles.set(uri, v); }),
  deleteAsync: jest.fn(async (uri: string) => { mockFiles.delete(uri); }),
}));
import { readJSON, saveJSON } from '../persist';

const KEY = 'dvg.challengeProgressOutbox.v2';
const big = { ownerId: 'u', operations: [], confirmed: Array.from({ length: 40 }, (_, i) => ({ challengeId: 'c', day: i, taskId: 'reading', version: 1, value: 20, done: true })) };
beforeEach(() => { mockKeychain.clear(); mockFiles.clear(); mockFailInfo = false; });

test('a large value lives in a file and reads back', async () => {
  await saveJSON(KEY, big, { strict: true });
  expect(mockKeychain.get(KEY)).toMatch(/^@dvg-file-v1:/);
  expect(await readJSON(KEY, null)).toEqual({ ok: true, value: big });
});
test('after the app was deleted and reinstalled (keychain marker kept, files gone) nothing is saved — not a permanent failure', async () => {
  await saveJSON(KEY, big, { strict: true });
  mockFiles.clear(); // iOS removes the app sandbox on deletion; the keychain item survives.
  expect(await readJSON(KEY, 'empty')).toEqual({ ok: true, value: 'empty' });
  // The next save works and is readable again.
  await saveJSON(KEY, big, { strict: true });
  expect(await readJSON(KEY, null)).toEqual({ ok: true, value: big });
});
test('a file that exists but cannot be checked or read is still an honest failure', async () => {
  await saveJSON(KEY, big, { strict: true });
  mockFailInfo = true;
  expect((await readJSON(KEY, null)).ok).toBe(false);
});
