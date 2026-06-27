import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, Pressable, TextInput, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { Image } from 'expo-image';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuth } from '@clerk/clerk-expo';
import { useTheme } from '../../theme/ThemeContext';
import { Screen } from '../../components/Screen';
import { BackNav } from '../../components/headers';
import { SF } from '../../components/SFIcon';
import { ty } from '../../components/ui';
import { ErrorState } from '../../components/StateViews';
import { imgUrl } from '../../data/api';
import { fetchBook, postBookComment, rateBook, setBookShelf, BookDetailResponse, BookComment, ShelfStatus } from '../../data/books';
import { LMSStackParams } from '../../navigation/types';

type Props = NativeStackScreenProps<LMSStackParams, 'BookDetail'>;

const SHELF: { key: ShelfStatus; label: string; icon: string }[] = [
  { key: 'want', label: 'В планах', icon: 'bookmark.fill' },
  { key: 'reading', label: 'Читаю', icon: 'book.fill' },
  { key: 'read', label: 'Прочитано', icon: 'checkmark.circle.fill' },
];

function fmtDate(iso: string): string {
  const d = new Date(iso); if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function BookDetailScreen({ route, navigation }: Props) {
  const { bookId } = route.params;
  const { T } = useTheme();
  const { getToken, isSignedIn } = useAuth();
  const [data, setData] = useState<BookDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [tab, setTab] = useState<'comment' | 'review'>('review');
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [busyShelf, setBusyShelf] = useState(false);

  const load = useCallback(async () => {
    setError(false);
    try {
      const token = isSignedIn ? await getToken() : null;
      const d = await fetchBook(bookId, token);
      if (!d) setError(true); else setData(d);
    } catch { setError(true); } finally { setLoading(false); }
  }, [bookId, getToken, isSignedIn]);

  useEffect(() => { load(); }, [load]);

  const requireAuth = () => { Alert.alert('Войдите', 'Чтобы оценивать и комментировать книги, войдите в аккаунт.'); };

  const onRate = async (n: number) => {
    if (!isSignedIn) return requireAuth();
    setData((p) => p ? { ...p, myRating: n } : p);
    const token = await getToken();
    const r = await rateBook(bookId, token, n);
    if (r?.ratingAvg != null && data) setData((p) => p ? { ...p, myRating: n, book: { ...p.book, ratingAvg: r.ratingAvg, ratingCount: r.ratingCount } } : p);
  };

  const onShelf = async (status: ShelfStatus, progress?: number) => {
    if (!isSignedIn) return requireAuth();
    const current = data?.myShelf?.status;
    const next = current === status && progress == null ? 'none' : status;
    setBusyShelf(true);
    const token = await getToken();
    const r = await setBookShelf(bookId, token, next as any, progress);
    setBusyShelf(false);
    if (r) setData((p) => p ? { ...p, myShelf: r.shelf } : p);
  };

  const onSend = async () => {
    if (!isSignedIn) return requireAuth();
    const content = draft.trim(); if (!content) return;
    setSending(true);
    const token = await getToken();
    const r = await postBookComment(bookId, token, content, tab);
    setSending(false);
    if (r?.comment) { setDraft(''); load(); }
    else Alert.alert('Ошибка', 'Не удалось отправить. Попробуйте ещё раз.');
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: T.groupedBg }}>
        <BackNav back="Книги" onBack={() => navigation.goBack()} />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color={T.brand} /></View>
      </View>
    );
  }
  if (error || !data) {
    return (
      <View style={{ flex: 1, backgroundColor: T.groupedBg }}>
        <BackNav back="Книги" onBack={() => navigation.goBack()} />
        <ErrorState onRetry={load} />
      </View>
    );
  }

  const b = data.book;
  const comments = data.comments.filter((c) => (tab === 'review' ? c.kind === 'review' : c.kind !== 'review'));
  const reviewCount = data.comments.filter((c) => c.kind === 'review').length;
  const commentCount = data.comments.length - reviewCount;
  const shelfStatus = data.myShelf?.status;
  const progress = data.myShelf?.progress ?? 0;

  return (
    <View style={{ flex: 1, backgroundColor: T.groupedBg }}>
      <BackNav back="Книги" onBack={() => navigation.goBack()} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={88}>
      <Screen topInset={false} aurora={false} onRefresh={load}>
        {/* Hero */}
        <View style={{ flexDirection: 'row', gap: 16, padding: 20 }}>
          {b.imageUrl
            ? <Image source={imgUrl(b.imageUrl, 600)} style={{ width: 120, height: 176, borderRadius: 12 }} contentFit="cover" transition={150} cachePolicy="memory-disk" />
            : <View style={{ width: 120, height: 176, borderRadius: 12, backgroundColor: T.fillTertiary, alignItems: 'center', justifyContent: 'center' }}><SF name="book.fill" size={34} color={T.labelTertiary} /></View>}
          <View style={{ flex: 1 }}>
            <Text style={[ty.title3, { color: T.label }]}>{b.title}</Text>
            <Text style={[ty.subhead, { color: T.labelSecondary, marginTop: 4 }]}>{b.author}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 }}>
              <SF name="star.fill" size={14} color="#FF9500" />
              <Text style={[ty.subheadEm, { color: T.label }]}>{b.ratingAvg ? b.ratingAvg.toFixed(1) : '—'}</Text>
              <Text style={[ty.footnote, { color: T.labelTertiary }]}>({b.ratingCount})</Text>
            </View>
            {b.genres.length ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
                {b.genres.map((g) => (
                  <View key={g} style={{ backgroundColor: T.fillTertiary, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}>
                    <Text style={[ty.caption2, { color: T.labelSecondary }]}>{g}</Text>
                  </View>
                ))}
              </View>
            ) : null}
          </View>
        </View>

        {/* Shelf controls */}
        <View style={{ marginHorizontal: 16, padding: 14, borderRadius: 16, backgroundColor: T.cardBg }}>
          <Text style={[ty.caption2Em, { color: T.labelTertiary, marginBottom: 10, letterSpacing: 0.4 }]}>МОЙ СТАТУС</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {SHELF.map((s) => {
              const active = shelfStatus === s.key;
              return (
                <Pressable key={s.key} onPress={() => onShelf(s.key)} disabled={busyShelf}
                  style={{ flex: 1, alignItems: 'center', gap: 5, paddingVertical: 10, borderRadius: 12, backgroundColor: active ? T.brand : T.fillTertiary }}>
                  <SF name={s.icon as any} size={17} color={active ? '#fff' : T.labelSecondary} />
                  <Text style={[ty.caption2Em, { color: active ? '#fff' : T.labelSecondary }]} numberOfLines={1}>{s.label}</Text>
                </Pressable>
              );
            })}
          </View>
          {shelfStatus === 'reading' ? (
            <View style={{ marginTop: 14 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                <Text style={[ty.subhead, { color: T.labelSecondary }]}>Прогресс</Text>
                <Text style={[ty.subheadEm, { color: T.label }]}>{progress}%</Text>
              </View>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                {[0, 25, 50, 75, 100].map((p) => (
                  <Pressable key={p} onPress={() => onShelf('reading', p)} disabled={busyShelf}
                    style={{ flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center', backgroundColor: progress >= p && p > 0 ? T.brand : T.fillTertiary }}>
                    <Text style={[ty.caption2Em, { color: progress >= p && p > 0 ? '#fff' : T.labelSecondary }]}>{p}%</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          ) : null}
        </View>

        {/* My rating */}
        <View style={{ marginHorizontal: 16, marginTop: 12, padding: 14, borderRadius: 16, backgroundColor: T.cardBg }}>
          <Text style={[ty.caption2Em, { color: T.labelTertiary, marginBottom: 10, letterSpacing: 0.4 }]}>МОЯ ОЦЕНКА</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {[1, 2, 3, 4, 5].map((n) => (
              <Pressable key={n} onPress={() => onRate(n)} hitSlop={6}>
                <SF name={(data.myRating ?? 0) >= n ? 'star.fill' : 'star'} size={30} color={(data.myRating ?? 0) >= n ? '#FF9500' : T.labelTertiary} />
              </Pressable>
            ))}
          </View>
        </View>

        {/* Description */}
        {b.description ? (
          <View style={{ marginHorizontal: 16, marginTop: 12, padding: 16, borderRadius: 16, backgroundColor: T.cardBg }}>
            <Text style={[ty.headline, { color: T.label, marginBottom: 8 }]}>Описание</Text>
            <Text style={[ty.body, { color: T.labelSecondary }]}>{b.description}</Text>
          </View>
        ) : null}

        {/* Editorial review */}
        {b.review ? (
          <View style={{ marginHorizontal: 16, marginTop: 12, padding: 16, borderRadius: 16, backgroundColor: T.brandTintedStrong }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <SF name="quote.bubble.fill" size={15} color={T.brand} />
              <Text style={[ty.headline, { color: T.label }]}>Рецензия Divergents</Text>
            </View>
            <Text style={[ty.body, { color: T.labelSecondary }]}>{b.review}</Text>
          </View>
        ) : null}

        {/* Author bio */}
        {b.authorBio ? (
          <View style={{ marginHorizontal: 16, marginTop: 12, padding: 16, borderRadius: 16, backgroundColor: T.cardBg }}>
            <Text style={[ty.headline, { color: T.label, marginBottom: 8 }]}>Об авторе</Text>
            <Text style={[ty.body, { color: T.labelSecondary }]}>{b.authorBio}</Text>
          </View>
        ) : null}

        {/* Comments / reviews */}
        <View style={{ marginHorizontal: 16, marginTop: 16, marginBottom: 8, flexDirection: 'row', gap: 8 }}>
          {([['review', 'Рецензии', reviewCount], ['comment', 'Комментарии', commentCount]] as const).map(([k, label, count]) => (
            <Pressable key={k} onPress={() => setTab(k)}
              style={{ flex: 1, paddingVertical: 9, borderRadius: 10, alignItems: 'center', backgroundColor: tab === k ? T.brand : T.fillTertiary }}>
              <Text style={[ty.subheadEm, { color: tab === k ? '#fff' : T.labelSecondary }]}>{label} {count ? '· ' + count : ''}</Text>
            </Pressable>
          ))}
        </View>

        <View style={{ marginHorizontal: 16 }}>
          {comments.length === 0 ? (
            <View style={{ padding: 20, alignItems: 'center' }}>
              <SF name={tab === 'review' ? 'quote.bubble' : 'bubble.left'} size={26} color={T.labelTertiary} />
              <Text style={[ty.subhead, { color: T.labelTertiary, marginTop: 8, textAlign: 'center' }]}>
                {tab === 'review' ? 'Пока нет рецензий. Будьте первым!' : 'Пока нет комментариев.'}
              </Text>
            </View>
          ) : comments.map((c: BookComment) => (
            <View key={c.id} style={{ padding: 14, borderRadius: 14, backgroundColor: T.cardBg, marginBottom: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={[ty.subheadEm, { color: T.label }]} numberOfLines={1}>{c.author}{c.mine ? ' · вы' : ''}</Text>
                <Text style={[ty.caption2, { color: T.labelTertiary }]}>{fmtDate(c.date)}</Text>
              </View>
              <Text style={[ty.body, { color: T.labelSecondary, marginTop: 6 }]}>{c.content}</Text>
              {c.likes ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 }}>
                  <SF name="heart.fill" size={12} color="#FF3B30" /><Text style={[ty.caption2, { color: T.labelTertiary }]}>{c.likes}</Text>
                </View>
              ) : null}
            </View>
          ))}
        </View>
        <View style={{ height: 8 }} />
      </Screen>

      {/* Composer */}
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingHorizontal: 12, paddingTop: 8, paddingBottom: 28, backgroundColor: T.cardBg, borderTopWidth: 0.5, borderTopColor: T.separator }}>
        <View style={{ flex: 1, backgroundColor: T.fillTertiary, borderRadius: 18, paddingHorizontal: 14, paddingVertical: 8, maxHeight: 120 }}>
          <TextInput value={draft} onChangeText={setDraft} multiline placeholder={tab === 'review' ? 'Написать рецензию…' : 'Написать комментарий…'} placeholderTextColor={T.labelTertiary} style={[ty.body, { color: T.label, paddingVertical: 0 }]} />
        </View>
        <Pressable onPress={onSend} disabled={sending || !draft.trim()} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: draft.trim() ? T.brand : T.fillTertiary, alignItems: 'center', justifyContent: 'center' }}>
          {sending ? <ActivityIndicator color="#fff" size="small" /> : <SF name="arrow.up" size={18} color={draft.trim() ? '#fff' : T.labelTertiary} />}
        </Pressable>
      </View>
      </KeyboardAvoidingView>
    </View>
  );
}
