import React, { useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { nums, radius } from '../theme/tokens';
import { useTheme } from '../theme/ThemeContext';
import { Button } from './Button';
import { HalfSheet } from './HalfSheet';
import { SF } from './SFIcon';

export interface ChallengeBook {
  id: string; title: string; author: string;
  finished: boolean; pages: number; todayPages: number;
}
export interface ChallengeBookReport { bookId: string; pages: number; finished: boolean }
export interface ChallengeReadingSheetProps {
  books: ChallengeBook[];
  unassignedPages: number;
  initialBookId?: string;
  initialView?: 'entry' | 'books' | 'add';
  loading?: boolean;
  error?: string | null;
  onRetry: () => void;
  onClose: () => void;
  onAdd: (book: { title: string; author: string }) => Promise<ChallengeBook | null>;
  onSave: (report: ChallengeBookReport) => Promise<boolean>;
}

/** Ordinary challenge only. Counts are daily totals per book, never page numbers. */
export function ChallengeReadingSheet({ books, unassignedPages, initialBookId, initialView = 'entry',
  loading, error, onRetry, onClose, onAdd, onSave }: ChallengeReadingSheetProps) {
  const { T, ty } = useTheme();
  const first = books.find(b => b.id === initialBookId) ?? books.find(b => !b.finished);
  const [selectedId, setSelectedId] = useState(first?.id);
  const selected = books.find(b => b.id === selectedId) ?? (!selectedId ? first : undefined);
  const [view, setView] = useState(initialView);
  const [drafts, setDrafts] = useState<Record<string, { pages: string; finished: boolean }>>({});
  const draft = selected ? drafts[selected.id] ?? { pages: selected.todayPages ? String(selected.todayPages) : '', finished: selected.finished } : { pages: '', finished: false };
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [saved, setSaved] = useState<{ title: string; pages: number; finished: boolean } | null>(null);
  const [showFinished, setShowFinished] = useState(false);
  const pages = /^\d{1,4}$/.test(draft.pages) ? Number(draft.pages) : null;
  const total = unassignedPages + books.reduce((sum, book) => sum + (book.id === selected?.id && pages !== null ? pages : book.todayPages), 0);
  const updateDraft = (value: Partial<typeof draft>) => { if (selected) setDrafts(prev => ({ ...prev, [selected.id]: { ...draft, ...value } })); };
  const choose = (book: ChallengeBook) => { setSelectedId(book.id); setView('entry'); setSaved(null); };
  const run = async (action: () => Promise<void>) => {
    if (busyRef.current) return;
    busyRef.current = true; setBusy(true);
    try { await action(); } finally { busyRef.current = false; setBusy(false); }
  };
  const save = () => run(async () => {
    if (!selected || pages === null) return;
    if (await onSave({ bookId: selected.id, pages, finished: draft.finished })) {
      setSaved({ title: selected.title, pages, finished: draft.finished });
      setDrafts({});
    }
  });
  const add = () => run(async () => {
    if (!title.trim() || !author.trim()) return;
    const book = await onAdd({ title: title.trim(), author: author.trim() });
    if (book) { choose(book); setTitle(''); setAuthor(''); }
  });
  const quiet = (text: string) => <Text style={[ty.subhead, { color: T.labelSecondary }]}>{text}</Text>;
  const fieldStyle = [styles.field, ty.body, { backgroundColor: T.fillQuaternary, color: T.label, borderColor: T.separator }];
  const row = (book: ChallengeBook) => <Pressable key={book.id} accessibilityRole="button"
    accessibilityLabel={`${book.title}, ${book.author}. ${book.finished ? 'Прочитана' : 'Читаю'}. ${book.pages} страниц записано`}
    disabled={busy} onPress={() => choose(book)} style={({ pressed }) => [styles.bookRow, { backgroundColor: book.id === selected?.id ? T.brandTinted : T.fillQuaternary, opacity: pressed ? 0.7 : 1 }]}>
    <View style={[styles.bookIcon, { backgroundColor: T.cardBg }]}><SF name="book.fill" size={23} color={T.brandText} /></View>
    <View style={styles.flex}><Text style={[ty.headline, { color: T.label }]}>{book.title}</Text>
      {quiet(book.author)}<Text style={[ty.footnote, nums, { color: T.labelSecondary, marginTop: 4 }]}>{book.pages} стр. записано{book.todayPages ? ` · ${book.todayPages} сегодня` : ''}</Text></View>
    <SF name={book.id === selected?.id ? 'checkmark.circle.fill' : 'chevron.right'} color={T.brandText} size={20} />
  </Pressable>;
  const footer = loading ? undefined : saved ? <Button label={saved.finished ? 'Выбрать следующую книгу' : 'Готово'} onPress={saved.finished ? () => { setSaved(null); setView('books'); } : onClose} />
    : view === 'add' ? <Button label="Добавить книгу" loading={busy} disabled={!title.trim() || !author.trim()} onPress={add} />
    : view === 'entry' && selected ? <Button label="Сохранить" loading={busy} disabled={pages === null || total > 1000} onPress={save} />
    : view === 'entry' ? <Button label="Выбрать книгу" icon="plus" onPress={() => setView(books.length ? 'books' : 'add')} /> : undefined;
  return <HalfSheet visible size="large" title={saved ? 'Сохранено' : view === 'add' ? 'Новая книга' : view === 'books' ? 'Мои книги' : 'Чтение'}
    onClose={() => { if (!busy) onClose(); }} onBack={!saved && view !== 'entry' ? () => setView('entry') : undefined} footer={footer}>
    {loading ? <View style={styles.loading}><ActivityIndicator color={T.brandText} accessibilityLabel="Загружаем книги" /></View>
      : saved ? <View style={styles.success}>
        <View style={[styles.successIcon, { backgroundColor: T.brandTinted }]}><SF name="checkmark" size={32} color={T.brandText} /></View>
        <Text style={[ty.title2, styles.center, { color: T.label }]}>{saved.finished ? 'Книга прочитана' : 'Чтение записано'}</Text>
        <Text style={[ty.body, styles.center, { color: T.label }]}>{saved.title}</Text>
        <Text style={[ty.body, nums, styles.center, { color: T.labelSecondary }]}>{saved.pages} стр. за сегодня</Text>
        {saved.finished ? quiet('Книга останется в вашей истории.') : null}
      </View>
      : view === 'add' ? <>
        {quiet('Название и автор помогут сохранить вашу историю чтения.')}
        <Text style={[ty.headline, { color: T.label }]}>Название</Text>
        <TextInput accessibilityLabel="Название книги" autoCorrect={false} value={title} onChangeText={setTitle} editable={!busy} maxLength={200}
          placeholder="Например, Атомные привычки" placeholderTextColor={T.labelTertiary} style={fieldStyle} />
        <Text style={[ty.headline, { color: T.label }]}>Автор</Text>
        <TextInput accessibilityLabel="Автор книги" autoCorrect={false} value={author} onChangeText={setAuthor} editable={!busy} maxLength={200}
          placeholder="Имя и фамилия" placeholderTextColor={T.labelTertiary} style={fieldStyle} />
      </>
      : view === 'books' ? <>
        {books.filter(b => !b.finished).map(row)}
        <Button label="Добавить книгу" icon="plus" variant="tinted" onPress={() => setView('add')} />
        {books.some(b => b.finished) ? <>
          <Button label={`Прочитаны · ${books.filter(b => b.finished).length}`} variant="plain" icon={showFinished ? 'chevron.up' : 'chevron.down'} expanded={showFinished} onPress={() => setShowFinished(!showFinished)} />
          {showFinished ? books.filter(b => b.finished).map(row) : null}
        </> : null}
      </>
      : selected ? <>
        <Pressable disabled={busy} accessibilityRole="button" accessibilityLabel={`Сменить книгу: ${selected.title}, ${selected.author}`}
          onPress={() => setView('books')} style={[styles.bookRow, { backgroundColor: T.brandTinted }]}>
          <View style={[styles.bookIcon, { backgroundColor: T.cardBg }]}><SF name="book.fill" size={24} color={T.brandText} /></View>
          <View style={styles.flex}><Text style={[ty.headline, { color: T.label }]}>{selected.title}</Text>{quiet(selected.author)}
            <Text style={[ty.subheadEm, { color: T.brandText, marginTop: 4 }]}>Сменить книгу</Text></View>
          <SF name="chevron.right" size={18} color={T.brandText} />
        </Pressable>
        <View style={styles.pages}>
          <Text style={[ty.headline, { color: T.label }]}>{unassignedPages > 0 ? 'Новые страницы сегодня' : 'Страниц сегодня'}</Text>
          {quiet(unassignedPages > 0 ? `Прежние ${unassignedPages} стр. уже учтены. Не добавляйте их повторно.` : 'Сколько прочитали в этой книге за день')}
          <TextInput accessibilityLabel="Страниц сегодня в этой книге" keyboardType="number-pad" value={draft.pages}
            onChangeText={value => updateDraft({ pages: value })} selectTextOnFocus editable={!busy} maxLength={4}
            placeholder="0" placeholderTextColor={T.labelTertiary} style={[...fieldStyle, ty.largeTitle, nums, styles.number]} />
        </View>
        <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: draft.finished, disabled: busy }} disabled={busy}
          onPress={() => updateDraft({ finished: !draft.finished })} style={styles.finish}>
          <SF name={draft.finished ? 'checkmark.circle.fill' : 'circle'} size={26} color={draft.finished ? T.brandText : T.labelTertiary} />
          <Text style={[ty.body, styles.flex, { color: T.label }]}>Я дочитал(а) эту книгу</Text>
        </Pressable>
        {draft.pages.length > 0 && pages === null ? <Text accessibilityRole="alert" style={[ty.subhead, { color: T.redText }]}>Введите целое число страниц.</Text> : null}
        {total > 1000 ? <Text accessibilityRole="alert" style={[ty.subhead, { color: T.redText }]}>Проверьте число: за день можно записать до 1 000 страниц.</Text> : null}
        <View style={[styles.total, { borderColor: T.separator }]}><Text style={[ty.subhead, { color: T.labelSecondary }]}>Всего за сегодня</Text>
          <Text style={[ty.headline, nums, { color: T.label }]}>{total} стр.</Text></View>
      </> : <View style={styles.success}>
        <SF name="book.fill" size={40} color={T.brandText} />
        <Text style={[ty.title2, styles.center, { color: T.label }]}>Что вы читаете?</Text>
        <Text style={[ty.body, styles.center, { color: T.labelSecondary }]}>Выберите книгу, чтобы записать страницы. В следующий раз она уже будет здесь.</Text>
      </View>}
    {error ? <View accessibilityLiveRegion="polite" style={styles.error}><Text accessibilityRole="alert" style={[ty.subhead, { color: T.redText }]}>{error}</Text>
      <Button label="Обновить список" variant="plain" disabled={busy} onPress={onRetry} /></View> : null}
  </HalfSheet>;
}
const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 }, center: { textAlign: 'center' },
  bookRow: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: radius.lg, padding: 16, minHeight: 80 },
  bookIcon: { width: 44, height: 56, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  field: { borderRadius: radius.input, borderWidth: 1, minHeight: 56, paddingHorizontal: 16, paddingVertical: 14 },
  pages: { gap: 6, marginTop: 10 }, number: { marginTop: 6, minHeight: 72 },
  finish: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 52, paddingVertical: 10 },
  total: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 8, borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 16 },
  success: { alignItems: 'center', gap: 14, paddingVertical: 30 },
  successIcon: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  loading: { padding: 48 }, error: { gap: 6 },
});
