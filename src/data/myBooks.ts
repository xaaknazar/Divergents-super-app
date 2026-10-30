// «Мои книги» профиля: полка библиотеки Divergents и книги Reading-челленджей одним списком.
// Одна и та же книга (сервер связал её по названию и автору) — одна строка.
import type { MyReadingBook, ShelfEntry, ShelfStatus } from './books';
import { fmtInt } from './format';

export type MyBookItem = {
  id: string; title: string; author: string; cover: string | null; status: ShelfStatus; detail: string;
  /** Книга каталога библиотеки — открывается на экране книги, статус меняется на её полке. */
  libraryBookId?: string;
  /** Книга Reading: статус «Прочитана» меняется командой челленджа (сервер синхронизирует остальное). */
  readingKey?: string; challengeId?: string;
};

const coverUrl = (coverId: number | null) => coverId != null ? `https://covers.openlibrary.org/b/id/${coverId}-M.jpg` : null;
function readingDetail(book: MyReadingBook) {
  const minutes = Math.floor(book.elapsedMs / 60000);
  const time = minutes >= 60 ? `${fmtInt(Math.floor(minutes / 60))} ч ${minutes % 60} мин` : `${minutes} мин`;
  return book.pages || book.elapsedMs ? `Reading · ${fmtInt(book.pages)} стр. · ${time}` : 'Reading · на полке';
}
const libraryDetail = (entry: ShelfEntry) => entry.status === 'read' ? 'Прочитано' : entry.status === 'reading' ? `Читаю · ${entry.progress}%` : 'В планах';

export function mergeMyBooks(shelf: ShelfEntry[], readingBooks: MyReadingBook[]): MyBookItem[] {
  const items: MyBookItem[] = shelf.map(entry => ({ id: `library:${entry.book.id}`, title: entry.book.title, author: entry.book.author,
    cover: entry.book.imageUrl ?? null, status: entry.status, detail: libraryDetail(entry), libraryBookId: entry.book.id }));
  for (const book of readingBooks) {
    const status: ShelfStatus = book.finished ? 'read' : 'reading';
    const linked = book.catalogBookId ? items.find(item => item.libraryBookId === book.catalogBookId) : undefined;
    if (linked) {
      Object.assign(linked, { readingKey: book.key, challengeId: book.challengeIds[0],
        status: linked.status === 'read' || book.finished ? 'read' : status, detail: readingDetail(book) });
      continue;
    }
    items.push({ id: `reading:${book.key}`, title: book.title, author: book.author, cover: coverUrl(book.coverId), status,
      detail: readingDetail(book), readingKey: book.key, challengeId: book.challengeIds[0],
      ...(book.catalogBookId ? { libraryBookId: book.catalogBookId } : {}) });
  }
  return items;
}
