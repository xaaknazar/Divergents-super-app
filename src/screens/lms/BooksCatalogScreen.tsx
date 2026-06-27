import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { View, Text, Pressable, ScrollView, TextInput } from 'react-native';
import { Image } from 'expo-image';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuth } from '@clerk/clerk-expo';
import { useTheme } from '../../theme/ThemeContext';
import { Screen } from '../../components/Screen';
import { BackNav, HeaderIcon } from '../../components/headers';
import { SF } from '../../components/SFIcon';
import { Chip, SectionHeader, ty } from '../../components/ui';
import { CourseGridSkeleton, ErrorState, EmptyState } from '../../components/StateViews';
import { imgUrl } from '../../data/api';
import { fetchBooks, fetchMyShelf, BookListItem, ShelfEntry, ShelfStatus } from '../../data/books';
import { LMSStackParams } from '../../navigation/types';

type Props = NativeStackScreenProps<LMSStackParams, 'Books'>;

const SHELF_LABEL: Record<ShelfStatus, string> = { want: 'В планах', reading: 'Читаю', read: 'Прочитано' };
const SHELF_COLOR: Record<ShelfStatus, string> = { want: '#AF52DE', reading: '#FF9500', read: '#34C759' };
type Sort = 'rating' | 'title' | 'newest';
const SORTS: { key: Sort; label: string }[] = [
  { key: 'rating', label: 'По рейтингу' },
  { key: 'title', label: 'По названию' },
  { key: 'newest', label: 'Новые' },
];

export function BooksCatalogScreen({ navigation }: Props) {
  const { T } = useTheme();
  const { getToken, isSignedIn } = useAuth();
  const [books, setBooks] = useState<BookListItem[]>([]);
  const [shelf, setShelf] = useState<ShelfEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [query, setQuery] = useState('');
  const [genre, setGenre] = useState('Все');
  const [sort, setSort] = useState<Sort>('rating');

  const load = useCallback(async () => {
    setError(false);
    try {
      const token = isSignedIn ? await getToken() : null;
      const [b, s] = await Promise.all([fetchBooks(token), isSignedIn ? fetchMyShelf(token) : Promise.resolve([] as ShelfEntry[])]);
      setBooks(b); setShelf(s);
    } catch { setError(true); } finally { setLoading(false); }
  }, [getToken, isSignedIn]);

  useEffect(() => { load(); }, [load]);

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

  const Cover = ({ url, w = 320 }: { url?: string | null; w?: number }) => (
    url
      ? <Image source={imgUrl(url, w)} style={{ width: '100%', aspectRatio: 0.68, borderRadius: 12 }} contentFit="cover" transition={150} cachePolicy="memory-disk" />
      : <View style={{ width: '100%', aspectRatio: 0.68, borderRadius: 12, backgroundColor: T.fillTertiary, alignItems: 'center', justifyContent: 'center' }}><SF name="book.fill" size={30} color={T.labelTertiary} /></View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: T.groupedBg }}>
      <BackNav back="Обучение" onBack={() => navigation.goBack()}
        trailing={<HeaderIcon name="sparkles" color={T.brand} label="AI-помощник" onPress={() => navigation.navigate('BookAI')} />} />
      <Screen topInset={false} aurora={false} onRefresh={load}>
        <View style={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 4 }}>
          <Text style={[ty.largeTitle, { color: T.label }]}>Книги</Text>
          <Text style={[ty.subhead, { color: T.labelSecondary, marginTop: 2 }]}>Библиотека Divergents · {books.length}</Text>
        </View>

        <Pressable onPress={() => navigation.navigate('BookAI')}
          style={{ marginHorizontal: 16, marginTop: 12, marginBottom: 6, borderRadius: 16, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: T.brandTintedStrong }}>
          <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: T.brand, alignItems: 'center', justifyContent: 'center' }}>
            <SF name="sparkles" size={20} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[ty.headline, { color: T.label }]} numberOfLines={1}>Спросить ИИ, что почитать</Text>
            <Text style={[ty.footnote, { color: T.labelSecondary }]} numberOfLines={2}>Подберёт книги под ваши таланты, психотип и цели</Text>
          </View>
          <SF name="chevron.right" size={14} color={T.labelTertiary} />
        </Pressable>

        <View style={{ paddingHorizontal: 16, paddingTop: 10, paddingBottom: 6 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: T.fillTertiary, borderRadius: 12, paddingHorizontal: 12, height: 42 }}>
            <SF name="magnifyingglass" size={16} color={T.labelSecondary} />
            <TextInput value={query} onChangeText={setQuery} placeholder="Название или автор" placeholderTextColor={T.labelTertiary} style={[ty.body, { flex: 1, color: T.label, paddingVertical: 0 }]} />
            {query ? <Pressable onPress={() => setQuery('')} hitSlop={8}><SF name="xmark" size={15} color={T.labelTertiary} /></Pressable> : null}
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 16, paddingVertical: 8 }}>
          {genres.map((g) => <Chip key={g} label={g} active={genre === g} onPress={() => setGenre(g)} />)}
        </ScrollView>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 16, paddingBottom: 8 }}>
          {SORTS.map((s) => <Chip key={s.key} label={s.label} active={sort === s.key} onPress={() => setSort(s.key)} />)}
        </ScrollView>

        {loading ? (
          <View style={{ paddingTop: 8 }}><CourseGridSkeleton count={4} /></View>
        ) : error && books.length === 0 ? (
          <ErrorState onRetry={load} />
        ) : (
          <>
            {reading.length > 0 && !query && genre === 'Все' ? (
              <View style={{ marginBottom: 8 }}>
                <SectionHeader title="Продолжить чтение" />
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingHorizontal: 16 }}>
                  {reading.map((s) => (
                    <Pressable key={s.book.id} onPress={() => navigation.navigate('BookDetail', { bookId: s.book.id })} style={{ width: 120 }}>
                      <Cover url={s.book.imageUrl} />
                      <Text style={[ty.subheadEm, { color: T.label, marginTop: 6 }]} numberOfLines={2}>{s.book.title}</Text>
                      <View style={{ height: 4, borderRadius: 2, backgroundColor: T.fillTertiary, marginTop: 6, overflow: 'hidden' }}>
                        <View style={{ height: 4, width: (s.progress + '%') as any, backgroundColor: SHELF_COLOR.reading }} />
                      </View>
                      <Text style={[ty.caption2, { color: T.labelTertiary, marginTop: 3 }]}>{s.progress}%</Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            ) : null}

            {plan.length > 0 && !query && genre === 'Все' ? (
              <View style={{ marginBottom: 8 }}>
                <SectionHeader title="В планах" />
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingHorizontal: 16 }}>
                  {plan.map((s) => (
                    <Pressable key={s.book.id} onPress={() => navigation.navigate('BookDetail', { bookId: s.book.id })} style={{ width: 110 }}>
                      <Cover url={s.book.imageUrl} />
                      <Text style={[ty.subhead, { color: T.label, marginTop: 6 }]} numberOfLines={2}>{s.book.title}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            ) : null}

            <SectionHeader title={query || genre !== 'Все' ? ('Найдено: ' + filtered.length) : 'Все книги'} />
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', paddingHorizontal: 16 }}>
              {filtered.map((b) => (
                <Pressable key={b.id} onPress={() => navigation.navigate('BookDetail', { bookId: b.id })} style={{ width: '48.5%', marginBottom: 18 }}>
                  <View>
                    <Cover url={b.imageUrl} />
                    {b.shelf ? (
                      <View style={{ position: 'absolute', top: 8, left: 8, backgroundColor: SHELF_COLOR[b.shelf.status], paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 }}>
                        <Text style={[ty.caption2Em, { color: '#fff' }]}>{SHELF_LABEL[b.shelf.status]}</Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={[ty.subheadEm, { color: T.label, marginTop: 8 }]} numberOfLines={2}>{b.title}</Text>
                  <Text style={[ty.footnote, { color: T.labelSecondary, marginTop: 1 }]} numberOfLines={1}>{b.author}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
                    {b.rating ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                        <SF name="star.fill" size={11} color="#FF9500" />
                        <Text style={[ty.caption2Em, { color: T.labelSecondary }]}>{b.rating.toFixed(1)}</Text>
                      </View>
                    ) : null}
                    {b.comments ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                        <SF name="bubble.left.fill" size={10} color={T.labelTertiary} />
                        <Text style={[ty.caption2, { color: T.labelTertiary }]}>{b.comments}</Text>
                      </View>
                    ) : null}
                  </View>
                </Pressable>
              ))}
            </View>
            {filtered.length === 0 ? (
              books.length === 0
                ? <EmptyState icon="book" title="Книги скоро появятся" subtitle="Библиотека обновляется — загляните чуть позже." />
                : <EmptyState icon="magnifyingglass" title="Ничего не найдено" subtitle="Измените запрос или жанр." />
            ) : null}
            <View style={{ height: 16 }} />
          </>
        )}
      </Screen>
    </View>
  );
}
