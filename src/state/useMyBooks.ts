import { useAuth } from '@clerk/clerk-expo';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as Crypto from 'expo-crypto';
import { fetchMyBooks, MyReadingBook, setBookShelf, ShelfEntry } from '../data/books';
import { MyBookItem, mergeMyBooks } from '../data/myBooks';
import { sendReadingCommand } from '../data/reading';
import { emitShelfChanged, onShelfChanged } from './shelfBus';

/** «Мои книги»: загрузка, обновление по shelfBus и единая отметка «Прочитана». */
export function useMyBooks() {
  const { isSignedIn, getToken } = useAuth();
  const auth = useRef(getToken); auth.current = getToken;
  const [data, setData] = useState<{ shelf: ShelfEntry[]; readingBooks: MyReadingBook[] }>({ shelf: [], readingBooks: [] });
  const [loaded, setLoaded] = useState(false);
  const [busyId, setBusyId] = useState<string>();
  const [error, setError] = useState<string>();
  const load = useCallback(async () => {
    if (!isSignedIn) { setData({ shelf: [], readingBooks: [] }); setLoaded(true); return; }
    try { setData(await fetchMyBooks(await auth.current())); } catch { /* keep the previous list */ }
    finally { setLoaded(true); }
  }, [isSignedIn]);
  useEffect(() => { void load(); }, [load]);
  const loadRef = useRef(load); loadRef.current = load;
  useEffect(() => onShelfChanged(() => { void loadRef.current(); }), []);
  const items = useMemo(() => mergeMyBooks(data.shelf, data.readingBooks), [data]);
  /** «Прочитана» ↔ «Читаю». Книга Reading меняется во всех челленджах (и в библиотеке, если связана). */
  const setRead = useCallback(async (item: MyBookItem, read: boolean) => {
    setBusyId(item.id); setError(undefined);
    try {
      const token = await auth.current();
      if (item.readingKey && item.challengeId) {
        await sendReadingCommand(token, { action: 'bookStatus', challengeId: item.challengeId, bookKey: item.readingKey, finished: read, operationId: Crypto.randomUUID() });
      } else if (item.libraryBookId) {
        if (!await setBookShelf(item.libraryBookId, token, read ? 'read' : 'reading')) throw new Error('Не удалось сохранить отметку. Повторите попытку.');
      }
      emitShelfChanged();
    } catch (e) {
      setError(e instanceof Error && /[А-Яа-яЁё]/.test(e.message) ? e.message : 'Не удалось сохранить отметку. Повторите попытку.');
    } finally { setBusyId(undefined); }
  }, []);
  return { items, shelf: data.shelf, loaded, busyId, error, reload: load, setRead };
}
