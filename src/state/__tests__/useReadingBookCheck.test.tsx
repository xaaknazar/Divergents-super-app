import { act, renderHook, waitFor } from '@testing-library/react-native';
import { verifyReadingBook } from '../../data/readingBooks';
import { useReadingBookCheck } from '../useReadingBookCheck';
let mockDisk: Record<string, any> = {};
jest.mock('@clerk/clerk-expo', () => ({ useAuth: () => ({ userId: 'reader', getToken: async () => 'token' }) }));
jest.mock('../../data/api', () => ({ API_BASE: 'https://example.test' }));
jest.mock('../../data/readingBooks', () => ({ verifyReadingBook: jest.fn() }));
jest.mock('../persist', () => ({ loadJSON: jest.fn(async (key, fallback) => mockDisk[key] ?? fallback),
  saveJSON: jest.fn(async (key, value) => { mockDisk[key] = value; }) }));
const verify = jest.mocked(verifyReadingBook);
const key = 'dvg.readingBook.v1.reader.ch1';
const options = [{ title: 'Атомные привычки', author: 'Джеймс Клир', key: 'ol:OL1W' }, { title: 'Атомные привычки. Рабочая тетрадь', author: 'Джеймс Клир' }];
beforeEach(() => { mockDisk = {}; verify.mockReset(); });

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
