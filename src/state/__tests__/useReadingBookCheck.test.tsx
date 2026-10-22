import { act, renderHook, waitFor } from '@testing-library/react-native';
import { verifyReadingBook } from '../../data/readingBooks';
import { useReadingBookCheck } from '../useReadingBookCheck';
import { loadJSON, saveJSON } from '../persist';
let mockDisk: Record<string, any> = {};
jest.mock('@clerk/clerk-expo', () => ({ useAuth: () => ({ userId: 'reader', getToken: async () => 'token' }) }));
jest.mock('../../data/api', () => ({ API_BASE: 'https://example.test' }));
jest.mock('../../data/readingBooks', () => ({ verifyReadingBook: jest.fn() }));
jest.mock('../persist', () => ({ loadJSON: jest.fn(async (key, fallback) => mockDisk[key] ?? fallback),
  saveJSON: jest.fn(async (key, value) => { mockDisk[key] = value; }) }));
const verify = jest.mocked(verifyReadingBook);
const key = 'dvg.readingBook.v1.reader.ch1';
const options = [{ title: 'Атомные привычки', author: 'Джеймс Клир', key: 'ol:OL1W' }, { title: 'Атомные привычки. Рабочая тетрадь', author: 'Джеймс Клир' }];
beforeEach(() => { mockDisk = {}; verify.mockReset(); jest.mocked(loadJSON).mockClear(); jest.mocked(saveJSON).mockClear(); });

test('AI proposals are not a confirmed book until the reader picks one; the pick is remembered', async () => {
  verify.mockResolvedValue({ status: 'found', books: options });
  const h = await renderHook(() => useReadingBookCheck('ch1'));
  await act(async () => { h.result.current.setTitle('атомные привычки'); });
  await act(async () => { await h.result.current.check(); });
  expect(verify).toHaveBeenCalledWith('token', 'атомные привычки', '');
  expect(h.result.current.status).toBe('suggested');
  expect(h.result.current.verified).toBeNull();
  expect(mockDisk[key]).toBeUndefined();
  await act(async () => { h.result.current.pick(1); });
  expect(h.result.current.status).toBe('verified');
  expect(h.result.current.verified).toEqual(options[1]);
  expect(h.result.current.title).toBe('Атомные привычки. Рабочая тетрадь');
  expect(mockDisk[key]).toEqual(options[1]);
  const again = await renderHook(() => useReadingBookCheck('ch1'));
  await waitFor(() => expect(again.result.current.verified).toEqual(options[1]));
});
test('«Нет, другая книга» keeps the typed text and confirms nothing', async () => {
  verify.mockResolvedValue({ status: 'found', books: options });
  const h = await renderHook(() => useReadingBookCheck('ch1'));
  await act(async () => { h.result.current.setTitle('атомные'); });
  await act(async () => { await h.result.current.check(); });
  await act(async () => { h.result.current.reject(); });
  expect(h.result.current.status).toBe('notFound');
  expect(h.result.current.title).toBe('атомные');
  expect(h.result.current.verified).toBeNull();
});
test('editing during a search drops the late answer', async () => {
  let resolve!: (v: any) => void;
  verify.mockReturnValue(new Promise(r => { resolve = r; }));
  const h = await renderHook(() => useReadingBookCheck('ch1'));
  await act(async () => { h.result.current.setTitle('книга'); });
  let pending!: Promise<void>;
  await act(async () => { pending = h.result.current.check() as unknown as Promise<void>; });
  await act(async () => { h.result.current.setTitle('другая книга'); });
  await act(async () => { resolve({ status: 'found', books: options }); await pending; });
  expect(h.result.current.status).toBe('empty');
  expect(h.result.current.suggestions).toEqual([]);
});
test('manual entry needs title and author and is remembered as written by the reader', async () => {
  verify.mockResolvedValue({ status: 'notFound' });
  const h = await renderHook(() => useReadingBookCheck('ch1'));
  await act(async () => { h.result.current.setTitle('Моя редкая книга'); });
  await act(async () => { await h.result.current.check(); });
  await act(async () => { h.result.current.manual(); });
  expect(h.result.current.verified).toBeNull();
  await act(async () => { h.result.current.setAuthor('Местный автор'); });
  await act(async () => { h.result.current.manual(); });
  expect(h.result.current.status).toBe('verified');
  expect(h.result.current.verified).toEqual({ title: 'Моя редкая книга', author: 'Местный автор', manual: true });
  expect(mockDisk[key]).toEqual({ title: 'Моя редкая книга', author: 'Местный автор', manual: true });
});

test('selecting a saved book preserves its identity and cancels a late lookup without a new verification', async () => {
  let resolve!: (value: any) => void;
  verify.mockReturnValue(new Promise(r => { resolve = r; }));
  const h = await renderHook(() => useReadingBookCheck('ch1'));
  await act(async () => { h.result.current.setTitle('поиск'); });
  let pending!: Promise<void>;
  await act(async () => { pending = h.result.current.check() as unknown as Promise<void>; });
  await act(async () => { h.result.current.selectSaved({ key: 'ol:OL2W', title: 'Вторая книга', author: 'Автор', coverId: 123,
    pages: 20, elapsedMs: 35 * 60000, nextPage: 21 }); });
  await act(async () => { resolve({ status: 'found', books: options }); await pending; });
  expect(h.result.current.verified).toEqual({ key: 'ol:OL2W', title: 'Вторая книга', author: 'Автор', coverId: 123 });
  expect(h.result.current.status).toBe('verified');
  expect(h.result.current.suggestions).toEqual([]);
  expect(mockDisk[key]).toEqual(h.result.current.verified);
  expect(verify).toHaveBeenCalledTimes(1);
});
test.each(['manual:abc', 'legacy:Название'])('saved %s book is not falsely labelled as catalog-verified', async bookKey => {
  const h = await renderHook(() => useReadingBookCheck('ch1'));
  await act(async () => { h.result.current.selectSaved({ key: bookKey, title: 'Название', author: 'Автор', coverId: null,
    pages: 15, elapsedMs: 25 * 60000, nextPage: null }); });
  expect(h.result.current.verified).toMatchObject({ key: bookKey, manual: true });
  expect(verify).not.toHaveBeenCalled();
});
test('an old saved-book selection cannot modify the new challenge selection', async () => {
  const h = await renderHook(({ id }: { id: string }) => useReadingBookCheck(id), { initialProps: { id: 'ch1' } });
  const oldSelect = h.result.current.selectSaved;
  await h.rerender({ id: 'ch2' });
  await act(async () => { h.result.current.setTitle('Книга другого челленджа'); });
  await act(async () => { oldSelect({ key: 'ol:OL1W', title: 'Старая книга', author: 'Автор', coverId: null,
    pages: 15, elapsedMs: 25 * 60000, nextPage: null }); });
  expect(h.result.current.title).toBe('Книга другого челленджа');
  expect(h.result.current.verified).toBeNull();
  expect(mockDisk[key]).toBeUndefined();
});

test('a shelf draft neither reads persisted selections nor changes them when edited, confirmed or reset', async () => {
  mockDisk[key] = options[0];
  mockDisk[`${key}.draft`] = options[1];
  verify.mockResolvedValue({ status: 'found', books: options });
  const h = await renderHook(() => useReadingBookCheck('ch1', 'draft'));
  expect(h.result.current).toMatchObject({ title: '', author: '', verified: null, status: 'empty' });
  expect(loadJSON).not.toHaveBeenCalled();
  await act(async () => { h.result.current.setTitle('Новая книга'); h.result.current.setAuthor('Автор'); });
  await act(async () => { await h.result.current.check(); });
  await act(async () => { h.result.current.pick(1); });
  expect(h.result.current.verified).toEqual(options[1]);
  await act(async () => { h.result.current.edit(); h.result.current.setTitle('Редкая книга'); });
  await act(async () => { h.result.current.manual(); });
  expect(h.result.current.verified).toMatchObject({ title: 'Редкая книга', manual: true });
  await act(async () => { h.result.current.reset(); });
  expect(h.result.current).toMatchObject({ title: '', author: '', verified: null, status: 'empty', suggestions: [] });
  expect(saveJSON).not.toHaveBeenCalled();
  expect(mockDisk[key]).toEqual(options[0]);
  expect(mockDisk[`${key}.draft`]).toEqual(options[1]);
});

test('resetting a shelf draft discards a late verification instead of restoring the cancelled book', async () => {
  mockDisk[key] = options[0];
  let resolve!: (value: Awaited<ReturnType<typeof verifyReadingBook>>) => void;
  verify.mockReturnValue(new Promise(done => { resolve = done; }));
  const h = await renderHook(() => useReadingBookCheck('ch1', 'draft'));
  await act(async () => { h.result.current.setTitle('Сброшенная книга'); });
  let pending!: unknown;
  await act(async () => { pending = h.result.current.check(); });
  expect(h.result.current.status).toBe('checking');
  await act(async () => { h.result.current.reset(); });
  await act(async () => { resolve({ status: 'found', books: options }); await pending; });
  expect(h.result.current).toMatchObject({ title: '', author: '', status: 'empty', verified: null, suggestions: [] });
  expect(saveJSON).not.toHaveBeenCalled();
  expect(mockDisk[key]).toEqual(options[0]);
});

test('returning to an earlier challenge never revives a stale draft handler', async () => {
  const h = await renderHook(({ id }: { id: string }) => useReadingBookCheck(id, 'draft'), { initialProps: { id: 'ch1' } });
  const old = h.result.current;
  await h.rerender({ id: 'ch2' });
  await h.rerender({ id: 'ch1' });
  await act(async () => { h.result.current.setTitle('Текущий черновик'); });
  await act(async () => { old.setTitle('Старая книга'); old.reset(); old.selectSaved({ key: 'ol:OLD', title: 'Старая книга',
    author: 'Автор', coverId: null, pages: 0, elapsedMs: 0, nextPage: null }); });
  expect(h.result.current.title).toBe('Текущий черновик');
  expect(h.result.current.verified).toBeNull();
  expect(saveJSON).not.toHaveBeenCalled();
});
