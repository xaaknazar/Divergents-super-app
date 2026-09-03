import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, Pressable, TextInput, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Share } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuth } from '@clerk/clerk-expo';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeContext';
import { Screen } from '../../components/Screen';
import { BackNav, HeaderIcon } from '../../components/headers';
import { SF } from '../../components/SFIcon';
import { ErrorState, ListSkeleton } from '../../components/StateViews';
import { imgUrl } from '../../data/api';
import { fetchBook, postBookComment, updateBookComment, deleteBookComment, rateBook, setBookShelf, BookDetailResponse, BookComment, ShelfStatus } from '../../data/books';
import { emitShelfChanged } from '../../state/shelfBus';
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

// «1 оценка / 2 оценки / 5 оценок»
function plurRatings(n: number): string {
  const m10 = n % 10, m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return `${n} оценка`;
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return `${n} оценки`;
  return `${n} оценок`;
}

export function BookDetailScreen({ route, navigation }: Props) {
  const { bookId } = route.params;
  const { T, ty } = useTheme();
  const insets = useSafeAreaInsets();
  const { getToken, isSignedIn } = useAuth();
  const [data, setData] = useState<BookDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [tab, setTab] = useState<'comment' | 'review'>('review');
  const [draft, setDraft] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
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

  const onShare = () => {
    if (!data) return;
    Share.share({ message: `«${data.book.title}» — ${data.book.author}. Divergents.` }).catch(() => {});
  };

  const requireAuth = () => { Alert.alert('Войдите', 'Чтобы оценивать и комментировать книги, войдите в аккаунт.'); };

  const onRate = async (n: number) => {
    if (!isSignedIn) return requireAuth();
    const prev = data?.myRating;
    setData((p) => p ? { ...p, myRating: n } : p);
    const token = await getToken();
    const r = await rateBook(bookId, token, n);
    if (r?.ratingAvg != null) {
      setData((p) => p ? { ...p, myRating: n, book: { ...p.book, ratingAvg: r.ratingAvg, ratingCount: r.ratingCount } } : p);
      // Оценка видна в «Моих книгах» и в каталоге — сообщаем другим экранам.
      emitShelfChanged();
    }
    else { setData((p) => p ? { ...p, myRating: prev ?? null } : p); Alert.alert('Не удалось сохранить оценку', 'Проверьте подключение и попробуйте снова.'); }
  };

  // Статус меняется явно; повторное нажатие на активный статус больше ничего не
  // удаляет — для этого есть отдельное «Убрать с полки» с подтверждением.
  const onShelf = async (status: ShelfStatus | 'none', progress?: number) => {
    if (!isSignedIn) return requireAuth();
    setBusyShelf(true);
    const token = await getToken();
    const r = await setBookShelf(bookId, token, status, progress);
    setBusyShelf(false);
    if (r) {
      setData((p) => p ? { ...p, myShelf: r.shelf } : p);
      // Сервер принял изменение — остальные экраны перечитывают полку.
      emitShelfChanged();
    }
    else Alert.alert('Не удалось обновить полку', 'Проверьте подключение и попробуйте снова.');
  };

  const confirmRemoveShelf = () => {
    Alert.alert('Убрать с полки?', 'Книга исчезнет из «Моих книг», прогресс чтения будет удалён.', [
      { text: 'Отмена', style: 'cancel' },
      { text: 'Убрать', style: 'destructive', onPress: () => { onShelf('none'); } },
    ]);
  };

  const onSend = async () => {
    if (!isSignedIn) return requireAuth();
    const content = draft.trim(); if (!content) return;
    setSending(true);
    const token = await getToken();
    // Editing an existing entry vs. posting a new one.
    const ok = editingId
      ? await updateBookComment(bookId, editingId, token, content)
      : !!(await postBookComment(bookId, token, content, tab))?.comment;
    setSending(false);
    if (ok) { setDraft(''); setEditingId(null); load(); }
    else Alert.alert('Ошибка', 'Не удалось отправить. Попробуйте ещё раз.');
  };

  // Edit / delete your own review or comment.
  const startEdit = (c: BookComment) => { setTab(c.kind === 'review' ? 'review' : 'comment'); setEditingId(c.id); setDraft(c.content); };
  const cancelEdit = () => { setEditingId(null); setDraft(''); };
  const confirmDelete = (c: BookComment) => {
    Alert.alert(c.kind === 'review' ? 'Удалить рецензию?' : 'Удалить комментарий?', undefined, [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Удалить', style: 'destructive',
        onPress: async () => {
          const token = await getToken();
          const ok = await deleteBookComment(bookId, c.id, token);
          if (ok) { if (editingId === c.id) cancelEdit(); load(); }
          else Alert.alert('Ошибка', 'Не удалось удалить. Попробуйте ещё раз.');
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: T.groupedBg }}>
        <BackNav back="Книги" onBack={() => navigation.goBack()} />
        <View style={{ paddingTop: 16 }}><ListSkeleton rows={5} /></View>
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
      <BackNav back="Книги" onBack={() => navigation.goBack()}
        trailing={<HeaderIcon name="square.and.arrow.up" color={T.brand} label="Поделиться" onPress={onShare} />} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={88}>
      <Screen topInset={false} aurora={false} onRefresh={load}>
        {/* Hero with a soft brand backdrop + lifted cover */}
        <View style={{ position: 'relative' }}>
          <LinearGradient colors={[T.brandTintedStrong, 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 190 }} />
          <View style={{ flexDirection: 'row', gap: 16, padding: 20 }}>
            {b.imageUrl
              ? <View style={{ shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 12, shadowOffset: { width: 0, height: 8 }, elevation: 6, borderRadius: 12 }}>
                  <Image source={imgUrl(b.imageUrl, 600)} style={{ width: 120, height: 176, borderRadius: 12 }} contentFit="cover" transition={150} cachePolicy="memory-disk" />
                </View>
              : <View style={{ width: 120, height: 176, borderRadius: 12, backgroundColor: T.fillTertiary, alignItems: 'center', justifyContent: 'center' }}><SF name="book.fill" size={34} color={T.labelTertiary} /></View>}
            <View style={{ flex: 1 }}>
            <Text style={[ty.title3, { color: T.label }]}>{b.title}</Text>
            <Text style={[ty.subhead, { color: T.labelSecondary, marginTop: 4 }]}>{b.author}</Text>
            {/* Оценка редакции и оценка читателей — разные величины, поэтому
                показываем их отдельными строками, а не одним числом со счётчиком. */}
            <View style={{ gap: 4, marginTop: 8 }}>
              {b.rating ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <SF name="star.fill" size={14} color={T.orange} />
                  <Text style={[ty.subheadEm, { color: T.label }]}>{b.rating.toFixed(1)}</Text>
                  <Text style={[ty.footnote, { color: T.labelTertiary, flexShrink: 1 }]} numberOfLines={1}>Оценка Divergents</Text>
                </View>
              ) : null}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <SF name="person.2.fill" size={13} color={T.labelTertiary} />
                {b.ratingAvg != null ? (
                  <>
                    <Text style={[ty.subheadEm, { color: T.label }]}>{b.ratingAvg.toFixed(1)}</Text>
                    <Text style={[ty.footnote, { color: T.labelTertiary, flexShrink: 1 }]} numberOfLines={1}>Читатели · {plurRatings(b.ratingCount)}</Text>
                  </>
                ) : (
                  <Text style={[ty.footnote, { color: T.labelTertiary, flexShrink: 1 }]} numberOfLines={1}>Читатели ещё не оценивали</Text>
                )}
              </View>
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
        </View>

        {/* Shelf controls */}
        <View style={{ marginHorizontal: 16, padding: 14, borderRadius: 16, backgroundColor: T.cardBg }}>
          <Text style={[ty.caption2Em, { color: T.labelTertiary, marginBottom: 10, letterSpacing: 0.4 }]}>МОЙ СТАТУС</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {SHELF.map((s) => {
              const active = shelfStatus === s.key;
              return (
                <Pressable key={s.key} onPress={() => { if (!active) onShelf(s.key); }} disabled={busyShelf}
                  accessibilityRole="button" accessibilityState={{ selected: active, disabled: busyShelf }} accessibilityLabel={s.label}
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
          {shelfStatus ? (
            <Pressable onPress={confirmRemoveShelf} disabled={busyShelf} hitSlop={8}
              accessibilityRole="button" accessibilityLabel="Убрать книгу с полки"
              style={{ marginTop: 14, flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start' }}>
              <SF name="trash.fill" size={13} color={T.red} />
              <Text style={[ty.footnoteEm, { color: T.redText }]}>Убрать с полки</Text>
            </Pressable>
          ) : null}
        </View>

        {/* My rating */}
        <View style={{ marginHorizontal: 16, marginTop: 12, padding: 14, borderRadius: 16, backgroundColor: T.cardBg }}>
          <Text style={[ty.caption2Em, { color: T.labelTertiary, marginBottom: 10, letterSpacing: 0.4 }]}>МОЯ ОЦЕНКА</Text>
          {/* Each star is its own 44×44 target with no hitSlop, so neighbouring
              targets never overlap and VoiceOver reads «3 из 5». */}
          <View style={{ flexDirection: 'row', gap: 4, marginLeft: -7 }}>
            {[1, 2, 3, 4, 5].map((n) => {
              const on = (data.myRating ?? 0) >= n;
              return (
                <Pressable key={n} onPress={() => onRate(n)}
                  accessibilityRole="button" accessibilityLabel={`${n} из 5`} accessibilityState={{ selected: on }}
                  style={({ pressed }) => ({ width: 44, height: 44, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.6 : 1 })}>
                  <SF name={on ? 'star.fill' : 'star'} size={30} color={on ? T.orange : T.labelTertiary} />
                </Pressable>
              );
            })}
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
                <Text style={[ty.subheadEm, { color: T.label }]} numberOfLines={2}>{c.author}{c.mine ? ' · вы' : ''}</Text>
                <Text style={[ty.caption2, { color: T.labelTertiary }]}>{fmtDate(c.date)}</Text>
              </View>
              <Text style={[ty.body, { color: T.labelSecondary, marginTop: 6 }]}>{c.content}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 8 }}>
                {c.likes ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <SF name="heart.fill" size={12} color={T.red} /><Text style={[ty.caption2, { color: T.labelTertiary }]}>{c.likes}</Text>
                  </View>
                ) : null}
                {/* Own comment/review: edit or delete it. */}
                {c.mine ? (
                  <>
                    <Pressable onPress={() => startEdit(c)} accessibilityRole="button" accessibilityLabel="Изменить"
                      style={({ pressed }) => ({ minHeight: 44, paddingVertical: 12, paddingHorizontal: 4, justifyContent: 'center', opacity: pressed ? 0.6 : 1 })}>
                      <Text style={[ty.caption2Em, { color: T.brandText }]}>Изменить</Text>
                    </Pressable>
                    <Pressable onPress={() => confirmDelete(c)} accessibilityRole="button" accessibilityLabel="Удалить"
                      style={({ pressed }) => ({ minHeight: 44, paddingVertical: 12, paddingHorizontal: 4, justifyContent: 'center', opacity: pressed ? 0.6 : 1 })}>
                      <Text style={[ty.caption2Em, { color: T.redText }]}>Удалить</Text>
                    </Pressable>
                  </>
                ) : null}
              </View>
            </View>
          ))}
        </View>
        <View style={{ height: 8 }} />
      </Screen>

      {/* Composer */}
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingHorizontal: 12, paddingTop: 8, paddingBottom: insets.bottom + 12, backgroundColor: T.cardBg, borderTopWidth: 0.5, borderTopColor: T.separator }}>
        <View style={{ flex: 1, backgroundColor: T.fillTertiary, borderRadius: 18, paddingHorizontal: 14, paddingVertical: 8, maxHeight: 120 }}>
          <TextInput value={draft} onChangeText={setDraft} multiline placeholder={editingId ? 'Изменить текст…' : tab === 'review' ? 'Написать рецензию…' : 'Написать комментарий…'} placeholderTextColor={T.labelTertiary} accessibilityLabel={editingId ? 'Изменить текст' : tab === 'review' ? 'Написать рецензию' : 'Написать комментарий'} style={[ty.body, { color: T.label, paddingVertical: 0 }]} />
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Отправить комментарий" accessibilityState={{ disabled: sending || !draft.trim() }} onPress={onSend} disabled={sending || !draft.trim()} style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: draft.trim() ? T.brand : T.fillTertiary, alignItems: 'center', justifyContent: 'center' }}>
          {sending ? <ActivityIndicator color="#fff" size="small" /> : <SF name="arrow.up" size={18} color={draft.trim() ? '#fff' : T.labelTertiary} />}
        </Pressable>
      </View>
      </KeyboardAvoidingView>
    </View>
  );
}
