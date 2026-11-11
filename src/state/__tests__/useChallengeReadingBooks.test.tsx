import { act, renderHook, waitFor } from '@testing-library/react-native';
import { useChallengeReadingBooks } from '../useChallengeReadingBooks';
import { BookRequestError, createChallengeBook, fetchChallengeBooks, saveChallengeBookPages } from '../../data/challengeReadingBooks';
import { readJSON, saveJSON } from '../persist';
let mockUser = 'reader';
const mockToken = jest.fn(async () => 'token');
jest.mock('@clerk/clerk-expo', () => ({ useAuth: () => ({ userId: mockUser, getToken: mockToken }) }));
jest.mock('expo-crypto', () => ({ randomUUID: () => require('crypto').randomUUID() }));
jest.mock('../../data/challengeReadingBooks', () => ({ ...jest.requireActual('../../data/challengeReadingBooks'), fetchChallengeBooks: jest.fn(), createChallengeBook: jest.fn(), saveChallengeBookPages: jest.fn() }));
jest.mock('../../data/api', () => ({ API_BASE: 'https://example.test' }));
let mockDisk: Record<string, any> = {};
jest.mock('../persist', () => ({ readJSON: jest.fn(async (key: string, fallback: unknown) => ({ ok: true, value: mockDisk[key] ?? fallback })),
  saveJSON: jest.fn(async (key: string, value: unknown) => { mockDisk[key] = value; }) }));
const book = { id: 'a', title: 'Книга', author: 'Автор', pages: 50, todayPages: 20, finished: false };
const shelf = { challengeId: 'c', taskId: 'r', day: 1, version: 2, total: 30, unassignedPages: 10, books: [book] };
const refresh = jest.fn(async () => true);
const get = jest.mocked(fetchChallengeBooks), save = jest.mocked(saveChallengeBookPages);
beforeEach(() => { jest.clearAllMocks(); mockDisk = {}; mockUser = 'reader';
  get.mockReset(); get.mockResolvedValue(shelf); save.mockReset(); save.mockResolvedValue({ version: 3 });
  jest.mocked(readJSON).mockImplementation(async (key, fallback) => ({ ok: true, value: mockDisk[key] ?? fallback }));
  jest.mocked(saveJSON).mockImplementation(async (key, value) => { mockDisk[key] = value; });
  mockToken.mockReset(); mockToken.mockResolvedValue('token');
});
async function mount() {
  const h = await renderHook(() => useChallengeReadingBooks('c', 'r', 1, refresh));
  await waitFor(() => expect(h.result.current.loading).toBe(false)); return h;
}
test('saves a replacement total only after durable write and confirmed receipt', async () => {
  const h = await mount(); let result = false;
  await act(async () => { result = await h.result.current.save({ bookId: 'a', pages: 25, finished: true }); });
  expect(result).toBe(true);
  expect(save).toHaveBeenCalledWith('c', 'token', expect.objectContaining({ value: 35, expectedVersion: 2, day: 1, reading: { bookId: 'a', pages: 25, finished: true } }));
  expect(jest.mocked(saveJSON).mock.invocationCallOrder[0]).toBeLessThan(save.mock.invocationCallOrder[0]);
  expect(h.result.current.books[0]).toMatchObject({ pages: 55, todayPages: 25, finished: true });
  expect(refresh).toHaveBeenCalledTimes(1);
});
test('lost receipt retains command and replay uses the same ID', async () => {
  const h = await mount(); save.mockRejectedValueOnce(new Error('network'));
  await act(async () => { expect(await h.result.current.save({ bookId: 'a', pages: 25, finished: false })).toBe(false); });
  const id = save.mock.calls[0][2].operationId;
  expect(Object.values(mockDisk)[0]).toMatchObject({ operationId: id });
  expect(h.result.current.books[0].todayPages).toBe(20);
  await act(async () => { await h.result.current.load(); });
  expect(save.mock.calls[1][2].operationId).toBe(id);
  expect(Object.values(mockDisk)[0]).toBeNull();
});
test('double press has only one write in flight', async () => {
  const h = await mount(); let resolve!: (v: { version: number }) => void;
  save.mockImplementation(() => new Promise(r => { resolve = r; }));
  let request!: Promise<boolean>;
  await act(async () => { request = h.result.current.save({ bookId: 'a', pages: 25, finished: false }); });
  await act(async () => { expect(await h.result.current.save({ bookId: 'a', pages: 30, finished: false })).toBe(false); });
  expect(save).toHaveBeenCalledTimes(1);
  await act(async () => { resolve({ version: 3 }); await request; });
});
test('storage failure never sends an unjournaled page report', async () => {
  const h = await mount(); jest.mocked(saveJSON).mockRejectedValue(new Error('disk full'));
  await act(async () => { expect(await h.result.current.save({ bookId: 'a', pages: 25, finished: false })).toBe(false); });
  expect(save).not.toHaveBeenCalled();
});
test('failed journal read cannot be bypassed by adding a book', async () => {
  jest.mocked(readJSON).mockResolvedValue({ ok: false, value: null }); const h = await mount();
  await act(async () => { expect(await h.result.current.add({ title: 'Книга', author: 'Автор' })).toBeNull(); });
  expect(createChallengeBook).not.toHaveBeenCalled(); expect(save).not.toHaveBeenCalled();
});
test('version conflict refreshes data and does not silently overwrite', async () => {
  const h = await mount(); save.mockRejectedValueOnce(new BookRequestError('version_conflict', 409));
  get.mockResolvedValueOnce({ ...shelf, version: 3, total: 40, books: [{ ...book, todayPages: 30 }] });
  await act(async () => { expect(await h.result.current.save({ bookId: 'a', pages: 25, finished: false })).toBe(false); });
  expect(h.result.current.books[0].todayPages).toBe(30); expect(h.result.current.error).toContain('другом устройстве');
  expect(save).toHaveBeenCalledTimes(1);
});
test('account change while token loads cannot send the old user report', async () => {
  const h = await mount(); let resolve!: (token: string) => void;
  mockToken.mockImplementationOnce(() => new Promise(r => { resolve = r; }));
  let request!: Promise<boolean>;
  await act(async () => { request = h.result.current.save({ bookId: 'a', pages: 25, finished: false }); });
  mockUser = 'other'; await h.rerender({});
  await act(async () => { resolve('old-token'); await request; });
  expect(save).not.toHaveBeenCalled();
});

test('offline token cannot leave the form loading forever', async () => {
  jest.useFakeTimers();
  try {
    mockToken.mockImplementation(() => new Promise(() => {}));
    const h = await renderHook(() => useChallengeReadingBooks('c', 'r', 1, refresh));
    await act(async () => { await jest.advanceTimersByTimeAsync(12001); });
    expect(h.result.current.loading).toBe(false);
    expect(h.result.current.error).toBeTruthy();
    expect(save).not.toHaveBeenCalled();
  } finally { jest.useRealTimers(); }
});
