import { addReadingBook, fetchReadingHistory, ReadingHistorySchema, readingBookAddSelection, verifyReadingBook } from '../readingBooks';
import { netFetch } from '../net';
import { ReadingApiError } from '../reading';
import { individualReadingFixture, readingBookExample } from '../../storybook/readingFixtures';

jest.mock('../api', () => ({ API_BASE: 'https://example.test' }));
jest.mock('../net', () => ({ netFetch: jest.fn() }));
const net = jest.mocked(netFetch);
const challengeId = '3056d553-c46e-4b6a-bcdb-4d0f3ac3c347';
const operationId = '997fe99a-87f2-4024-829e-d8f9ac7ce9dc';
const history = { challengeId, own: true, reader: individualReadingFixture.me!, books: [
  { ...readingBookExample, lastReadAt: '2026-10-21T06:00:00Z', finished: false, editable: true },
] };
function response(body: unknown, status = 200) {
  return { ok: status >= 200 && status < 300, status, json: async () => body } as Response;
}
beforeEach(() => { net.mockReset(); });

test('old history shape remains compatible without inventing writable shelf capability', () => {
  const parsed = ReadingHistorySchema.parse(history);
  expect(parsed.books[0].lastReadAt).toBe('2026-10-21T06:00:00Z');
  expect(parsed.shelfBooks).toBeUndefined();
  expect(parsed.supportsBookshelf).toBeUndefined();
});

test('owner shelf retains unread books and nullable metadata separately from read history', async () => {
  const unread = { ...readingBookExample, key: 'manual:book', pages: 0, elapsedMs: 0,
    lastReadAt: null, addedAt: '2026-10-22T06:00:00Z', finished: false, editable: true };
  net.mockResolvedValue(response({ ...history, supportsBookshelf: true, shelfBooks: [unread] }));
  const parsed = await fetchReadingHistory('token', challengeId, 'reader');
  expect(parsed.shelfBooks).toEqual([unread]);
  expect(parsed.books).toHaveLength(1);
  expect(parsed.supportsBookshelf).toBe(true);
});

test('posts exactly one owner-authorized immutable bookAdd command with no reading mutations', async () => {
  net.mockResolvedValue(response({ ok: true, bookKey: 'canonical-book' }));
  const key = 'legacy: Моя книга';
  await expect(addReadingBook('token', challengeId, operationId,
    { title: ' Моя книга ', author: ' Автор ', key, coverId: 123 })).resolves.toEqual({ bookKey: 'canonical-book' });
  expect(net).toHaveBeenCalledTimes(1);
  const [url, options] = net.mock.calls[0];
  expect(url).toBe('https://example.test/api/mobile/reading-challenges?v=2');
  expect(options).toMatchObject({ method: 'POST', retries: 0, timeoutMs: 12000,
    headers: { Authorization: 'Bearer token', Accept: 'application/json', 'Content-Type': 'application/json' } });
  expect(JSON.parse(String(options?.body))).toEqual({ action: 'bookAdd', operationId, challengeId,
    book: 'Моя книга', author: 'Автор', bookKey: key, coverId: 123 });
});

test('omits unknown author/key/cover but requires the server canonical key', async () => {
  net.mockResolvedValue(response({ ok: true, bookKey: 'manual:generated' }));
  await expect(addReadingBook('token', challengeId, operationId, { title: 'Книга', author: '' })).resolves.toEqual({ bookKey: 'manual:generated' });
  expect(JSON.parse(String(net.mock.calls[0][1]?.body))).toEqual({ action: 'bookAdd', operationId, challengeId, book: 'Книга' });
});

test.each([null, { ok: true }, { ok: false, bookKey: 'x' }, { ok: true, bookKey: '' }])('never accepts malformed success %#', async body => {
  net.mockResolvedValue(response(body));
  await expect(addReadingBook('token', challengeId, operationId, { title: 'Книга', author: '' })).rejects.toThrow('Сервер не подтвердил');
});

test('an HTML/login response is not a saved book', async () => {
  net.mockResolvedValue({ ok: true, status: 200, json: async () => { throw new Error('HTML'); } } as unknown as Response);
  await expect(addReadingBook('token', challengeId, operationId, { title: 'Книга', author: '' })).rejects.toThrow('Сервер не подтвердил');
});

test('authorization and definitive server rejections never become successful saves', async () => {
  await expect(addReadingBook(null, challengeId, operationId, { title: 'Книга', author: '' })).rejects.toMatchObject({ status: 401 });
  expect(net).not.toHaveBeenCalled();
  net.mockResolvedValue(response({ message: 'Только участникам' }, 403));
  await expect(addReadingBook('token', challengeId, operationId, { title: 'Книга', author: '' })).rejects.toBeInstanceOf(ReadingApiError);
  await expect(addReadingBook('token', challengeId, operationId, { title: 'Книга', author: '' })).rejects.toMatchObject({ status: 403, message: 'Только участникам' });
});

test('normalizes display whitespace but preserves opaque identity and matches server limits', () => {
  expect(readingBookAddSelection({ title: ' Книга ', author: ' Автор ', key: 'legacy: A ' }))
    .toEqual({ title: 'Книга', author: 'Автор', key: 'legacy: A ' });
  expect(readingBookAddSelection({ title: 'Книга', author: '', key: '' })).toEqual({ title: 'Книга', author: '' });
  expect(() => readingBookAddSelection({ title: ' ', author: '' })).toThrow();
  expect(() => readingBookAddSelection({ title: 'a'.repeat(181), author: '' })).toThrow();
  expect(() => readingBookAddSelection({ title: 'Книга', author: 'a'.repeat(181) })).toThrow();
  expect(() => readingBookAddSelection({ title: 'Книга', author: '', key: 'a'.repeat(188) })).toThrow();
  expect(() => readingBookAddSelection({ title: 'Книга', author: '', coverId: 0 })).toThrow();
});
test('book check shows up to five server candidates and keeps AI proposals without keys', async () => {
  const books = Array.from({ length: 6 }, (_, i) => ({ key: i ? null : 'ol:OL1W', title: `Книга ${i + 1}`, author: 'Автор', source: i ? 'ai' : 'catalog' }));
  net.mockResolvedValueOnce(response({ status: 'found', books }));
  const result = await verifyReadingBook('token', 'Книга', '');
  expect(result.status).toBe('found');
  if (result.status !== 'found') return;
  expect(result.books.map(b => b.title)).toEqual(['Книга 1', 'Книга 2', 'Книга 3', 'Книга 4', 'Книга 5']);
  expect(result.books[0].key).toBe('ol:OL1W'); expect(result.books[1].key).toBeUndefined();
});
