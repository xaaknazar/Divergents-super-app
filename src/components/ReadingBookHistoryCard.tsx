import React from 'react';
import { Image, Text } from 'react-native';
import { ReadingHistory, ReadingShelfBook } from '../data/readingBooks';
import { useTheme } from '../theme/ThemeContext';
import { ContentBlock } from './ContentBlock';
import { Wrapper } from './Wrapper';
import { StatusBadge } from './StatusBadge';
import { Button } from './Button';
import { fmtDate, fmtInt } from '../data/format';
export function ReadingBookHistoryCard({ book, busy, updating = false, onStatus }: {
  book: ReadingHistory['books'][number] | ReadingShelfBook; busy: boolean; updating?: boolean; onStatus?: (finished: boolean) => void;
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
    <Text style={[ty.subheadEm, { color: T.label }]}>{fmtInt(book.pages)} стр. · {Math.floor(book.elapsedMs / 60000)} мин чтения</Text>
    {!book.finished && book.nextPage != null ? <Text style={[ty.subhead, { color: T.labelSecondary }]}>Продолжить со страницы {book.nextPage}</Text> : null}
    <Text style={[ty.footnote, { color: T.labelSecondary }]}>{book.lastReadAt
      ? `Последнее чтение: ${fmtDate(book.lastReadAt, { timeZone: 'Asia/Almaty' })}` : 'Пока нет сохранённых подходов'}</Text>
    {onStatus && book.editable ? <Button label={book.finished ? 'Вернуть в чтение' : 'Отметить книгу прочитанной'} variant="tinted"
      loading={updating} disabled={busy && !updating}
      accessibilityHint={book.finished ? 'Книга снова появится под таймером. Сохранённые страницы и время останутся.' : 'Переместить книгу в «Прочитано», сохранив все страницы и время'}
      onPress={() => onStatus(!book.finished)} /> : null}
  </Wrapper></ContentBlock>;
}
