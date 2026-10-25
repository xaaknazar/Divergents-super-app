import { act, renderHook, waitFor } from '@testing-library/react-native';
import { addReadingBook, fetchReadingHistory, ReadingHistory } from '../../data/readingBooks';
import { useReadingLibrary } from '../useReadingLibrary';
import { individualReadingFixture, readingBookExample } from '../../storybook/readingFixtures';

let mockUserId = 'demo-reader';
let mockToken = jest.fn(async (): Promise<string | null> => 'token');
jest.mock('@clerk/clerk-expo', () => ({ useAuth: () => ({ userId: mockUserId, getToken: mockToken }) }));
jest.mock('../../data/readingBooks', () => ({ ...jest.requireActual('../../data/readingBooks'), fetchReadingHistory: jest.fn(), addReadingBook: jest.fn() }));
jest.mock('expo-crypto', () => ({ CryptoDigestAlgorithm: { SHA256: 'sha256' },
  digestStringAsync: async (_algorithm: string, text: string) => require('crypto').createHash('sha256').update(text).digest('hex') }));
jest.mock('../../data/api', () => ({ API_BASE: 'https://example.test' }));
let mockDisk: Record<string, any> = {};
jest.mock('../persist', () => ({ loadJSON: jest.fn(async (key: string, fallback: unknown) => mockDisk[key] ?? fallback),
  saveJSON: jest.fn(async (key: string, value: unknown) => { mockDisk[key] = JSON.parse(JSON.stringify(value)); }) }));
const fetchHistory = jest.mocked(fetchReadingHistory);
const addBook = jest.mocked(addReadingBook);
const history = (id = 'demo-reader'): ReadingHistory => ({ challengeId: 'ch1', own: true,
  reader: { ...individualReadingFixture.me!, userId: id },
  books: [{ ...readingBookExample, lastReadAt: '2026-10-21T06:00:00Z', finished: false, editable: true }] });
const shelf = (id = 'demo-reader'): ReadingHistory => ({ ...history(id), supportsBookshelf: true,
  shelfBooks: [{ ...history(id).books[0], addedAt: null }, { ...readingBookExample, key: 'unread', title: 'Новая книга', pages: 0,
    elapsedMs: 0, lastReadAt: null, addedAt: '2026-10-22T06:00:00Z', finished: false, editable: true }] });
const selection = { title: ' Новая книга ', author: ' Автор ', key: 'unread' };
beforeEach(() => { mockDisk = {}; mockUserId = 'demo-reader'; mockToken.mockReset(); mockToken.mockResolvedValue('token');
  fetchHistory.mockReset(); fetchHistory.mockResolvedValue(history()); addBook.mockReset(); addBook.mockResolvedValue({ bookKey: 'unread' }); });

test('does not request another reader or a visitor library', async () => {
  const h = await renderHook(({ readerId }: { readerId?: string }) => useReadingLibrary('ch1', readerId), { initialProps: { readerId: undefined as string | undefined } });
  expect(fetchHistory).not.toHaveBeenCalled();
  await h.rerender({ readerId: 'other-reader' });
  expect(fetchHistory).not.toHaveBeenCalled();
  expect(h.result.current.books).toEqual([]);
});
test('refreshes after a confirmed receipt and preserves the saved list on network errors', async () => {
  const h = await renderHook(({ receipts }: { receipts: string }) => useReadingLibrary('ch1', 'demo-reader', receipts), { initialProps: { receipts: '' } });
  await waitFor(() => expect(h.result.current.books).toHaveLength(1));
  fetchHistory.mockRejectedValueOnce(new Error('Нет соединения'));
  await h.rerender({ receipts: 'reported-1' });
  await waitFor(() => expect(h.result.current.error).toBe('Нет соединения'));
  expect(h.result.current.books).toHaveLength(1);
  await act(async () => { await h.result.current.retry(); });
  expect(h.result.current.error).toBeUndefined();
  expect(fetchHistory).toHaveBeenCalledTimes(3);
});
test('a late response from a previous account cannot expose its books to the new account', async () => {
  let resolve!: (value: ReadingHistory) => void;
  fetchHistory.mockReturnValueOnce(new Promise(r => { resolve = r; }));
  const h = await renderHook(({ readerId }: { readerId: string }) => useReadingLibrary('ch1', readerId), { initialProps: { readerId: 'demo-reader' } });
  await waitFor(() => expect(fetchHistory).toHaveBeenCalledTimes(1));
  mockUserId = 'second-reader';
  fetchHistory.mockResolvedValue({ ...history('second-reader'), books: [] });
  await h.rerender({ readerId: 'second-reader' });
  await waitFor(() => expect(h.result.current.busy).toBe(false));
  await act(async () => { resolve(history()); });
  expect(h.result.current.books).toEqual([]);
});
test('rejects a response that is not an own library', async () => {
  fetchHistory.mockResolvedValue({ ...history(), own: false });
  const h = await renderHook(() => useReadingLibrary('ch1', 'demo-reader'));
  await waitFor(() => expect(h.result.current.error).toBe('Не удалось загрузить ваши книги'));
  expect(h.result.current.books).toEqual([]);
});
test('rejects the right user returned for a wrong challenge', async () => {
  fetchHistory.mockResolvedValue({ ...history(), challengeId: 'another-challenge' });
  const h = await renderHook(() => useReadingLibrary('ch1', 'demo-reader'));
  await waitFor(() => expect(h.result.current.error).toBe('Не удалось загрузить ваши книги'));
  expect(h.result.current.books).toEqual([]);
});
test('an old retry callback cannot cancel the next context request', async () => {
  const h = await renderHook(({ challengeId }: { challengeId: string }) => useReadingLibrary(challengeId, 'demo-reader'), { initialProps: { challengeId: 'ch1' } });
  await waitFor(() => expect(h.result.current.books).toHaveLength(1));
  const oldRetry = h.result.current.retry;
  let resolve!: (value: ReadingHistory) => void;
  fetchHistory.mockReturnValueOnce(new Promise(r => { resolve = r; }));
  await h.rerender({ challengeId: 'ch2' });
  await waitFor(() => expect(fetchHistory).toHaveBeenCalledTimes(2));
  await act(async () => { await oldRetry(); });
  await act(async () => { resolve({ ...history(), challengeId: 'ch2' }); });
  expect(fetchHistory).toHaveBeenCalledTimes(2);
  expect(h.result.current.books).toHaveLength(1);
  expect(h.result.current.busy).toBe(false);
});

test('prefers the private saved shelf, including unread books, and exposes capability', async () => {
  fetchHistory.mockResolvedValue(shelf());
  const h = await renderHook(() => useReadingLibrary('ch1', 'demo-reader'));
  await waitFor(() => expect(h.result.current.books).toHaveLength(2));
  expect(h.result.current.supportsBookshelf).toBe(true);
  expect(h.result.current.books[1]).toMatchObject({ key: 'unread', pages: 0, elapsedMs: 0, lastReadAt: null });
});

test('empty shelf is authoritative and legacy history stays read-only', async () => {
  fetchHistory.mockResolvedValue({ ...shelf(), shelfBooks: [] });
  const h = await renderHook(() => useReadingLibrary('ch1', 'demo-reader'));
  await waitFor(() => expect(h.result.current.supportsBookshelf).toBe(true));
  expect(h.result.current.books).toEqual([]);
  fetchHistory.mockResolvedValue(history());
  await act(async () => { await h.result.current.retry(); });
  expect(h.result.current.books[0].addedAt).toBeNull();
  expect(h.result.current.supportsBookshelf).toBe(false);
  await act(async () => { expect(await h.result.current.add(selection)).toBeNull(); });
  expect(addBook).not.toHaveBeenCalled();
  expect(h.result.current.addError).toContain('пока недоступно');
});

test('a capability flag without owner-only shelf data does not enable writes', async () => {
  fetchHistory.mockResolvedValue({ ...history(), supportsBookshelf: true });
  const h = await renderHook(() => useReadingLibrary('ch1', 'demo-reader'));
  await waitFor(() => expect(h.result.current.books).toHaveLength(1));
  expect(h.result.current.supportsBookshelf).toBe(false);
  await act(async () => { await h.result.current.add(selection); });
  expect(addBook).not.toHaveBeenCalled();
});

test('addition waits for confirmation and reloads the server shelf without changing input', async () => {
  fetchHistory.mockResolvedValue({ ...shelf(), shelfBooks: [] });
  let resolve!: (value: { bookKey: string }) => void;
  addBook.mockReturnValueOnce(new Promise(done => { resolve = done; }));
  const h = await renderHook(() => useReadingLibrary('ch1', 'demo-reader'));
  await waitFor(() => expect(h.result.current.supportsBookshelf).toBe(true));
  let pending!: Promise<{ bookKey: string } | null>;
  await act(async () => { pending = h.result.current.add(selection); });
  await waitFor(() => expect(addBook).toHaveBeenCalledTimes(1));
  expect(h.result.current.adding).toBe(true);
  expect(h.result.current.books).toEqual([]);
  expect(selection.title).toBe(' Новая книга ');
  expect(addBook.mock.calls[0]).toEqual(['token', 'ch1', expect.stringMatching(/^[a-f0-9-]{36}$/),
    { title: 'Новая книга', author: 'Автор', key: 'unread' }]);
  fetchHistory.mockResolvedValue(shelf());
  await act(async () => { resolve({ bookKey: 'canonical-server-key' }); expect(await pending).toEqual({ bookKey: 'canonical-server-key' }); });
  expect(h.result.current.books).toHaveLength(2);
  expect(h.result.current.adding).toBe(false);
  expect(h.result.current.addError).toBeUndefined();
});

test('unknown results retain one operation identity across retries and remounts', async () => {
  fetchHistory.mockResolvedValue(shelf());
  addBook.mockRejectedValueOnce(new TypeError('Network request failed'));
  const h = await renderHook(() => useReadingLibrary('ch1', 'demo-reader'));
  await waitFor(() => expect(h.result.current.supportsBookshelf).toBe(true));
  await act(async () => { expect(await h.result.current.add(selection)).toBeNull(); });
  const firstId = addBook.mock.calls[0][2];
  expect(h.result.current.addError).toContain('не подтвердил');
  expect(h.result.current.books).toHaveLength(2);
  await act(async () => { h.result.current.clearAddError(); });
  expect(h.result.current.addError).toBeUndefined();
  await act(async () => { expect(await h.result.current.add({ ...selection, title: 'Новая книга', author: 'Автор' })).toEqual({ bookKey: 'unread' }); });
  expect(addBook.mock.calls[1][2]).toBe(firstId);
  await h.unmount();
  const again = await renderHook(() => useReadingLibrary('ch1', 'demo-reader'));
  await waitFor(() => expect(again.result.current.supportsBookshelf).toBe(true));
  await act(async () => { await again.result.current.add(selection); });
  expect(addBook.mock.calls[2][2]).toBe(firstId);
  await act(async () => { await again.result.current.add({ ...selection, title: 'Другая книга' }); });
  expect(addBook.mock.calls[3][2]).not.toBe(firstId);
});

test('duplicate presses send one addition, and refresh failure does not erase its confirmed receipt', async () => {
  fetchHistory.mockResolvedValue(shelf());
  let resolve!: (value: { bookKey: string }) => void;
  addBook.mockReturnValueOnce(new Promise(done => { resolve = done; }));
  const h = await renderHook(() => useReadingLibrary('ch1', 'demo-reader'));
  await waitFor(() => expect(h.result.current.supportsBookshelf).toBe(true));
  let first!: Promise<{ bookKey: string } | null>;
  await act(async () => { first = h.result.current.add(selection); expect(await h.result.current.add(selection)).toBeNull(); });
  await waitFor(() => expect(addBook).toHaveBeenCalledTimes(1));
  fetchHistory.mockRejectedValueOnce(new Error('Не удалось обновить полку'));
  await act(async () => { resolve({ bookKey: 'unread' }); expect(await first).toEqual({ bookKey: 'unread' }); });
  expect(h.result.current.books).toHaveLength(2);
  expect(h.result.current.error).toBe('Не удалось обновить полку');
  expect(h.result.current.addError).toBeUndefined();
  expect(h.result.current.adding).toBe(false);
});

test('switching accounts before token resolution never sends the old addition', async () => {
  fetchHistory.mockResolvedValue(shelf());
  const h = await renderHook(({ readerId }: { readerId: string }) => useReadingLibrary('ch1', readerId), { initialProps: { readerId: 'demo-reader' } });
  await waitFor(() => expect(h.result.current.supportsBookshelf).toBe(true));
  let resolveToken!: (token: string) => void;
  mockToken.mockReturnValueOnce(new Promise(done => { resolveToken = done; }));
  let pending!: Promise<{ bookKey: string } | null>;
  await act(async () => { pending = h.result.current.add(selection); });
  await waitFor(() => expect(mockToken).toHaveBeenCalledTimes(2));
  mockUserId = 'other'; fetchHistory.mockResolvedValue({ ...shelf('other'), shelfBooks: [] });
  await h.rerender({ readerId: 'other' });
  await waitFor(() => expect(h.result.current.supportsBookshelf).toBe(true));
  await act(async () => { resolveToken('old-token'); expect(await pending).toBeNull(); });
  expect(addBook).not.toHaveBeenCalled();
  expect(h.result.current.books).toEqual([]);
  expect(h.result.current.adding).toBe(false);
});

test('stale handlers and late acknowledgments cannot overwrite a new account addition', async () => {
  fetchHistory.mockResolvedValue(shelf());
  const h = await renderHook(({ readerId }: { readerId: string }) => useReadingLibrary('ch1', readerId), { initialProps: { readerId: 'demo-reader' } });
  await waitFor(() => expect(h.result.current.supportsBookshelf).toBe(true));
  const staleAdd = h.result.current.add;
  let resolveOld!: (value: { bookKey: string }) => void, resolveNew!: (value: { bookKey: string }) => void;
  addBook.mockReturnValueOnce(new Promise(done => { resolveOld = done; }));
  let old!: Promise<{ bookKey: string } | null>, fresh!: Promise<{ bookKey: string } | null>;
  await act(async () => { old = staleAdd(selection); });
  await waitFor(() => expect(addBook).toHaveBeenCalledTimes(1));
  mockUserId = 'other'; fetchHistory.mockResolvedValue({ ...shelf('other'), shelfBooks: [] });
  await h.rerender({ readerId: 'other' });
  await waitFor(() => expect(h.result.current.supportsBookshelf).toBe(true));
  addBook.mockReturnValueOnce(new Promise(done => { resolveNew = done; }));
  await act(async () => { fresh = h.result.current.add(selection); expect(await staleAdd(selection)).toBeNull(); });
  await waitFor(() => expect(addBook).toHaveBeenCalledTimes(2));
  expect(addBook.mock.calls[1][2]).not.toBe(addBook.mock.calls[0][2]);
  await act(async () => { resolveOld({ bookKey: 'old-book' }); expect(await old).toBeNull(); });
  expect(h.result.current.adding).toBe(true);
  expect(h.result.current.books).toEqual([]);
  await act(async () => { resolveNew({ bookKey: 'new-book' }); expect(await fresh).toEqual({ bookKey: 'new-book' }); });
  expect(h.result.current.adding).toBe(false);
});

test('old challenge and A-to-B-to-A callbacks remain inert', async () => {
  fetchHistory.mockImplementation(async (_token, challengeId, readerId) => ({ ...shelf(readerId), challengeId }));
  const h = await renderHook(({ challengeId }: { challengeId: string }) => useReadingLibrary(challengeId, 'demo-reader'), { initialProps: { challengeId: 'ch1' } });
  await waitFor(() => expect(h.result.current.supportsBookshelf).toBe(true));
  const staleAdd = h.result.current.add;
  await h.rerender({ challengeId: 'ch2' });
  await waitFor(() => expect(h.result.current.supportsBookshelf).toBe(true));
  await h.rerender({ challengeId: 'ch1' });
  await waitFor(() => expect(h.result.current.supportsBookshelf).toBe(true));
  await act(async () => { expect(await staleAdd(selection)).toBeNull(); });
  expect(addBook).not.toHaveBeenCalled();
  await act(async () => { await h.result.current.add(selection); });
  expect(addBook).toHaveBeenCalledTimes(1);
});

test('unmount during addition neither refreshes nor reports a success to the stale caller', async () => {
  fetchHistory.mockResolvedValue(shelf());
  let resolve!: (value: { bookKey: string }) => void;
  addBook.mockReturnValueOnce(new Promise(done => { resolve = done; }));
  const h = await renderHook(() => useReadingLibrary('ch1', 'demo-reader'));
  await waitFor(() => expect(h.result.current.supportsBookshelf).toBe(true));
  let pending!: Promise<{ bookKey: string } | null>;
  await act(async () => { pending = h.result.current.add(selection); });
  await waitFor(() => expect(addBook).toHaveBeenCalledTimes(1));
  await h.unmount();
  resolve({ bookKey: 'unread' });
  expect(await pending).toBeNull();
  expect(fetchHistory).toHaveBeenCalledTimes(1);
});

test('without internet the last confirmed shelf comes from the phone, read-only', async () => {
  fetchHistory.mockResolvedValueOnce(shelf());
  const first = await renderHook(() => useReadingLibrary('ch1', 'demo-reader'));
  await waitFor(() => expect(first.result.current.books).toHaveLength(2));
  await first.unmount();
  fetchHistory.mockRejectedValue(new TypeError('Network request failed'));
  const offline = await renderHook(() => useReadingLibrary('ch1', 'demo-reader'));
  await waitFor(() => expect(offline.result.current.books.map(b => b.title)).toEqual([readingBookExample.title, 'Новая книга']));
  expect(offline.result.current.supportsBookshelf).toBe(false);
  expect(offline.result.current.error).toMatch(/памяти телефона/);
  // Another account never sees this copy.
  mockUserId = 'other';
  const other = await renderHook(() => useReadingLibrary('ch1', 'other'));
  await waitFor(() => expect(other.result.current.busy).toBe(false));
  expect(other.result.current.books).toEqual([]);
});
