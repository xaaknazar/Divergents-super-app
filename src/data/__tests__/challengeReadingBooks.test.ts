import { createChallengeBook, fetchChallengeBooks, saveChallengeBookPages } from '../challengeReadingBooks';
jest.mock('../api', () => ({ API_BASE: 'https://example.test' }));
const response = (json: unknown) => ({ ok: true, status: 200, json: async () => json });
const fetchMock = jest.fn();
beforeEach(() => { global.fetch = fetchMock; fetchMock.mockReset(); });
const book = { id: 'a', title: 'Кемел адам', author: 'Қайрат Жолдыбайұлы', finished: false, pages: 20, todayPages: 20 };
const shelf = { challengeId: 'c', taskId: 'r', day: 1, version: 1, total: 20, unassignedPages: 0, books: [book] };
test('add requires real book in returned shelf, preserving title and author', async () => {
  fetchMock.mockResolvedValueOnce(response({ ...shelf, book: { id: 'a' } }));
  expect((await createChallengeBook('c', 'token', book)).book).toEqual(book);
  fetchMock.mockResolvedValueOnce(response({ ...shelf, book: { id: 'missing' } }));
  await expect(createChallengeBook('c', 'token', book)).rejects.toThrow('invalid_snapshot');
});
test('rejects mismatched challenge and inconsistent page sums', async () => {
  for (const data of [{ ...shelf, challengeId: 'foreign' }, { ...shelf, total: 50 }]) {
    fetchMock.mockResolvedValueOnce(response(data));
    await expect(fetchChallengeBooks('c', 'token')).rejects.toThrow('invalid_snapshot');
  }
});
test('old server acceptance without a book receipt never counts as success', async () => {
  const command = { taskId: 'r', day: 1, expectedVersion: 1, operationId: 'operation', value: 25, reading: { bookId: 'a', pages: 25, finished: false } };
  const receipt = { ok: true, ...command, challengeId: 'c', version: 2, acceptedAt: '2026-11-11T11:00:00Z' };
  fetchMock.mockResolvedValueOnce(response({ ...receipt, reading: undefined }));
  await expect(saveChallengeBookPages('c', 'token', command)).rejects.toThrow('invalid_receipt');
  fetchMock.mockResolvedValueOnce(response(receipt));
  expect((await saveChallengeBookPages('c', 'token', command)).version).toBe(2);
});
