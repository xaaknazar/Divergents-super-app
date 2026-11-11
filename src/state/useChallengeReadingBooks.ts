import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@clerk/clerk-expo';
import { randomUUID } from 'expo-crypto';
import { BookCommand, BookRequestError, ChallengeBookShelf, challengeBookError, createChallengeBook, fetchChallengeBooks, saveChallengeBookPages } from '../data/challengeReadingBooks';
import type { ChallengeBookReport } from '../components/ChallengeReadingSheet';
import { readJSON, saveJSON } from './persist';

/** One durable command, explicit day/version, server receipt before any success UI. */
export function useChallengeReadingBooks(challengeId: string, taskId: string, day: number, onSaved: () => Promise<unknown>) {
  const { userId, getToken } = useAuth();
  const owner = `${userId ?? ''}.${challengeId}.${taskId}.${day}`;
  const current = useRef(owner); current.current = owner;
  const callback = useRef(onSaved); callback.current = onSaved;
  const tokenRef = useRef(getToken); tokenRef.current = getToken;
  const [data, setData] = useState<{ owner: string; shelf: ChallengeBookShelf } | null>(null);
  const shelf = data?.owner === owner ? data.shelf : null;
  const shelfRef = useRef(shelf); shelfRef.current = shelf;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const lock = useRef(false);
  const pending = useRef<BookCommand | null>(null);
  const ready = useRef(false);
  const key = `dvg.challengeBookReport.v1.${userId ?? ''}.${challengeId}.${taskId}`;
  const active = () => current.current === owner;
  const load = useCallback(async () => {
    if (!userId || !taskId || lock.current) return;
    lock.current = true; ready.current = false; setLoading(true); setError(null);
    try {
      const token = await readToken(tokenRef.current);
      const stored = await readJSON<BookCommand | null>(key, null);
      if (!stored.ok) throw new Error("storage_unavailable");
      const restored = stored.value;
      if (!active()) return;
      ready.current = true;
      pending.current = restored;
      if (restored) {
        try {
          await saveChallengeBookPages(challengeId, token, restored);
          if (!active()) return;
          await saveJSON(key, null, { strict: true });
          if (!active()) return;
          pending.current = null;
          void callback.current().catch(() => {});
        } catch (e) {
          if (!active()) return;
          // Definitive rejection means nothing was committed. Network/invalid receipts retain the same ID.
          if (e instanceof BookRequestError && [400, 403, 404, 409, 426].includes(e.status)) {
            await saveJSON(key, null, { strict: true }); pending.current = null;
          }
          setError(challengeBookError(e));
        }
      }
      const next = await fetchChallengeBooks(challengeId, token);
      if (next.taskId !== taskId || next.day !== day) throw new BookRequestError('day_changed', 409);
      if (active()) setData({ owner, shelf: next });
    } catch (e) { if (active()) setError(challengeBookError(e, 'load')); }
    finally { if (active()) { lock.current = false; setLoading(false); } }
  }, [owner, userId, challengeId, taskId, day, key]);
  useEffect(() => { current.current = owner; ready.current = false; pending.current = null; lock.current = false; void load(); return () => { current.current = ''; }; }, [load]);
  const add = async (book: { title: string; author: string }) => {
    if (!userId || lock.current || !ready.current) return null;
    lock.current = true; setError(null);
    try {
      const token = await readToken(tokenRef.current);
      if (!active()) return null;
      const result = await createChallengeBook(challengeId, token, book);
      if (!active()) return null;
      if (result.shelf.day !== day || result.shelf.taskId !== taskId) throw new BookRequestError('day_changed', 409);
      setData({ owner, shelf: result.shelf }); return result.book;
    } catch (e) { if (active()) setError(challengeBookError(e, 'add')); return null; }
    finally { if (active()) lock.current = false; }
  };
  const save = async (reading: ChallengeBookReport) => {
    const before = shelfRef.current;
    if (!userId || lock.current || !ready.current || !before || before.day !== day) return false;
    lock.current = true; setError(null);
    try {
      const token = await readToken(tokenRef.current);
      if (!active()) return false;
      const old = before.books.find(b => b.id === reading.bookId);
      if (!old) throw new BookRequestError('book_not_found', 404);
      const command: BookCommand = { taskId, day, expectedVersion: before.version, operationId: randomUUID(),
        value: before.total - old.todayPages + reading.pages, reading };
      if (pending.current) {
        // Recover the exact previous request first; never apply a different draft under its ID.
        await saveChallengeBookPages(challengeId, token, pending.current);
        if (!active()) return false;
        await saveJSON(key, null, { strict: true }); pending.current = null;
        const next = await fetchChallengeBooks(challengeId, await readToken(tokenRef.current));
        if (active()) { setData({ owner, shelf: next }); setError('Предыдущая запись сохранена. Проверьте страницы перед новой записью.'); void callback.current().catch(() => {}); }
        return false;
      }
      await saveJSON(key, command, { strict: true });
      if (!active()) return false;
      pending.current = command;
      const receipt = await saveChallengeBookPages(challengeId, token, command);
      if (!active()) return false;
      await saveJSON(key, null, { strict: true });
      if (!active()) return false;
      pending.current = null;
      setData({ owner, shelf: { ...before, total: command.value, version: receipt.version,
        books: before.books.map(b => b.id === reading.bookId ? { ...b, todayPages: reading.pages, pages: b.pages - b.todayPages + reading.pages, finished: reading.finished } : b) } });
      void callback.current().catch(() => {});
      return true;
    } catch (e) {
      if (active()) {
        if (e instanceof BookRequestError && [400, 403, 404, 409, 426].includes(e.status)) {
          await saveJSON(key, null, { strict: true }).then(() => { pending.current = null; }).catch(() => {});
          try { const next = await fetchChallengeBooks(challengeId, await readToken(tokenRef.current)); if (active()) setData({ owner, shelf: next }); } catch { /* original rejection stays visible */ }
        }
        if (active()) setError(challengeBookError(e));
      }
      return false;
    } finally { if (active()) lock.current = false; }
  };
  return { books: shelf?.books ?? [], unassignedPages: shelf?.unassignedPages ?? 0, loading, error, load, add, save };
}

async function readToken(provider: () => Promise<string | null>) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([provider(), new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error('token_timeout')), 12000);
    })]);
  } finally { if (timer) clearTimeout(timer); }
}
