import React, { useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { ReadingBookSummary } from '../data/reading';
import { useTheme } from '../theme/ThemeContext';
import { minTouch, nums } from '../theme/tokens';
import { SF } from './SFIcon';
import { Button } from './Button';
import { ContentBlock } from './ContentBlock';
import { Wrapper } from './Wrapper';
import { InlineNotice } from './InlineNotice';
import { ReadingBookField, ReadingBookInput } from './ReadingBookField';
import { ReadingBookSummaryRow } from './ReadingBookSummaryRow';
import { ReadingFinishedBooks } from './ReadingFinishedBooks';

export type ReadingBookLibrary = {
  books: (ReadingBookSummary & { finished?: boolean; editable?: boolean })[]; busy: boolean; error?: string; retry: () => void; select: (book: ReadingBookSummary) => void;
  /** «Прочитана» / «Вернуть в чтение»: общий статус книги во всех челленджах и в профиле «Мои книги». */
  setFinished?: (key: string, finished: boolean) => Promise<boolean>; finishingKey?: string; finishError?: string;
};
export type ReadingShelfComposer = {
  draft: ReadingBookInput; supported: boolean; adding: boolean; error?: string;
  reset: () => void; save: () => Promise<boolean>;
};

/** «Что читаете» — постоянная полка и выбор книги подхода в одном блоке.
 * Выбранная книга подсвечена; добавление книги не меняет выбранный подход.
 * Пока подход открыт, видна только его книга: остальные и «Добавить книгу» — под «Другие книги · N». */
export function ReadingBookshelf({ library, composer, selectedKey, selectionLocked = false, disabled = false, purpose = 'next', changeLater = false }: {
  library: ReadingBookLibrary; composer?: ReadingShelfComposer; selectedKey?: string; selectionLocked?: boolean; disabled?: boolean;
  /** `next` — книга следующего подхода; `report` — после остановки таймера: какой книге записать этот подход. */
  purpose?: 'next' | 'report';
  /** Во время подхода: книгу можно будет сменить при записи страниц (сервер это поддерживает). */
  changeLater?: boolean;
}) {
  const { T, ty } = useTheme();
  const [editing, setEditing] = useState(false), [notice, setNotice] = useState('');
  const [othersOpen, setOthersOpen] = useState(false);
  const [saveError, setSaveError] = useState<string>();
  const submitting = useRef(false);
  const draft = composer?.draft;
  const active = library.books.filter(book => !book.finished);
  const finished = library.books.filter(book => book.finished);
  const selected = active.find(book => book.key === selectedKey);
  // Во время подхода выбор закреплён: показываем одну книгу, остальное свёрнуто (но доступно).
  const folded = selectionLocked && !!selected && !othersOpen && !editing;
  const others = active.length - (selected ? 1 : 0);
  const reporting = purpose === 'report';
  const pinned = selectionLocked && !!selected;
  const row = (book: typeof active[number]) => <ReadingBookSummaryRow key={book.key} book={book} selected={book.key === selectedKey}
    disabled={selectionLocked || disabled || !!composer?.adding} onSelect={() => library.select(book)}
    selectHint={reporting ? 'Сохранить этот подход для этой книги' : undefined} />;
  const canFinish = !reporting && !!library.setFinished && !!selected && selected.editable !== false && !selectionLocked && !disabled;
  const finish = (book: typeof active[number]) => Alert.alert('Книга прочитана?',
    `«${book.title}» уйдёт из «Что читаете» и отметится прочитанной в «Моих книгах» профиля. Вернуть её можно в разделе «Прочитанные».`, [
      { text: 'Отмена', style: 'cancel' },
      { text: 'Прочитана', onPress: () => { void library.setFinished?.(book.key, true); } },
    ]);
  const add = async () => {
    if (!composer?.supported || !draft?.verified || submitting.current || composer.adding || disabled) return;
    submitting.current = true;
    setSaveError(undefined);
    try {
      if (await composer.save()) { composer.reset(); setEditing(false); setNotice('Книга добавлена на полку. Остальные книги и выбранный подход не изменились.'); }
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Не удалось добавить книгу. Повторите попытку.');
    } finally { submitting.current = false; }
  };
  return <ContentBlock size="compact"><Wrapper gap={10}>
    <Wrapper gap={2}>
      <Text accessibilityRole="header" style={[ty.headline, { color: T.label }]}>{reporting ? 'Какую книгу вы читали?' : 'Что читаете'}</Text>
      <Text style={[ty.footnote, { color: T.labelSecondary }]}>{reporting
        ? 'Если на старте выбрали не ту книгу, отметьте нужную: время и страницы этого подхода сохранятся ей.'
        : selectionLocked ? changeLater ? 'Книга этого подхода. Если выбрали не ту, смените её при записи страниц.'
        : 'Книга этого подхода. Сменить можно после сохранения страниц.'
        : 'Время и страницы подхода сохранятся выбранной книге.'}</Text>
    </Wrapper>
    {library.error ? <InlineNotice message={library.error} onRetry={library.retry} /> : null}
    {library.finishError ? <InlineNotice message={library.finishError} /> : null}
    <Wrapper gap={4}>
      {(pinned && selected ? [selected] : active).map(row)}
      {pinned && (others > 0 || composer) ? <Pressable onPress={() => setOthersOpen(v => !v)} accessibilityRole="button"
        accessibilityState={{ expanded: !folded }} accessibilityLabel={`Другие книги: ${others}`}
        accessibilityHint="Показать остальные книги полки и добавление новой. Выбор книги подхода не изменится"
        style={({ pressed }) => [styles.toggle, { borderTopColor: T.separator, opacity: pressed ? 0.6 : 1 }]}>
        <Text style={[ty.subheadEm, styles.flex, { color: T.label }]}>Другие книги</Text>
        <Text style={[ty.subhead, nums, { color: T.labelSecondary }]}>{others}</Text>
        <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <SF name={folded ? 'chevron.down' : 'chevron.up'} size={13} color={T.labelTertiary} />
        </View>
      </Pressable> : null}
      {pinned && !folded ? active.filter(book => book !== selected).map(row) : null}
    </Wrapper>
    {!library.books.length ? <Text style={[ty.subhead, { color: T.labelSecondary }]}>{library.busy ? 'Загружаем вашу полку…' : 'Добавьте первую книгу. Она останется на полке, даже если вы начнёте другую.'}</Text>
      : !active.length ? <Text style={[ty.subhead, { color: T.labelSecondary }]}>Все книги на полке прочитаны. Добавьте следующую — или верните книгу из «Прочитанных».</Text> : null}
    {canFinish && selected ? <Button label="Дочитал(а) эту книгу" icon="checkmark.circle" variant="plain" size="compact"
      loading={library.finishingKey === selected.key} disabled={!!library.finishingKey}
      accessibilityHint={`Отметить «${selected.title}» прочитанной и убрать из «Что читаете»`} onPress={() => finish(selected)} /> : null}
    {notice ? <Text accessibilityLiveRegion="polite" style={[ty.footnoteEm, { color: T.greenText }]}>{notice}</Text> : null}
    {composer && !composer.supported && !library.busy ? <Text style={[ty.footnote, { color: T.labelSecondary }]}>Добавление книг на полку станет доступно после обновления сервера. Сохранённую историю можно читать сейчас.</Text> : null}
    {folded || reporting ? null : <ReadingFinishedBooks books={finished} busyKey={library.finishingKey} disabled={disabled}
      onReturn={library.setFinished ? key => { void library.setFinished?.(key, false); } : undefined} />}
    {folded ? null : composer && editing && draft ? <Wrapper gap={12}>
      <ReadingBookField purpose="add" title={draft.title} author={draft.author} status={draft.status} error={draft.error}
        locked={disabled || composer.adding} manual={draft.verified?.manual} suggestions={draft.suggestions}
        onChangeTitle={draft.setTitle} onChangeAuthor={draft.setAuthor} onCheck={draft.check} onEdit={draft.edit}
        onPick={draft.pick} onReject={draft.reject} onManual={draft.manual} />
      {composer.error || saveError ? <InlineNotice message={composer.error || saveError!} /> : null}
      <Button label="Добавить на полку" icon="plus" onPress={() => void add()} loading={composer.adding}
        disabled={disabled || !composer.supported || !draft.verified} />
      <Button label="Отмена добавления" variant="plain" disabled={disabled || composer.adding}
        onPress={() => { composer.reset(); setEditing(false); }} />
    </Wrapper> : composer ? <Button label="Добавить книгу" icon="plus" variant="plain" disabled={disabled || library.busy || !composer.supported}
      onPress={() => { composer.reset(); setNotice(''); setSaveError(undefined); setEditing(true); }} /> : null}
  </Wrapper></ContentBlock>;
}
const styles = StyleSheet.create({
  toggle: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: minTouch, borderTopWidth: StyleSheet.hairlineWidth },
  flex: { flex: 1, minWidth: 0 },
});
