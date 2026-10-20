import React from 'react';
import { Image, Text } from 'react-native';
import { ReadingHistory } from '../data/readingBooks';
import { useTheme } from '../theme/ThemeContext';
import { ContentBlock } from './ContentBlock';
import { Wrapper } from './Wrapper';
import { StatusBadge } from './StatusBadge';
import { Button } from './Button';
export function ReadingBookHistoryCard({ book, busy, onStatus }: {
  book: ReadingHistory['books'][number]; busy: boolean; onStatus?: (finished: boolean) => void;
}) {
  const { T, ty } = useTheme();
  return <ContentBlock><Wrapper gap={14}>
    <Wrapper dir="row" gap={14} align="flex-start">
      {book.coverId ? <Image source={{ uri: `https://covers.openlibrary.org/b/id/${book.coverId}-M.jpg` }} accessible={false}
        style={{ width: 56, height: 82, borderRadius: 8, backgroundColor: T.fillTertiary }} /> : null}
      <Wrapper flex={1} gap={6}>
        <Text accessibilityRole="header" style={[ty.headline, { color: T.label }]}>{book.title}</Text>
        <Text style={[ty.subhead, { color: T.labelSecondary }]}>{book.author || 'Автор не указан'}</Text>
        <StatusBadge label={book.finished ? 'Прочитана' : 'В процессе'} tone={book.finished ? 'success' : 'brand'} />
      </Wrapper>
    </Wrapper>
    <Text style={[ty.subheadEm, { color: T.label }]}>{book.pages.toLocaleString('ru-RU')} стр. · {Math.floor(book.elapsedMs / 60000)} мин чтения</Text>
    {book.nextPage != null ? <Text style={[ty.subhead, { color: T.labelSecondary }]}>Продолжить со страницы {book.nextPage}</Text> : null}
    <Text style={[ty.footnote, { color: T.labelSecondary }]}>Последнее чтение: {new Date(book.lastReadAt).toLocaleDateString('ru-RU', { timeZone: 'Asia/Almaty' })}</Text>
    {onStatus && book.editable ? <Button label={book.finished ? 'Вернуть в чтение' : 'Отметить книгу прочитанной'} variant="tinted" disabled={busy} onPress={() => onStatus(!book.finished)} /> : null}
  </Wrapper></ContentBlock>;
}
