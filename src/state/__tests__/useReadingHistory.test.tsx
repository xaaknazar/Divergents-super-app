import { act, renderHook, waitFor } from '@testing-library/react-native';
import { useReadingHistory } from '../useReadingHistory';
import { fetchReadingHistory } from '../../data/readingBooks';
import { sendReadingCommand } from '../../data/reading';
import { onShelfChanged } from '../shelfBus';
let mockAccount = 'reader';
jest.mock('@clerk/clerk-expo', () => ({ useAuth: () => ({ userId: mockAccount, getToken: async () => 'token' }) }));
jest.mock('@react-navigation/native', () => ({ useFocusEffect: (fn: () => void) => require('react').useEffect(fn, [fn]) }));
jest.mock('../../data/readingBooks', () => ({ fetchReadingHistory: jest.fn() }));
jest.mock('../../data/reading', () => ({ sendReadingCommand: jest.fn() }));
jest.mock('expo-crypto', () => ({ randomUUID: () => '11111111-1111-4111-8111-111111111111' }));
const fetchHistory = jest.mocked(fetchReadingHistory), send = jest.mocked(sendReadingCommand);
const history = { challengeId: 'club', own: true, reader: { name: 'Reader' }, books: [] } as any;
beforeEach(() => { mockAccount = 'reader'; fetchHistory.mockReset().mockResolvedValue(history); send.mockReset().mockResolvedValue({ ok: true }); });
test('failed book status is not optimistic and retry reuses the operation ID', async () => {
  send.mockRejectedValueOnce(new Error('Нет подтверждения'));
  const h = await renderHook(() => useReadingHistory('club', 'reader'));
  await waitFor(() => expect(h.result.current.data).toBe(history));
  await act(async () => { await h.result.current.markBook('book', true); });
  expect(h.result.current.error).toBe('Нет подтверждения');
  expect(h.result.current.data).toBe(history);
  await act(async () => { await h.result.current.markBook('book', true); });
  expect(send.mock.calls[1][1]).toEqual(send.mock.calls[0][1]);
  expect(fetchHistory).toHaveBeenCalledTimes(2);
});
test('spectator cannot send a book status command', async () => {
  const h = await renderHook(() => useReadingHistory('club', 'other'));
  await waitFor(() => expect(h.result.current.data).toBeTruthy());
  await act(async () => { await h.result.current.markBook('book', true); });
  expect(send).not.toHaveBeenCalled();
});
test('late history response does not replace the new account context', async () => {
  let resolve!: (value: any) => void;
  fetchHistory.mockImplementationOnce(() => new Promise(done => { resolve = done; }));
  const h = await renderHook(() => useReadingHistory('club', mockAccount));
  await waitFor(() => expect(fetchHistory).toHaveBeenCalledTimes(1));
  mockAccount = 'other';
  const other = { ...history, reader: { name: 'Other' } }; fetchHistory.mockResolvedValueOnce(other);
  await h.rerender({});
  await waitFor(() => expect(h.result.current.data).toBe(other));
  await act(async () => { resolve(history); });
  expect(h.result.current.data).toBe(other);
});

test('confirmed return updates both book lists and notifies the profile even when the refresh fails', async () => {
  const book = { key: 'book', title: 'Книга', author: 'Автор', coverId: null, pages: 195, elapsedMs: 344 * 60000,
    nextPage: 196, lastReadAt: '2026-10-29T12:00:00Z', finished: true, editable: true };
  fetchHistory.mockResolvedValueOnce({ ...history, books: [book], shelfBooks: [{ ...book, addedAt: null }] });
  const listener = jest.fn(); const off = onShelfChanged(listener);
  const h = await renderHook(() => useReadingHistory('club', 'reader'));
  await waitFor(() => expect(h.result.current.data?.books).toHaveLength(1));
  fetchHistory.mockRejectedValueOnce(new Error('Не удалось обновить историю'));
  await act(async () => { await h.result.current.markBook('book', false); });
  expect(h.result.current.data?.books[0]).toEqual({ ...book, finished: false });
  expect(h.result.current.data?.shelfBooks?.[0]).toEqual({ ...book, addedAt: null, finished: false });
  expect(h.result.current.error).toBe('Не удалось обновить историю');
  expect(h.result.current.busy).toBe(false);
  expect(h.result.current.updatingBookKey).toBeUndefined();
  expect(listener).toHaveBeenCalledTimes(1);
  off();
});

const session = { id: 'approach', book: 'Книга', author: null, day: 1, date: '2026-11-05', editableUntil: 1793991600000,
  startedAt: '2026-11-05T08:00:00Z', pages: 415, elapsedMs: 3600000 };
const editableHistory = { ...history, supportsPageCorrection: true, participationId: 'participation', editableSessions: [session] };
test('page correction waits for acknowledgement, reuses an ambiguous retry and refreshes totals', async () => {
  fetchHistory.mockResolvedValue(editableHistory);
  const h = await renderHook(() => useReadingHistory('club', 'reader'));
  await waitFor(() => expect(h.result.current.data).toBe(editableHistory));
  send.mockRejectedValueOnce(new Error('Нет подтверждения'));
  await act(async () => { await expect(h.result.current.correctPages(session, 50)).rejects.toThrow('Нет подтверждения'); });
  expect(h.result.current.data).toBe(editableHistory);
  const corrected = { ...editableHistory, editableSessions: [{ ...session, pages: 50 }] };
  fetchHistory.mockResolvedValueOnce(corrected);
  await act(async () => { await h.result.current.correctPages(session, 50); });
  expect(send.mock.calls[1][1]).toEqual(send.mock.calls[0][1]);
  expect(send.mock.calls[0][1]).toMatchObject({ action: 'correctPages', sessionId: 'approach', expectedPages: 415, pages: 50, participationId: 'participation' });
  expect(h.result.current.data).toBe(corrected);
  expect(h.result.current.busy).toBe(false);
});
test('a conflict refreshes the server value and does not claim success', async () => {
  fetchHistory.mockResolvedValue(editableHistory);
  const h = await renderHook(() => useReadingHistory('club', 'reader'));
  await waitFor(() => expect(h.result.current.data).toBe(editableHistory));
  const otherDevice = { ...editableHistory, editableSessions: [{ ...session, pages: 55 }] };
  fetchHistory.mockResolvedValueOnce(otherDevice);
  send.mockRejectedValueOnce(Object.assign(new Error('Страницы изменились'), { code: 'correction_conflict' }));
  await act(async () => { await expect(h.result.current.correctPages(session, 50)).rejects.toThrow('Страницы изменились'); });
  expect(h.result.current.data).toBe(otherDevice);
});
test('confirmed correction with failed refresh hides outdated totals', async () => {
  fetchHistory.mockResolvedValueOnce(editableHistory);
  const h = await renderHook(() => useReadingHistory('club', 'reader'));
  await waitFor(() => expect(h.result.current.data).toBe(editableHistory));
  fetchHistory.mockRejectedValueOnce(new Error('offline'));
  await act(async () => { await h.result.current.correctPages(session, 50); });
  expect(h.result.current.data).toBeUndefined();
  expect(h.result.current.error).toMatch(/Страницы сохранены/);
});
test('old servers and other reader histories never send page corrections', async () => {
  const h = await renderHook(() => useReadingHistory('club', 'reader'));
  await waitFor(() => expect(h.result.current.data).toBe(history));
  await act(async () => { await expect(h.result.current.correctPages(session, 50)).rejects.toThrow(); });
  fetchHistory.mockResolvedValue(editableHistory);
  const other = await renderHook(() => useReadingHistory('club', 'other'));
  await waitFor(() => expect(other.result.current.data).toBe(editableHistory));
  await act(async () => { await expect(other.result.current.correctPages(session, 50)).rejects.toThrow(); });
  expect(send).not.toHaveBeenCalled();
});
