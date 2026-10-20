import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@clerk/clerk-expo';
import { BookSearchResult, searchReadingBooks } from '../data/readingBooks';
export function useReadingBookSearch() {
  const { userId, getToken } = useAuth();
  const sequence = useRef(0), currentAccount = useRef(userId); currentAccount.current = userId;
  const [state, setState] = useState<BookSearchResult & { account?: string | null; busy: boolean; error?: string }>({ books: [], correctedQuery: null, busy: false });
  useEffect(() => () => { sequence.current++; }, []);
  return { ...(state.account === userId ? state : { books: [], correctedQuery: null, busy: false }),
    search: async (query: string, correct = false) => {
      const request = ++sequence.current;
      setState({ account: userId, books: [], correctedQuery: null, busy: true });
      try {
        const token = await getToken();
        if (currentAccount.current !== userId || sequence.current !== request) return;
        const result = await searchReadingBooks(token, query, correct);
        if (currentAccount.current === userId && sequence.current === request) setState({ ...result, account: userId, busy: false,
          error: result.books.length ? undefined : 'В каталоге не найдено. Это не значит, что книги не существует: проверьте написание или укажите её вручную.' });
      } catch (e) { if (currentAccount.current === userId && sequence.current === request) setState({ account: userId, books: [], correctedQuery: null, busy: false,
        error: e instanceof Error ? e.message : 'Поиск недоступен. Укажите книгу вручную.' }); }
    },
  };
}
