import { useAuth } from '@clerk/clerk-expo';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as Crypto from 'expo-crypto';
import { addPersonalLibraryBook, fetchMyBooks, MyBooksResponse, setBookShelf, setPersonalLibraryBookStatus } from '../data/books';
import { MyBookItem, mergeMyBooks } from '../data/myBooks';
import { sendReadingCommand } from '../data/reading';
import { emitShelfChanged, onShelfChanged } from './shelfBus';

const emptyBooks: MyBooksResponse = { shelf: [], readingBooks: [], personalBooks: [] };

/** Personal library, refreshed after confirmed writes and scoped to the current account. */
export function useMyBooks() {
  const { isSignedIn, userId, getToken } = useAuth();
  const auth = useRef(getToken); auth.current = getToken;
  const owner = useRef(userId); owner.current = userId;
  const request = useRef(0);
  const [snapshot, setSnapshot] = useState<{ userId: typeof userId; data: MyBooksResponse }>({ userId, data: emptyBooks });
  const data = snapshot.userId === userId ? snapshot.data : emptyBooks;
  const [loaded, setLoaded] = useState(false);
  const [busyId, setBusyId] = useState<string>();
  const [error, setError] = useState<string>();
  const load = useCallback(async () => {
    const attempt = ++request.current;
    if (!isSignedIn) { setSnapshot({ userId, data: emptyBooks }); setLoaded(true); setError(undefined); return; }
    try {
      const next = await fetchMyBooks(await auth.current());
      if (attempt === request.current && owner.current === userId) { setSnapshot({ userId, data: next }); setError(undefined); }
    } catch {
      if (attempt === request.current && owner.current === userId) setError('Не удалось обновить библиотеку. Потяните вниз, чтобы повторить.');
    } finally { if (attempt === request.current && owner.current === userId) setLoaded(true); }
  }, [isSignedIn, userId]);
  useEffect(() => { setLoaded(false); setError(undefined); setBusyId(undefined); void load(); return () => { request.current++; }; }, [load]);
  const loadRef = useRef(load); loadRef.current = load;
  useEffect(() => onShelfChanged(() => { void loadRef.current(); }), []);
  const items = useMemo(() => mergeMyBooks(data.shelf, data.readingBooks, data.personalBooks), [data]);
  const setRead = useCallback(async (item: MyBookItem, read: boolean) => {
    const target = owner.current;
    setBusyId(item.id); setError(undefined);
    try {
      const token = await auth.current();
      if (target !== owner.current) return;
      if (item.personalBookId) {
        await setPersonalLibraryBookStatus(token, item.personalBookId, read ? 'read' : 'reading');
      } else if (item.readingKey && item.challengeId) {
        await sendReadingCommand(token, { action: 'bookStatus', challengeId: item.challengeId, bookKey: item.readingKey, finished: read, operationId: Crypto.randomUUID() });
      } else if (item.libraryBookId) {
        if (!await setBookShelf(item.libraryBookId, token, read ? 'read' : 'reading')) throw new Error('Не удалось сохранить отметку. Повторите попытку.');
      }
      if (target === owner.current) emitShelfChanged();
    } catch (e) {
      if (target === owner.current) setError(e instanceof Error && /[А-Яа-яЁё]/.test(e.message) ? e.message : 'Не удалось сохранить отметку. Повторите попытку.');
    } finally { if (target === owner.current) setBusyId(undefined); }
  }, []);
  const addReadBook = useCallback(async (title: string, author: string) => {
    const target = owner.current;
    const token = await auth.current();
    if (target !== owner.current) throw new Error('Аккаунт изменился. Откройте библиотеку заново.');
    const book = await addPersonalLibraryBook(token, title, author);
    if (target !== owner.current) throw new Error('Аккаунт изменился. Откройте библиотеку заново.');
    request.current++; // An older GET must not replace a just-confirmed addition.
    setSnapshot(previous => ({ userId: target, data: { ...(previous.userId === target ? previous.data : emptyBooks),
      personalBooks: [book, ...(previous.userId === target ? previous.data.personalBooks ?? [] : []).filter(b => b.id !== book.id)] } }));
    emitShelfChanged();
  }, []);
  return { addReadBook, items, shelf: data.shelf, loaded, busyId, error, reload: load, setRead };
}
