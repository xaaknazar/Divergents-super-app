import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@clerk/clerk-expo';
import * as Crypto from 'expo-crypto';
import { loadJSON, saveJSON } from './persist';
import { sendReadingCommand } from '../data/reading';
import { emitShelfChanged } from './shelfBus';
import { addReadingBook, fetchReadingHistory, readingBookAddSelection, ReadingBookAddReceipt,
  ReadingBookSelection, ReadingShelfBook } from '../data/readingBooks';

type LibraryState = { context: string; books: ReadingShelfBook[]; busy: boolean; supportsBookshelf: boolean; error?: string };
const libraryError = (error: unknown, fallback: string) => error instanceof Error && /[А-Яа-яЁё]/.test(error.message) ? error.message : fallback;

/** Own persistent shelf and legacy reading history. Selecting a book never writes;
 * explicit add requires a server receipt. No offline placeholder is called saved.
 * Receipts refresh the list; late replies from another account/challenge are discarded. */
export function useReadingLibrary(challengeId: string, readerId?: string, receipts = '') {
  const { userId, getToken } = useAuth();
  const auth = useRef({ getToken }); auth.current = { getToken };
  const context = JSON.stringify([userId, challengeId, readerId]);
  const generation = useMemo(() => Symbol('reading-library'), [context]);
  const active = useRef(generation); active.current = generation;
  const mounted = useRef(true);
  const isCurrent = useCallback(() => mounted.current && active.current === generation, [generation]);
  const sequence = useRef(0);
  const [state, setState] = useState<LibraryState>();
  const stateRef = useRef(state); stateRef.current = state;
  const [addition, setAddition] = useState<{ generation: symbol; adding: boolean; error?: string }>();
  const adding = useRef<{ generation: symbol; operation: symbol } | null>(null);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const load = useCallback(async () => {
    if (!isCurrent()) return;
    const request = ++sequence.current;
    if (!userId || !readerId || readerId !== userId) return;
    setState(previous => ({ context, books: previous?.context === context ? previous.books : [], busy: true,
      supportsBookshelf: previous?.context === context && previous.supportsBookshelf }));
    try {
      const token = await auth.current.getToken();
      if (!isCurrent() || sequence.current !== request) return;
      const data = await fetchReadingHistory(token, challengeId, readerId);
      if (!isCurrent() || sequence.current !== request) return;
      if (!data.own || data.reader.userId !== userId || data.challengeId !== challengeId) throw new Error('Не удалось загрузить ваши книги');
      const books = data.shelfBooks ?? data.books.map(book => ({ ...book, addedAt: null }));
      const supportsBookshelf = data.shelfBooks !== undefined && data.supportsBookshelf !== false;
      setState({ context, books, busy: false, supportsBookshelf });
      // A copy on the phone lets the reader pick a book and start without internet.
      void saveJSON(`dvg.readingShelf.v1.${userId}.${challengeId}`, { books, supportsBookshelf }).catch(() => {});
    } catch (error) {
      if (!isCurrent() || sequence.current !== request) return;
      const saved = stateRef.current?.context === context && stateRef.current.books.length ? null
        : await loadJSON<{ books: ReadingShelfBook[]; supportsBookshelf: boolean } | null>(`dvg.readingShelf.v1.${userId}.${challengeId}`, null);
      if (!isCurrent() || sequence.current !== request) return;
      if (saved && Array.isArray(saved.books) && saved.books.length) {
        // Offline: the last confirmed shelf. Adding books still needs the server.
        setState({ context, books: saved.books, busy: false, supportsBookshelf: false,
          error: 'Полка из памяти телефона. Новые книги можно будет добавить при связи.' });
        return;
      }
      setState(previous => ({ context, books: previous?.context === context ? previous.books : [], busy: false,
        supportsBookshelf: previous?.context === context && previous.supportsBookshelf,
        error: libraryError(error, 'Не удалось загрузить ваши книги. Повторите попытку.') }));
    }
  }, [context, isCurrent, userId, challengeId, readerId]);
  useEffect(() => { void load(); return () => { sequence.current++; }; }, [load, receipts]);
  const add = useCallback(async (selection: ReadingBookSelection): Promise<ReadingBookAddReceipt | null> => {
    // Guard before touching any lock/state: a stale UI handler cannot cancel a
    // new account's addition, including an A -> B -> A context round trip.
    if (!isCurrent() || adding.current?.generation === generation) return null;
    if (!userId || !readerId || readerId !== userId) return null;
    if (stateRef.current?.context !== context || !stateRef.current.supportsBookshelf) {
      setAddition({ generation, adding: false, error: 'Сохранение книг на полку пока недоступно. Обновите список и попробуйте ещё раз.' });
      return null;
    }
    const operation = Symbol('reading-book-add');
    adding.current = { generation, operation }; setAddition({ generation, adding: true });
    const currentAddition = () => isCurrent() && adding.current?.operation === operation;
    try {
      const book = readingBookAddSelection(selection);
      // Permanent addition has no delete/re-add semantics. The same actor,
      // challenge and immutable payload retain one receipt even after a timeout,
      // remount or process restart. A different book/payload gets a distinct ID.
      const hash = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256,
        JSON.stringify(['reading-book-add-v1', userId, challengeId, book]));
      if (!currentAddition()) return null;
      const operationId = `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
      const token = await auth.current.getToken();
      if (!currentAddition()) return null;
      const result = await addReadingBook(token, challengeId, operationId, book);
      if (!currentAddition()) return null;
      // Refresh errors belong to the list. A valid write receipt is still a
      // confirmed addition; never invent reading totals while refreshing fails.
      await load();
      if (!currentAddition()) return null;
      return result;
    } catch (error) {
      if (currentAddition()) setAddition({ generation, adding: false,
        error: libraryError(error, 'Сервер не подтвердил сохранение книги. Повторите попытку — дубликат не появится.') });
      return null;
    } finally {
      if (currentAddition()) setAddition(previous => previous?.generation === generation ? { ...previous, adding: false } : previous);
      if (adding.current?.operation === operation) adding.current = null;
    }
  }, [context, generation, isCurrent, userId, challengeId, readerId, load]);
  // «Прочитана» / «Вернуть в чтение». Сервер ставит тот же статус этой книге во всех челленджах
  // читателя и на полке библиотеки, поэтому после ответа обновляем и «Мои книги» в профиле.
  const [finishing, setFinishing] = useState<{ generation: symbol; key: string; error?: string }>();
  const finishOperation = useRef<{ key: string; finished: boolean; operationId: string } | null>(null);
  const setFinished = useCallback(async (key: string, finished: boolean) => {
    if (!isCurrent() || !userId || readerId !== userId || finishing?.generation === generation && finishing.key === key) return false;
    const previous = finishOperation.current;
    // A retry after a lost reply resends the same operation: the receipt answers instead of a second write.
    const operation = previous?.key === key && previous.finished === finished ? previous : { key, finished, operationId: Crypto.randomUUID() };
    finishOperation.current = operation;
    setFinishing({ generation, key });
    try {
      const token = await auth.current.getToken();
      if (!isCurrent()) return false;
      await sendReadingCommand(token, { action: 'bookStatus', challengeId, bookKey: key, finished, operationId: operation.operationId });
      finishOperation.current = null;
      emitShelfChanged();
      if (isCurrent()) { setFinishing(undefined); await load(); }
      return true;
    } catch (error) {
      if (isCurrent()) setFinishing({ generation, key: '', error: libraryError(error, 'Сервер не подтвердил отметку. Повторите попытку.') });
      return false;
    }
  }, [isCurrent, userId, readerId, generation, finishing, challengeId, load]);
  const clearAddError = useCallback(() => {
    if (!isCurrent()) return;
    setAddition(previous => previous?.generation === generation ? { ...previous, error: undefined } : previous);
  }, [generation, isCurrent]);
  return { ...(state?.context === context ? state : { books: [], busy: false, error: undefined, supportsBookshelf: false }),
    retry: load, add, adding: addition?.generation === generation && addition.adding,
    addError: addition?.generation === generation ? addition.error : undefined, clearAddError,
    setFinished, finishingKey: finishing?.generation === generation && finishing.key ? finishing.key : undefined,
    finishError: finishing?.generation === generation ? finishing.error : undefined };
}
