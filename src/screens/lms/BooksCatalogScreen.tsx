import { BookCard } from '../../components/BookCard';
import { BookAdvisorCard } from '../../components/BookAdvisorCard';
import { Wrapper } from '../../components/Wrapper';
import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useWindowDimensions } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuth } from '@clerk/clerk-expo';
import { useTheme } from '../../theme/ThemeContext';
import { DetailScreen } from '../../components/DetailScreen';
import { PageHeading } from '../../components/PageHeading';
import { InlineNotice } from '../../components/InlineNotice';
import { BookShelf } from '../../components/BookShelf';
import { HeaderIcon } from '../../components/headers';
import { Segmented, SectionHeader, Button } from '../../components/ui';
import { SearchField } from '../../components/SearchField';
import { FilterPicker } from '../../components/FilterPicker';
import { CourseGridSkeleton, ErrorState, EmptyState } from '../../components/StateViews';
import { fetchBooks, fetchMyShelf, BookListItem, ShelfEntry } from '../../data/books';
import { onShelfChanged } from '../../state/shelfBus';
import { LMSStackParams } from '../../navigation/types';

type Props = NativeStackScreenProps<LMSStackParams, 'Books'>;

type Sort = 'rating' | 'title' | 'newest';
const SORTS: { key: Sort; label: string }[] = [
  { key: 'rating', label: 'По рейтингу' },
  { key: 'title', label: 'По названию' },
  { key: 'newest', label: 'Новые' },
];

export function BooksCatalogScreen({ navigation }: Props) {
  const { textScale = 1 } = useTheme();
  const { width, fontScale } = useWindowDimensions();
  const singleColumn = width < 350 || fontScale * textScale > 1.3;
  const { getToken, isSignedIn } = useAuth();
  const [books, setBooks] = useState<BookListItem[]>([]);
  const [shelf, setShelf] = useState<ShelfEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [query, setQuery] = useState('');
  const [genre, setGenre] = useState('Все');
  const [sort, setSort] = useState<Sort>('rating');
  // Render books in pages of 30 — the catalog will grow to ~500, and drawing all
  // covers at once would jank. "Показать ещё" reveals the next 30.
  const [visible, setVisible] = useState(30);
  useEffect(() => { setVisible(30); }, [query, genre, sort]);

  const load = useCallback(async () => {
    setError(false);
    try {
      const token = isSignedIn ? await getToken() : null;
      const [b, s] = await Promise.all([fetchBooks(token), isSignedIn ? fetchMyShelf(token) : Promise.resolve([] as ShelfEntry[])]);
      setBooks(b); setShelf(s);
    } catch { setError(true); } finally { setLoading(false); }
  }, [getToken, isSignedIn]);

  useEffect(() => { load(); }, [load]);

  // Полку могли изменить на экране книги — обновляем каталог сразу, без
  // ручного «потянуть вниз» (см. shelfBus). Ссылка на актуальный загрузчик,
  // чтобы подписка оформлялась один раз.
  const loadRef = useRef(load);
  loadRef.current = load;
  useEffect(() => onShelfChanged(() => { loadRef.current(); }), []);

  const genres = useMemo(
    () => ['Все', ...Array.from(new Set(books.flatMap((b) => b.genres))).sort()],
    [books],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let arr = books
      .filter((b) => genre === 'Все' || b.genres.includes(genre))
      .filter((b) => !q || b.title.toLowerCase().includes(q) || (b.author || '').toLowerCase().includes(q));
    if (sort === 'rating') arr = arr.slice().sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    else if (sort === 'title') arr = arr.slice().sort((a, b) => a.title.localeCompare(b.title));
    return arr;
  }, [books, genre, query, sort]);

  const reading = shelf.filter((s) => s.status === 'reading');
  const plan = shelf.filter((s) => s.status === 'want');

  return (
    <DetailScreen title="Библиотека" backLabel="Обучение" onBack={() => navigation.goBack()} onRefresh={load}
      actions={<HeaderIcon name="sparkles" label="AI-помощник" onPress={() => navigation.navigate('BookAI')} />}>
        <Wrapper paddingHorizontal={20} paddingTop={8} paddingBottom={4}>
          {/* Count only once loaded — «· 0» during the fetch reads as an empty library. */}
          <PageHeading title="Книги" description={loading ? 'Библиотека Divergents' : `Библиотека Divergents · ${books.length}`} />
        </Wrapper>

        <Wrapper marginHorizontal={16} marginTop={12} marginBottom={6}><BookAdvisorCard onPress={() => navigation.navigate('BookAI')} /></Wrapper>

        <Wrapper paddingHorizontal={16} paddingTop={10} paddingBottom={12} gap={8}>
          <SearchField value={query} onChangeText={setQuery} placeholder="Название или автор" label="Поиск книги по названию или автору" />
          {genres.length > 1 ? <FilterPicker label="Жанр" items={genres} value={genre} onChange={setGenre} /> : null}
          <Segmented items={SORTS.map(s => s.label)} value={SORTS.findIndex(s => s.key === sort)} onChange={i => setSort(SORTS[i].key)} />
        </Wrapper>

        {loading ? (
          <Wrapper paddingTop={8}><CourseGridSkeleton count={4} /></Wrapper>
        ) : error && books.length === 0 ? (
          <ErrorState onRetry={load} />
        ) : (
          <>
            {error ? <Wrapper marginHorizontal={16} marginBottom={16}>
              <InlineNotice message="Не удалось обновить библиотеку. Показаны ранее загруженные книги." actionLabel="Повторить загрузку" onRetry={load} />
            </Wrapper> : null}
            {reading.length > 0 && !query && genre === 'Все' ? (
              <BookShelf title="Продолжить чтение" entries={reading} onBookPress={bookId => navigation.navigate('BookDetail', { bookId })} />
            ) : null}

            {plan.length > 0 && !query && genre === 'Все' ? (
              <BookShelf title="В планах" entries={plan} onBookPress={bookId => navigation.navigate('BookDetail', { bookId })} />
            ) : null}

            <SectionHeader title={query || genre !== 'Все' ? ('Найдено: ' + filtered.length) : 'Все книги'} />
            <Wrapper dir="row" wrap justify="space-between" paddingHorizontal={16}>
              {filtered.slice(0, visible).map((b) => (
                <Wrapper key={b.id} width={singleColumn ? '100%' : '48.5%'} marginBottom={16}><BookCard book={b} onPress={() => navigation.navigate('BookDetail', { bookId: b.id })} /></Wrapper>
              ))}
            </Wrapper>
            {filtered.length > visible ? (
              <Wrapper marginHorizontal={16} marginBottom={10}><Button label={`Показать ещё · ${Math.min(30, filtered.length - visible)}`} onPress={() => setVisible(v => v + 30)} variant="tinted" /></Wrapper>
            ) : null}
            {filtered.length === 0 ? (
              books.length === 0
                ? <EmptyState icon="book" title="Книги скоро появятся" subtitle="Библиотека обновляется — загляните чуть позже." />
                : <EmptyState icon="magnifyingglass" title="Ничего не найдено" subtitle="Измените запрос или жанр." actionLabel="Сбросить поиск и фильтр" onAction={() => { setQuery(''); setGenre('Все'); }} />
            ) : null}
            <Wrapper paddingBottom={16} />
          </>
        )}
    </DetailScreen>
  );
}
