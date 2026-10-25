// Client for the Divergents book library — mirrors the LMS /books section.
// Catalog, detail, comments/reviews, rating, and a personal reading shelf
// (Хочу прочитать / Читаю / Прочитал + progress).
import { API_BASE } from './api';
import { captureAchievementRecorder } from './achievementEvents';

export type ShelfStatus = 'want' | 'reading' | 'read';
export interface ShelfState { status: ShelfStatus; progress: number }

// Две независимые оценки: `rating` — редакционная (её ставит редакция
// Divergents в админке сайта, по ней сортируется каталог), `userRating` —
// средняя оценка читателей со счётчиком. Смешивать их в одном числе нельзя.
export interface BookListItem {
  id: string;
  title: string;
  author: string;
  imageUrl?: string | null;
  rating?: number | null;
  userRating?: number | null;
  userRatingCount?: number;
  description?: string | null;
  genres: string[];
  /** Только комментарии; рецензии считаются отдельно. */
  comments: number;
  shelf?: ShelfState | null;
}

export interface BookComment {
  id: string;
  content: string;
  kind: 'comment' | 'review';
  pinned: boolean;
  likes: number;
  author: string;
  /** Кубок за 1 место в челлендже — рядом с ником. */
  award?: boolean;
  mine: boolean;
  date: string;
}

export interface BookDetail {
  id: string;
  title: string;
  author: string;
  authorBio?: string | null;
  description?: string | null;
  review?: string | null;
  imageUrl?: string | null;
  genres: string[];
  /** Редакционная оценка Divergents (0..5) или null, если её не выставили. */
  rating?: number | null;
  /** Средняя оценка читателей; null, пока никто не оценил. */
  ratingAvg: number | null;
  /** Сколько читателей оценили книгу. */
  ratingCount: number;
}

export interface BookDetailResponse {
  book: BookDetail;
  myRating: number | null;
  myShelf: ShelfState | null;
  comments: BookComment[];
}

export interface ShelfEntry { status: ShelfStatus; progress: number; book: { id: string; title: string; author: string; imageUrl?: string | null; rating?: number | null } }

// fetch() with an abort-timeout — RN's fetch never times out on its own, so a
// stalled socket would hang the catalog screen's spinner forever.
async function timedFetch(url: string, init?: RequestInit, timeoutMs = 12000): Promise<Response> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
}

async function authedGet<T>(path: string, token: string | null, fallback: T): Promise<T> {
  try {
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    const r = await timedFetch(`${API_BASE}${path}`, { headers });
    if (!r.ok) return fallback;
    return (await r.json()) as T;
  } catch { return fallback; }
}

async function authedPost(path: string, token: string | null, body: any): Promise<any | null> {
  if (!token) return null;
  try {
    const r = await timedFetch(`${API_BASE}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(body) });
    if (!r.ok) return null;
    return await r.json();
  } catch { return null; }
}

export async function fetchBooks(token: string | null): Promise<BookListItem[]> {
  // The catalog screen catches failures and keeps its previous list. Returning
  // [] here falsely turned an unavailable server into "Книги скоро появятся".
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const r = await timedFetch(`${API_BASE}/api/mobile/books`, { headers });
  if (!r.ok) throw new Error('Не удалось загрузить библиотеку');
  const d = await r.json();
  if (!Array.isArray(d?.books)) throw new Error('Не удалось прочитать каталог книг');
  return d.books;
}

export async function fetchBook(id: string, token: string | null): Promise<BookDetailResponse | null> {
  const record = captureAchievementRecorder(token ?? null);
  const d = await authedGet<BookDetailResponse | null>(`/api/mobile/books/${id}`, token, null);
  if (token && d?.book && d.comments?.some(c => c.mine && c.kind === 'review')) record({ silent: true, facts: { bookReviews: [id] } });
  return d && (d as any).book ? d : null;
}

export async function postBookComment(id: string, token: string | null, content: string, kind: 'comment' | 'review') {
  const record = captureAchievementRecorder(token ?? null);
  const result = await authedPost(`/api/mobile/books/${id}/comment`, token, { content, kind });
  if (result && kind === 'review') record({ facts: { bookReviews: [id] } });
  return result;
}

export async function rateBook(id: string, token: string | null, rating: number) {
  return authedPost(`/api/mobile/books/${id}/rate`, token, { rating });
}

// `progress` отправляется только когда его действительно задали: без этого
// смена статуса обнуляла бы прочитанный процент на сервере.
export async function setBookShelf(id: string, token: string | null, status: ShelfStatus | 'none', progress?: number) {
  const record = captureAchievementRecorder(token ?? null);
  const result = await authedPost(`/api/mobile/books/${id}/shelf`, token, progress == null ? { status } : { status, progress });
  const saved = result?.shelf?.status;
  if (saved === 'reading' || saved === 'read') record({ facts: { booksStarted: [id], booksRead: saved === 'read' ? [id] : [] } });
  return result;
}

/** Книга из Reading-челленджей читателя: один статус «Прочитана» на все челленджи. */
export interface MyReadingBook {
  key: string; title: string; author: string; coverId: number | null; pages: number; elapsedMs: number;
  lastReadAt: string | null; addedAt: string | null; finished: boolean; challengeIds: string[];
  /** Та же книга в библиотеке Divergents (если найдена по названию и автору). */
  catalogBookId: string | null;
}

/** Полка библиотеки и книги Reading-челленджей одним запросом. Старый сервер readingBooks не отдаёт. */
export async function fetchMyBooks(token: string | null): Promise<{ shelf: ShelfEntry[]; readingBooks: MyReadingBook[] }> {
  const record = captureAchievementRecorder(token ?? null);
  const d = await authedGet<{ shelf?: ShelfEntry[]; readingBooks?: MyReadingBook[] }>('/api/mobile/me/books', token, {});
  const shelf = Array.isArray(d?.shelf) ? d.shelf : [];
  const readingBooks = Array.isArray(d?.readingBooks) ? d.readingBooks.filter(b => b && typeof b.key === 'string' && typeof b.title === 'string'
    && Array.isArray(b.challengeIds) && b.challengeIds.length > 0) : [];
  recordShelfAchievements(record, token, shelf);
  return { shelf, readingBooks };
}

function recordShelfAchievements(record: ReturnType<typeof captureAchievementRecorder>, token: string | null, shelf: ShelfEntry[]) {
  if (token) record({ silent: true, source: 'books', facts: {
    booksStarted: shelf.filter(s => s.status === 'reading' || s.status === 'read').map(s => s.book.id),
    booksRead: shelf.filter(s => s.status === 'read').map(s => s.book.id),
  } });
}

export async function fetchMyShelf(token: string | null): Promise<ShelfEntry[]> {
  return (await fetchMyBooks(token)).shelf;
}

/** PATCH /api/mobile/books/:id/comment/:commentId — edit your own comment/review. */
export async function updateBookComment(bookId: string, commentId: string, token: string | null, content: string): Promise<boolean> {
  if (!token) return false;
  try {
    const r = await fetch(`${API_BASE}/api/mobile/books/${bookId}/comment/${commentId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ content }),
    });
    return r.ok;
  } catch { return false; }
}

/** DELETE /api/mobile/books/:id/comment/:commentId — remove your own comment/review. */
export async function deleteBookComment(bookId: string, commentId: string, token: string | null): Promise<boolean> {
  if (!token) return false;
  try {
    const r = await fetch(`${API_BASE}/api/mobile/books/${bookId}/comment/${commentId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    return r.ok;
  } catch { return false; }
}
