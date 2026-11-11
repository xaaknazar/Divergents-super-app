import { z } from 'zod';
import { API_BASE } from './api';
import { captureAchievementRecorder } from './achievementEvents';
import type { ChallengeBookReport } from '../components/ChallengeReadingSheet';
const count = z.number().int().nonnegative();
const book = z.object({ id: z.string().min(1), title: z.string().min(1), author: z.string().min(1), finished: z.boolean(), pages: count, todayPages: count });
const shelfSchema = z.object({ challengeId: z.string(), taskId: z.string(), day: z.number().int().positive(), version: count, total: count, unassignedPages: count, books: z.array(book) });
export type ChallengeBookShelf = z.infer<typeof shelfSchema>;
export interface BookCommand {
  taskId: string; day: number; value: number; expectedVersion: number; operationId: string; reading: ChallengeBookReport;
}
export class BookRequestError extends Error {
  constructor(public reason: string, public status = 0) { super(reason); }
}
async function request(path: string, token: string | null, body?: unknown) {
  if (!token) throw new BookRequestError('no_token', 401);
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 12000);
  try {
    const response = await fetch(`${API_BASE}/api/mobile/challenges/${path}`, { method: body ? 'POST' : 'GET',
      signal: ctrl.signal, headers: { Accept: 'application/json', Authorization: `Bearer ${token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const json = await response.json().catch(() => null);
    if (!response.ok) throw new BookRequestError(json?.reason ?? 'unavailable', response.status);
    return json;
  } finally { clearTimeout(timer); }
}
function snapshot(raw: unknown, challengeId: string): ChallengeBookShelf {
  const data = shelfSchema.parse(raw);
  if (data.challengeId !== challengeId || new Set(data.books.map(b => b.id)).size !== data.books.length
    || data.total !== data.unassignedPages + data.books.reduce((sum, b) => sum + b.todayPages, 0)) throw new BookRequestError('invalid_snapshot');
  return data;
}
export async function fetchChallengeBooks(challengeId: string, token: string | null) {
  return snapshot(await request(`${encodeURIComponent(challengeId)}/reading-books`, token), challengeId);
}
export async function createChallengeBook(challengeId: string, token: string | null, input: { title: string; author: string }) {
  const data = await request(`${encodeURIComponent(challengeId)}/reading-books`, token, input);
  const shelf = snapshot(data, challengeId);
  const added = shelf.books.find(b => b.id === data.book?.id);
  if (!added) throw new BookRequestError('invalid_snapshot');
  return { shelf, book: added };
}
export async function saveChallengeBookPages(challengeId: string, token: string | null, command: BookCommand) {
  const record = captureAchievementRecorder(token);
  const data = await request(`${encodeURIComponent(challengeId)}/progress`, token, command);
  if (data?.ok !== true || data.operationId !== command.operationId || data.challengeId !== challengeId
    || data.taskId !== command.taskId || data.day !== command.day || data.version !== command.expectedVersion + 1
    || data.value !== command.value || data.reading?.bookId !== command.reading.bookId
    || data.reading?.pages !== command.reading.pages || data.reading?.finished !== command.reading.finished
    || typeof data.acceptedAt !== 'string' || !Number.isFinite(Date.parse(data.acceptedAt))) throw new BookRequestError('invalid_receipt');
  if (data.value > 0) {
    const reportDay = new Date(Date.parse(data.acceptedAt) + 5 * 60 * 60 * 1000).toISOString().slice(0, 10);
    record({ facts: { challengeReports: [`${challengeId}:${reportDay}`] } });
  }
  return data as { version: number };
}
export function challengeBookError(e: unknown, action: 'load' | 'add' | 'save' = 'save') {
  if (e instanceof BookRequestError) {
    if (e.status === 401) return 'Войдите в аккаунт заново. Введённые страницы остаются здесь.';
    if (e.reason === 'version_conflict' || e.reason === 'book_total_conflict') return 'Запись уже изменена на другом устройстве. Список обновлён — проверьте страницы и сохраните ещё раз.';
    if (['day_changed', 'deadline_passed', 'challenge_not_active', 'eliminated', 'left'].includes(e.reason)) return 'Приём отметок за этот день закрыт. Страницы не записаны.';
    if (e.status === 404 || e.status === 403) return 'Книги пока недоступны. Обновите список или попробуйте позже.';
  }
  if (action === 'load') return 'Не удалось загрузить книги. Проверьте интернет и обновите список.';
  if (action === 'add') return 'Не удалось подтвердить добавление книги. Проверьте интернет и повторите.';
  return 'Не удалось подтвердить сохранение. Проверьте интернет и повторите — запись не продублируется.';
}
