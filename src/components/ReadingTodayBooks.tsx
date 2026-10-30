import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ReadingBookSummary } from '../data/reading';
import { fmtInt } from '../data/format';
import { useTheme } from '../theme/ThemeContext';
import { nums } from '../theme/tokens';

/** Only acknowledged pages/time from the current server day. Pending approaches stay out of totals.
 * Компактно: одна строка на книгу — полка с обложками уже показана выше на экране. */
export function ReadingTodayBooks({ books }: { books: ReadingBookSummary[] }) {
  const { T, ty } = useTheme();
  const pages = books.reduce((sum, book) => sum + book.pages, 0);
  return <View style={styles.root}>
    <Text accessibilityRole="header" style={[ty.subheadEm, { color: T.label }]}>Книги за сегодня</Text>
    {books.length ? <>
      {books.map(book => {
        const minutes = Math.floor(book.elapsedMs / 60000);
        const time = minutes === 0 && book.elapsedMs > 0 ? 'меньше минуты' : `${fmtInt(minutes)} мин`;
        return <View key={book.key} accessible accessibilityLabel={`${book.title}: ${fmtInt(book.pages)} страниц, ${time}`} style={styles.row}>
          <Text style={[ty.subhead, styles.title, { color: T.label }]} numberOfLines={2}>{book.title}</Text>
          <Text style={[ty.subheadEm, nums, { color: T.brandText }]}>{fmtInt(book.pages)} стр. · {time}</Text>
        </View>;
      })}
      <Text style={[ty.footnote, { color: T.labelSecondary }]}>Всего {fmtInt(pages)} стр. · сохранено на сервере</Text>
    </> : <Text style={[ty.footnote, { color: T.labelSecondary }]}>Здесь появятся книги и страницы после сохранения первого подхода.</Text>}
  </View>;
}
const styles = StyleSheet.create({
  root: { gap: 8 },
  row: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' },
  title: { flex: 1, minWidth: 140 },
});
