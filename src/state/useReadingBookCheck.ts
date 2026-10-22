import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@clerk/clerk-expo';
import { ReadingBookCandidate, verifyReadingBook } from '../data/readingBooks';
import type { ReadingBookSummary } from '../data/reading';
import { loadJSON, saveJSON } from './persist';
import type { ReadingBookFieldStatus } from '../components/ReadingBookField';

/** manual — ИИ книгу не нашёл, человек записал название и автора сам. */
export type ReadingVerifiedBook = { title: string; author: string; key?: string; coverId?: number; manual?: boolean };
export type ReadingBookView = {
  title: string; author: string; status: ReadingBookFieldStatus; error?: string;
  /** Подтверждённая ИИ книга — её и отправляем при старте. */
  verified: ReadingVerifiedBook | null;
  /** Что предложил ИИ: «Эта книга?» — до трёх вариантов. */
  suggestions: ReadingBookCandidate[];
  pick: (index: number) => void; reject: () => void;
  /** Записать книгу вручную — если ИИ не нашёл (нужны название и автор). */
  manual: () => void;
  /** Книга из собственной серверной истории — повторный поиск не требуется. */
  selectSaved: (book: ReadingBookSummary) => void;
  reset: () => void;
  setTitle: (value: string) => void; setAuthor: (value: string) => void; check: () => void; edit: () => void;
};

/** «Что читаете»: человек пишет название (и автора), ИИ предлагает «Эта книга?», человек выбирает. Выбранная книга
 * запоминается на телефоне для этого аккаунта и челленджа — следующий подход продолжает её же.
 * Ответ, пришедший после смены аккаунта, правки полей или нового запроса, отбрасывается. */
export function useReadingBookCheck(challengeId: string, purpose: 'selected' | 'draft' = 'selected'): ReadingBookView {
  const { userId, getToken } = useAuth();
  const key = `dvg.readingBook.v1.${userId ?? 'anon'}.${challengeId}${purpose === 'draft' ? '.draft' : ''}`;
  const current = useRef({ key, generation: 0 });
  if (current.current.key !== key) current.current = { key, generation: current.current.generation + 1 };
  const generation = current.current.generation;
  const mounted = useRef(true);
  const active = () => mounted.current && current.current.key === key && current.current.generation === generation;
  const [stateKey, setStateKey] = useState(key);
  const sequence = useRef(0);
  const [title, setTitleState] = useState(''), [author, setAuthorState] = useState('');
  const [status, setStatus] = useState<ReadingBookFieldStatus>('empty');
  const [error, setError] = useState<string>();
  const [verified, setVerified] = useState<ReadingVerifiedBook | null>(null);
  const [suggestions, setSuggestions] = useState<ReadingBookCandidate[]>([]);
  useEffect(() => {
    mounted.current = true;
    const request = ++sequence.current;
    setStateKey(key);
    setTitleState(''); setAuthorState(''); setStatus('empty'); setVerified(null); setSuggestions([]); setError(undefined);
    if (purpose === 'selected') void loadJSON<ReadingVerifiedBook | null>(key, null).then(saved => {
      if (!active() || sequence.current !== request || !saved?.title) return;
      setTitleState(saved.title); setAuthorState(saved.author); setVerified(saved); setStatus('verified');
    });
    return () => { mounted.current = false; sequence.current++; };
  }, [key, purpose, generation]);
  const remember = (book: ReadingVerifiedBook | null) => { if (purpose === 'selected') void saveJSON(key, book); };
  const edited = () => { sequence.current++; setStatus('empty'); setVerified(null); setSuggestions([]); setError(undefined); };
  return { ...(stateKey === key ? { title, author, status, error, verified, suggestions }
    : { title: '', author: '', status: 'empty' as const, error: undefined, verified: null, suggestions: [] }),
    reset: () => { if (!active()) return; edited(); setTitleState(''); setAuthorState(''); remember(null); },
    selectSaved: saved => {
      if (!active()) return;
      const book: ReadingVerifiedBook = { title: saved.title, author: saved.author, key: saved.key,
        ...(saved.coverId != null ? { coverId: saved.coverId } : {}),
        ...(/^(manual|legacy):/.test(saved.key) ? { manual: true } : {}) };
      sequence.current++;
      setTitleState(book.title); setAuthorState(book.author); setVerified(book); setSuggestions([]); setError(undefined); setStatus('verified');
      remember(book);
    },
    pick: index => {
      if (!active()) return;
      const book = suggestions[index];
      if (!book) return;
      sequence.current++;
      setTitleState(book.title); setAuthorState(book.author); setVerified(book); setSuggestions([]); setStatus('verified');
      remember(book);
    },
    reject: () => { if (!active()) return; sequence.current++; setSuggestions([]); setStatus('notFound'); },
    manual: () => {
      if (!active()) return;
      const book = { title: title.trim(), author: author.trim(), manual: true };
      if (book.title.length < 2 || book.author.length < 2) return;
      sequence.current++;
      setTitleState(book.title); setAuthorState(book.author); setVerified(book); setSuggestions([]); setStatus('verified');
      remember(book);
    },
    setTitle: value => { if (!active()) return; setTitleState(value); edited(); },
    setAuthor: value => { if (!active()) return; setAuthorState(value); edited(); },
    edit: () => { if (!active()) return; edited(); remember(null); },
    check: async () => {
      if (!active()) return;
      const request = ++sequence.current;
      setStatus('checking'); setError(undefined);
      try {
        const token = await getToken();
        if (!active() || sequence.current !== request) return;
        const result = await verifyReadingBook(token, title.trim(), author.trim());
        if (!active() || sequence.current !== request) return;
        if (result.status === 'notFound') { setStatus('notFound'); return; }
        setSuggestions(result.books); setStatus('suggested');
      } catch (e) {
        if (active() && sequence.current === request) { setStatus('error'); setError(e instanceof Error ? e.message : 'Проверка недоступна. Повторите позже.'); }
      }
    } };
}
