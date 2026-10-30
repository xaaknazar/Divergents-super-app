import React, { useEffect, useState, useCallback } from 'react';
import { Alert, Share } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuth } from '@clerk/clerk-expo';
import { DetailScreen } from '../../components/DetailScreen';
import { Wrapper } from '../../components/Wrapper';
import { HeaderIcon } from '../../components/HeaderIcon';
import { ErrorState, EmptyState, ListSkeleton } from '../../components/StateViews';
import { BookOverview } from '../../components/BookOverview';
import { BookShelfControls } from '../../components/BookShelfControls';
import { RatingControl } from '../../components/RatingControl';
import { BookCommentCard } from '../../components/BookCommentCard';
import { ReviewComposer } from '../../components/ReviewComposer';
import { TextSection } from '../../components/TextSection';
import { Segmented } from '../../components/Segmented';
import { fetchBook, postBookComment, updateBookComment, deleteBookComment, rateBook, setBookShelf, BookDetailResponse, BookComment, ShelfStatus } from '../../data/books';
import { emitShelfChanged } from '../../state/shelfBus';
import { LMSStackParams } from '../../navigation/types';

type Props = NativeStackScreenProps<LMSStackParams, 'BookDetail'>;

export function BookDetailScreen({ route, navigation }: Props) {
  const bookId = route.params?.bookId ?? '';
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

  const goBack = () => navigation.goBack();
  if (loading) return <DetailScreen backLabel="Книги" onBack={goBack}>
    <Wrapper padding={16}><ListSkeleton rows={5} /></Wrapper>
  </DetailScreen>;
  if (error || !data) return <DetailScreen backLabel="Книги" onBack={goBack}><ErrorState onRetry={load} /></DetailScreen>;

  const b = data.book;
  const comments = data.comments.filter(c => tab === 'review' ? c.kind === 'review' : c.kind !== 'review');
  const reviewCount = data.comments.filter(c => c.kind === 'review').length;
  const commentCount = data.comments.length - reviewCount;
  return <DetailScreen backLabel="Книги" onBack={goBack} keyboard onRefresh={load}
    actions={<HeaderIcon name="square.and.arrow.up" label="Поделиться" onPress={onShare} />}
    footer={<ReviewComposer value={draft} onChange={setDraft} onSend={onSend} sending={sending} kind={tab}
      editing={!!editingId} onCancelEdit={cancelEdit} />}>
    <Wrapper padding={16} gap={16}>
      <BookOverview book={b} />
      <BookShelfControls status={data.myShelf?.status} progress={data.myShelf?.progress ?? 0} busy={busyShelf}
        onSelect={onShelf} onRemove={confirmRemoveShelf} />
      <RatingControl value={data.myRating} onChange={onRate} />
      {b.description ? <TextSection title="Описание" text={b.description} /> : null}
      {b.review ? <TextSection title="Рецензия Divergents" text={b.review} variant="editorial" /> : null}
      {b.authorBio ? <TextSection title="Об авторе" text={b.authorBio} /> : null}
      <Segmented items={['Рецензии' + (reviewCount ? ' · ' + reviewCount : ''), 'Комментарии' + (commentCount ? ' · ' + commentCount : '')]}
        value={tab === 'review' ? 0 : 1} onChange={index => setTab(index === 0 ? 'review' : 'comment')} />
      {comments.length === 0 ? <EmptyState icon={tab === 'review' ? 'quote.bubble' : 'bubble.left'}
        title={tab === 'review' ? 'Пока нет рецензий. Будьте первым!' : 'Пока нет комментариев.'} />
        : comments.map(comment => <BookCommentCard key={comment.id} comment={comment} onEdit={() => startEdit(comment)} onDelete={() => confirmDelete(comment)} />)}
    </Wrapper>
  </DetailScreen>;
}
