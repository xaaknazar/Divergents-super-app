import { z } from 'zod';
import { API_BASE } from './api';
import { netFetch } from './net';
import { ReadingApiError, ReadingBookSummarySchema, ReadingDetailSchema } from './reading';
export type ReadingBookSelection = { title: string; author: string; key?: string; coverId?: number };
export type ReadingBookMetadata = { author?: string; bookKey?: string; coverId?: number; fromPage?: number };
const suggestion = z.object({ key: z.string(), title: z.string(), author: z.string(), coverId: z.number().optional() });
export const BookSearchSchema = z.object({ books: z.array(suggestion), correctedQuery: z.string().nullable() });
export type BookSearchResult = z.infer<typeof BookSearchSchema>;
export type ReadingBookSearchView = BookSearchResult & { busy: boolean; error?: string; search: (query: string, correct?: boolean) => void };
export async function searchReadingBooks(token: string | null, query: string, correct = false) {
  if (!token) throw new Error('Войдите в аккаунт');
  const response = await netFetch(`${API_BASE}/api/mobile/reading-books?q=${encodeURIComponent(query)}${correct ? '&correct=1' : ''}`, {
    headers: { Authorization: `Bearer ${token}` }, timeoutMs: 12_000, retries: 0,
  });
  const body = await response.json();
  if (!response.ok) throw new Error(typeof body?.message === 'string' ? body.message : 'Поиск недоступен. Укажите книгу вручную.');
  return BookSearchSchema.parse(body);
}
export const ReadingShelfBookSchema = ReadingBookSummarySchema.extend({
  lastReadAt: z.string().nullable(), addedAt: z.string().nullable(), finished: z.boolean(), editable: z.boolean(),
});
export type ReadingShelfBook = z.infer<typeof ReadingShelfBookSchema>;
export const ReadingHistorySchema = z.object({ challengeId: z.string(), own: z.boolean(), reader: ReadingDetailSchema.shape.me.unwrap(),
  books: z.array(ReadingBookSummarySchema.extend({ lastReadAt: z.string(), finished: z.boolean(), editable: z.boolean() })),
  // Old servers still expose only read books. Never mistake that for a saved,
  // writable shelf; the owner-only field is the capability boundary.
  supportsBookshelf: z.boolean().optional(), shelfBooks: z.array(ReadingShelfBookSchema).optional(),
});
export type ReadingHistory = z.infer<typeof ReadingHistorySchema>;
export async function fetchReadingHistory(token: string | null, challengeId: string, readerId: string) {
  if (!token) throw new Error('Войдите в аккаунт');
  const response = await netFetch(`${API_BASE}/api/mobile/reading-history?challengeId=${encodeURIComponent(challengeId)}&readerId=${encodeURIComponent(readerId)}`, {
    headers: { Authorization: `Bearer ${token}` }, timeoutMs: 12_000, retries: 0,
  });
  const body = await response.json();
  if (!response.ok) throw new Error(typeof body?.message === 'string' ? body.message : 'Не удалось загрузить историю');
  return ReadingHistorySchema.parse(body);
}

const BookAddReceiptSchema = z.object({ ok: z.literal(true), bookKey: z.string().min(1).max(187) });
export type ReadingBookAddReceipt = Pick<z.infer<typeof BookAddReceiptSchema>, 'bookKey'>;
const BookAddSelectionSchema = z.object({ title: z.string().trim().min(1).max(180), author: z.string().trim().max(180),
  key: z.string().max(187).optional(), coverId: z.number().int().positive().max(2147483647).optional() });

/** Canonical immutable client payload, shared by operation identity and transport.
 * A catalog/legacy key is opaque: never trim or recase it. */
export function readingBookAddSelection(book: ReadingBookSelection): ReadingBookSelection {
  const parsed = BookAddSelectionSchema.safeParse(book);
  if (!parsed.success) throw new Error('Проверьте название и автора книги: не больше 180 символов в каждом поле.');
  return { title: parsed.data.title, author: parsed.data.author,
    ...(parsed.data.key ? { key: parsed.data.key } : {}),
    ...(parsed.data.coverId !== undefined ? { coverId: parsed.data.coverId } : {}) };
}

/** Saves only to the authenticated server shelf. It neither starts a timer nor
 * credits reading. Retry must retain operationId and exactly the same payload. */
export async function addReadingBook(token: string | null, challengeId: string, operationId: string,
  selection: ReadingBookSelection): Promise<ReadingBookAddReceipt> {
  if (!token) throw new ReadingApiError('Войдите в аккаунт', 401);
  const book = readingBookAddSelection(selection);
  const response = await netFetch(`${API_BASE}/api/mobile/reading-challenges?v=2`, {
    method: 'POST', timeoutMs: 12_000, retries: 0,
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'bookAdd', operationId, challengeId, book: book.title,
      ...(book.author ? { author: book.author } : {}), ...(book.key ? { bookKey: book.key } : {}),
      ...(book.coverId !== undefined ? { coverId: book.coverId } : {}) }),
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new ReadingApiError(typeof body?.message === 'string' ? body.message : 'Сервер не подтвердил сохранение книги', response.status);
  const receipt = BookAddReceiptSchema.safeParse(body);
  if (!receipt.success) throw new Error('Сервер не подтвердил сохранение книги. Повторите попытку.');
  return { bookKey: receipt.data.bookKey };
}

/** Проверка книги: человек пишет название (и автора), сервер предлагает настоящие книги — «Эта книга?».
 * Подтверждена книга только после выбора человеком. */
export type ReadingBookCandidate = { title: string; author: string; key?: string; coverId?: number };
export type ReadingBookCheck = { status: 'found'; books: ReadingBookCandidate[] } | { status: 'notFound' };
const VerifySchema = z.discriminatedUnion('status', [
  z.object({ status: z.literal('found'), books: z.array(z.object({ key: z.string().nullable().optional(), title: z.string(), author: z.string(), coverId: z.number().optional() })).min(1) }),
  z.object({ status: z.literal('notFound') }),
]);
const normal = (value: string) => value.toLocaleLowerCase('ru').normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
  .replace(/ё/g, 'е').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
/** То же правило, что на сервере: совпадает название и, если автор указан, хотя бы одно слово его имени. */
export function matchCatalogBooks(title: string, author: string, books: BookSearchResult['books']) {
  const t = normal(title), words = normal(author).split(' ').filter(w => w.length >= 3);
  return books.filter(b => {
    const bt = normal(b.title);
    if (!(bt === t || bt.startsWith(`${t} `) || t.startsWith(`${bt} `))) return false;
    const ba = normal(b.author);
    return !words.length || !ba || words.some(w => ba.includes(w));
  });
}
export async function verifyReadingBook(token: string | null, title: string, author: string): Promise<ReadingBookCheck> {
  if (!token) throw new Error('Войдите в аккаунт');
  const response = await netFetch(`${API_BASE}/api/mobile/reading-books/verify?title=${encodeURIComponent(title)}&author=${encodeURIComponent(author)}`, {
    headers: { Authorization: `Bearer ${token}` }, timeoutMs: 15_000, retries: 0,
  });
  if (response.status === 404) {
    // Сервер ещё без проверки: предлагаем записи каталога (с исправлением опечаток), выбор — за человеком.
    const found = (await searchReadingBooks(token, `${title} ${author}`.trim(), true)).books;
    const close = matchCatalogBooks(title, author, found);
    const books = (close.length ? close : found).slice(0, 3).map(b => ({ title: b.title, author: b.author || author, key: b.key, coverId: b.coverId }));
    return books.length ? { status: 'found', books } : { status: 'notFound' };
  }
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(typeof body?.message === 'string' ? body.message : 'Проверка недоступна. Повторите позже.');
  const parsed = VerifySchema.parse(body);
  return parsed.status === 'found'
    ? { status: 'found', books: parsed.books.slice(0, 3).map(b => ({ title: b.title, author: b.author, key: b.key ?? undefined, coverId: b.coverId })) }
    : parsed;
}
