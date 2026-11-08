import { addPersonalLibraryBook, fetchMyBooks, setPersonalLibraryBookStatus } from '../books';
import { mergeMyBooks } from '../myBooks';
jest.mock('../api', () => ({ API_BASE: 'https://example.test' }));
jest.mock('../achievementEvents', () => ({ captureAchievementRecorder: () => jest.fn() }));
const book = { id: 'manual', title: 'Книга', author: 'Автор', status: 'read' as const };
const mockFetch = jest.fn();
beforeEach(() => { global.fetch = mockFetch; mockFetch.mockReset(); });
test('manual addition sends only metadata and requires server confirmation', async () => {
  mockFetch.mockResolvedValue({ ok: true, json: async () => ({ personalBook: book }) });
  expect(await addPersonalLibraryBook('token', ' Книга ', ' Автор ')).toEqual(book);
  expect(JSON.parse(mockFetch.mock.calls[0][1].body)).toEqual({ title: 'Книга', author: 'Автор' });
  expect(mockFetch.mock.calls[0][1].headers.Authorization).toBe('Bearer token');
  mockFetch.mockResolvedValue({ ok: true, json: async () => ({}) });
  await expect(addPersonalLibraryBook('token', 'Книга', 'Автор')).rejects.toThrow('не подтвердил');
});
test('signed-out or failed saves never pretend to be successful', async () => {
  await expect(addPersonalLibraryBook(null, 'Книга', 'Автор')).rejects.toThrow('Войдите');
  expect(mockFetch).not.toHaveBeenCalled();
  mockFetch.mockRejectedValue(new Error('offline'));
  await expect(addPersonalLibraryBook('token', 'Книга', 'Автор')).rejects.toThrow('Данные остались');
});
test('library fetch supports older servers and does not erase the library on a server error', async () => {
  mockFetch.mockResolvedValue({ ok: true, json: async () => ({ shelf: [] }) });
  expect(await fetchMyBooks('token')).toEqual({ shelf: [], readingBooks: [], personalBooks: [] });
  mockFetch.mockResolvedValue({ ok: false });
  await expect(fetchMyBooks('token')).rejects.toThrow('Не удалось загрузить');
});
test('manual entries are marked read and use their own status API, not a challenge', async () => {
  const item = mergeMyBooks([], [], [book])[0];
  expect(item).toMatchObject({ personalBookId: 'manual', status: 'read', detail: 'Прочитано' });
  expect(item.challengeId).toBeUndefined(); expect(item.readingKey).toBeUndefined();
  mockFetch.mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });
  await setPersonalLibraryBookStatus('token', 'manual', 'reading');
  expect(mockFetch.mock.calls[0][0]).toBe('https://example.test/api/mobile/me/books');
  expect(mockFetch.mock.calls[0][1].method).toBe('PATCH');
});
