// Client for the Divergents book library — mirrors the LMS /books section.
// Catalog, detail, comments/reviews, rating, and a personal reading shelf
// (Хочу прочитать / Читаю / Прочитал + progress).
import { API_BASE } from './api';

export type ShelfStatus = 'want' | 'reading' | 'read';
export interface ShelfState { status: ShelfStatus; progress: number }

export interface BookListItem {
  id: string;
  title: string;
  author: string;
  imageUrl?: string | null;
  rating?: number | null;
  description?: string | null;
  genres: string[];
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
  ratingAvg: number;
  ratingCount: number;
}

export interface BookDetailResponse {
  book: BookDetail;
  myRating: number | null;
  myShelf: ShelfState | null;
  comments: BookComment[];
}

export interface ShelfEntry { status: ShelfStatus; progress: number; book: { id: string; title: string; author: string; imageUrl?: string | null; rating?: number | null } }

async function authedGet<T>(path: string, token: string | null, fallback: T): Promise<T> {
  try {
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    const r = await fetch(`${API_BASE}${path}`, { headers });
    if (!r.ok) return fallback;
    return (await r.json()) as T;
  } catch { return fallback; }
}

async function authedPost(path: string, token: string | null, body: any): Promise<any | null> {
  if (!token) return null;
  try {
    const r = await fetch(`${API_BASE}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(body) });
    if (!r.ok) return null;
    return await r.json();
  } catch { return null; }
}

export async function fetchBooks(token: string | null): Promise<BookListItem[]> {
  const d = await authedGet<{ books?: BookListItem[] }>('/api/mobile/books', token, {});
  return Array.isArray(d?.books) ? d.books : [];
}

export async function fetchBook(id: string, token: string | null): Promise<BookDetailResponse | null> {
  const d = await authedGet<BookDetailResponse | null>(`/api/mobile/books/${id}`, token, null);
  return d && (d as any).book ? d : null;
}

export async function postBookComment(id: string, token: string | null, content: string, kind: 'comment' | 'review') {
  return authedPost(`/api/mobile/books/${id}/comment`, token, { content, kind });
}

export async function rateBook(id: string, token: string | null, rating: number) {
  return authedPost(`/api/mobile/books/${id}/rate`, token, { rating });
}

export async function setBookShelf(id: string, token: string | null, status: ShelfStatus | 'none', progress?: number) {
  return authedPost(`/api/mobile/books/${id}/shelf`, token, { status, progress });
}

export async function fetchMyShelf(token: string | null): Promise<ShelfEntry[]> {
  const d = await authedGet<{ shelf?: ShelfEntry[] }>('/api/mobile/me/books', token, {});
  return Array.isArray(d?.shelf) ? d.shelf : [];
}
