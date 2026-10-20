import React from 'react';
import { Pressable } from 'react-native';
import { ReadingBookSelection, ReadingBookSearchView } from '../data/readingBooks';
import { ReadingField } from './ReadingField';
import { Wrapper } from './Wrapper';
import { Button } from './Button';
import { InlineNotice } from './InlineNotice';
import { ScreenDescription } from './ScreenDescription';
import { ReadingBookRow } from './ReadingBookRow';
export function ReadingBookPicker({ value, onChange, search, disabled }: {
  value: ReadingBookSelection; onChange: (value: ReadingBookSelection) => void; search?: ReadingBookSearchView; disabled: boolean;
}) {
  const query = `${value.title} ${value.author}`.trim();
  return <Wrapper gap={12}>
    <ReadingField label="Какую книгу читаете?" value={value.title} onChange={title => onChange({ title, author: value.author })} disabled={disabled} />
    <ReadingField label="Автор" value={value.author} onChange={author => onChange({ title: value.title, author })} disabled={disabled} required={false} />
    {value.key ? <ScreenDescription text="Книга выбрана из каталога. Название и автор сохранятся в истории." /> : null}
    {search ? <>
      <Button label="Найти книгу и обложку" variant="tinted" onPress={() => search.search(query)} disabled={disabled || query.length < 2 || search.busy} loading={search.busy} />
      {search.error ? <InlineNotice message={search.error} /> : null}
      {search.correctedQuery ? <ScreenDescription text={`Возможно, вы имели в виду: ${search.correctedQuery}. Выберите подходящую книгу.`} /> : null}
      {search.books.map(book => <Pressable key={book.key} accessibilityRole="button" accessibilityLabel={`Выбрать: ${book.title}, ${book.author}`} disabled={disabled}
        onPress={() => onChange(book)} style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}>
        <ReadingBookRow variant="option" title={book.title} author={book.author || null} coverId={book.coverId} />
      </Pressable>)}
      {search.error ? <Button label="Проверить опечатки с ИИ" variant="plain" disabled={disabled || search.busy || query.length < 2} onPress={() => search.search(query, true)} /> : null}
      <ScreenDescription text="Поиск в Open Library. При проверке опечаток ИИ получает только название и автора; выбор книги всегда за вами." />
    </> : null}
  </Wrapper>;
}
