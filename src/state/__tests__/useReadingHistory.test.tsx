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
