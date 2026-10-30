import { mergeMyBooks } from '../myBooks';
import type { MyReadingBook, ShelfEntry } from '../books';

jest.mock('../api', () => ({ API_BASE: 'https://example.test' }));
const lib = (id: string, title: string, status: ShelfEntry['status'], progress = 0): ShelfEntry => ({ status, progress, book: { id, title, author: 'Автор', imageUrl: null } });
const reading = (key: string, title: string, finished: boolean, catalogBookId: string | null = null): MyReadingBook => ({ key, title, author: 'Автор', coverId: 7,
  pages: 96, elapsedMs: 5 * 3_600_000 + 12 * 60_000, lastReadAt: null, addedAt: null, finished, challengeIds: ['ch1', 'ch2'], catalogBookId });

test('one book in both places is one row; statuses and the source are kept', () => {
  const items = mergeMyBooks([lib('b1', 'Атомные привычки', 'reading', 45), lib('b2', 'Лидерство', 'want')],
    [reading('ol:1', 'Атомные привычки', true, 'b1'), reading('ol:2', 'Чистый код', false)]);
  expect(items.map(i => [i.id, i.status, i.readingKey ?? null, i.challengeId ?? null])).toEqual([
    ['library:b1', 'read', 'ol:1', 'ch1'], ['library:b2', 'want', null, null], ['reading:ol:2', 'reading', 'ol:2', 'ch1']]);
  expect(items[2]).toMatchObject({ detail: 'Reading · 96 стр. · 5 ч 12 мин', cover: 'https://covers.openlibrary.org/b/id/7-M.jpg' });
  expect(items[1].detail).toBe('В планах');
});
