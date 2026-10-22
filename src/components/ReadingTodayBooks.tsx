import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ReadingBookSummary } from '../data/reading';
import { fmtInt } from '../data/format';
import { useTheme } from '../theme/ThemeContext';
import { ReadingBookSummaryRow } from './ReadingBookSummaryRow';

/** Only acknowledged pages/time from the current server day. Pending approaches stay out of totals. */
export function ReadingTodayBooks({ books }: { books: ReadingBookSummary[] }) {
  const { T, ty } = useTheme();
  const pages = books.reduce((sum, book) => sum + book.pages, 0);
  return <View>
    <Text accessibilityRole="header" style={[ty.subheadEm, { color: T.label }]}>Книги за сегодня</Text>
    {books.length ? <>
      {books.map(book => <ReadingBookSummaryRow key={book.key} book={book} />)}
      <Text style={[ty.footnoteEm, { color: T.labelSecondary }]}>Всего {fmtInt(pages)} стр. · сохранено на сервере</Text>
    </> : <Text style={[ty.footnote, styles.empty, { color: T.labelSecondary }]}>Здесь появятся книги и страницы после сохранения первого подхода.</Text>}
  </View>;
}
const styles = StyleSheet.create({ empty: { paddingTop: 8 } });
