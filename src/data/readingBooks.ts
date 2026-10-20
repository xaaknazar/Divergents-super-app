import { z } from 'zod';
import { API_BASE } from './api';
import { netFetch } from './net';
import { ReadingDetailSchema } from './reading';
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
export const ReadingHistorySchema = z.object({ challengeId: z.string(), own: z.boolean(), reader: ReadingDetailSchema.shape.me.unwrap(),
  books: z.array(z.object({ key: z.string(), title: z.string(), author: z.string(), coverId: z.number().nullable(),
    pages: z.number(), elapsedMs: z.number(), nextPage: z.number().nullable(), lastReadAt: z.string(), finished: z.boolean(), editable: z.boolean() })) });
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
