import React from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import { ReadingBookSelection, ReadingBookSearchView } from '../data/readingBooks';
import { useTheme } from '../theme/ThemeContext';
import { ReadingField } from './ReadingField';
import { Wrapper } from './Wrapper';
import { Button } from './Button';
import { InlineNotice } from './InlineNotice';
import { ScreenDescription } from './ScreenDescription';
export function ReadingBookPicker({ value, onChange, search, disabled }: {
  value: ReadingBookSelection; onChange: (value: ReadingBookSelection) => void; search?: ReadingBookSearchView; disabled: boolean;
}) {
  const { T, ty } = useTheme();
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
        onPress={() => onChange(book)} style={({ pressed }) => ({ padding: 12, borderRadius: 16, gap: 12, flexDirection: 'row', alignItems: 'center', backgroundColor: T.fillTertiary, opacity: pressed ? 0.7 : 1 })}>
        {book.coverId ? <Image source={{ uri: `https://covers.openlibrary.org/b/id/${book.coverId}-M.jpg` }} accessibilityIgnoresInvertColors accessible={false}
          style={{ width: 44, height: 64, borderRadius: 6, backgroundColor: T.fillSecondary }} /> : null}
        <View style={{ flex: 1, gap: 4 }}><Text style={[ty.subheadEm, { color: T.label }]}>{book.title}</Text><Text style={[ty.footnote, { color: T.labelSecondary }]}>{book.author || 'Автор не указан'}</Text></View>
      </Pressable>)}
      {search.error ? <Button label="Проверить опечатки с ИИ" variant="plain" disabled={disabled || search.busy || query.length < 2} onPress={() => search.search(query, true)} /> : null}
      <ScreenDescription text="Поиск в Open Library. При проверке опечаток ИИ получает только название и автора; выбор книги всегда за вами." />
    </> : null}
  </Wrapper>;
}
