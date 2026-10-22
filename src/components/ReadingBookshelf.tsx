import React, { useRef, useState } from 'react';
import { Text } from 'react-native';
import { ReadingBookSummary } from '../data/reading';
import { useTheme } from '../theme/ThemeContext';
import { Button } from './Button';
import { ContentBlock } from './ContentBlock';
import { Wrapper } from './Wrapper';
import { InlineNotice } from './InlineNotice';
import { ReadingBookField, ReadingBookInput } from './ReadingBookField';
import { ReadingBookSummaryRow } from './ReadingBookSummaryRow';

export type ReadingBookLibrary = {
  books: ReadingBookSummary[]; busy: boolean; error?: string; retry: () => void; select: (book: ReadingBookSummary) => void;
};
export type ReadingShelfComposer = {
  draft: ReadingBookInput; supported: boolean; adding: boolean; error?: string;
  reset: () => void; save: () => Promise<boolean>;
};

/** A permanent shelf, not a replacement editor. Adding a book never changes the selected approach book. */
export function ReadingBookshelf({ library, composer, selectedKey, selectionLocked = false, disabled = false }: {
  library: ReadingBookLibrary; composer?: ReadingShelfComposer; selectedKey?: string; selectionLocked?: boolean; disabled?: boolean;
}) {
  const { T, ty } = useTheme();
  const [editing, setEditing] = useState(false), [notice, setNotice] = useState('');
  const [saveError, setSaveError] = useState<string>();
  const submitting = useRef(false);
  const draft = composer?.draft;
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
  return <ContentBlock><Wrapper gap={12}>
    <Text accessibilityRole="header" style={[ty.title3, { color: T.label }]}>Моя книжная полка</Text>
    <Text style={[ty.footnote, { color: T.labelSecondary }]}>Добавляйте несколько книг и читайте их параллельно. Для одного подхода выберите одну книгу — страницы и время сохранятся именно ей.</Text>
    {library.error ? <InlineNotice message={library.error} onRetry={library.retry} /> : null}
    {library.books.map(book => <ReadingBookSummaryRow key={book.key} book={book} selected={book.key === selectedKey}
      disabled={selectionLocked || disabled || !!composer?.adding} onSelect={() => library.select(book)} />)}
    {!library.books.length ? <Text style={[ty.subhead, { color: T.labelSecondary }]}>{library.busy ? 'Загружаем вашу полку…' : 'Добавьте первую книгу. Она останется на полке, даже если вы начнёте другую.'}</Text> : null}
    {selectionLocked ? <Text style={[ty.footnote, { color: T.labelSecondary }]}>Книга текущего подхода закреплена. Выбрать другую можно после сохранения страниц.</Text> : null}
    {notice ? <Text accessibilityLiveRegion="polite" style={[ty.footnoteEm, { color: T.greenText }]}>{notice}</Text> : null}
    {composer && !composer.supported && !library.busy ? <Text style={[ty.footnote, { color: T.labelSecondary }]}>Добавление книг на полку станет доступно после обновления сервера. Сохранённую историю можно читать сейчас.</Text> : null}
    {composer && editing && draft ? <Wrapper gap={12}>
      <ReadingBookField purpose="add" title={draft.title} author={draft.author} status={draft.status} error={draft.error}
        locked={disabled || composer.adding} manual={draft.verified?.manual} suggestions={draft.suggestions}
        onChangeTitle={draft.setTitle} onChangeAuthor={draft.setAuthor} onCheck={draft.check} onEdit={draft.edit}
        onPick={draft.pick} onReject={draft.reject} onManual={draft.manual} />
      {composer.error || saveError ? <InlineNotice message={composer.error || saveError!} /> : null}
      <Button label="Добавить на полку" icon="plus" onPress={() => void add()} loading={composer.adding}
        disabled={disabled || !composer.supported || !draft.verified} />
      <Button label="Отмена добавления" variant="plain" disabled={disabled || composer.adding}
        onPress={() => { composer.reset(); setEditing(false); }} />
    </Wrapper> : composer ? <Button label="Добавить книгу" icon="plus" variant="tinted" disabled={disabled || library.busy || !composer.supported}
      onPress={() => { composer.reset(); setNotice(''); setSaveError(undefined); setEditing(true); }} /> : null}
  </Wrapper></ContentBlock>;
}
