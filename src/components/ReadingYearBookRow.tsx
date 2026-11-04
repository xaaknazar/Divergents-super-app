import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { fmtInt } from '../data/format';
import { useTheme } from '../theme/ThemeContext';
import { nums, radius } from '../theme/tokens';
import { SF } from './SFIcon';

/** Книга года: обложка, название, автор, итог и статус «Прочитана» / «Читаю · со стр. N». */
export function ReadingYearBookRow({ book }: { book: { key: string; title: string; author: string; coverId: number | null; pages: number;
  elapsedMs: number; finished: boolean; nextPage?: number | null } }) {
  const { T, ty } = useTheme();
  const hours = book.elapsedMs / 3_600_000;
  const time = hours >= 1 ? `${fmtInt(Math.round(hours))} ч` : `${Math.floor(book.elapsedMs / 60000)} мин`;
  return <View style={styles.row} accessible
    accessibilityLabel={`${book.title}${book.author ? `, ${book.author}` : ''}. ${book.finished ? 'Прочитана' : 'Читаю'}. ${fmtInt(book.pages)} страниц, ${time}`}>
    {book.coverId != null ? <Image source={{ uri: `https://covers.openlibrary.org/b/id/${book.coverId}-M.jpg` }} style={[styles.cover, { backgroundColor: T.fillTertiary }]} />
      : <View style={[styles.cover, styles.placeholder, { backgroundColor: book.finished ? T.emeraldBadgeBg : T.brandTinted }]}>
        <SF name="book.fill" size={18} color={book.finished ? T.greenText : T.brandText} />
      </View>}
    <View style={styles.copy}>
      <Text style={[ty.headline, { color: T.label }]}>{book.title}</Text>
      {book.author ? <Text style={[ty.footnote, { color: T.labelSecondary }]}>{book.author}</Text> : null}
      <View style={styles.meta}>
        <View style={[styles.pill, { backgroundColor: book.finished ? T.emeraldBadgeBg : T.brandTinted }]}>
          <Text style={[ty.caption2, { color: book.finished ? T.greenText : T.brandText }]}>{book.finished ? 'Прочитана' : book.nextPage ? `Читаю · стр. ${fmtInt(book.nextPage)}` : 'Читаю'}</Text>
        </View>
        <Text style={[ty.footnote, nums, { color: T.labelSecondary }]}>{fmtInt(book.pages)} стр. · {time}</Text>
      </View>
    </View>
  </View>;
}
const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cover: { width: 40, height: 56, borderRadius: 6 },
  placeholder: { alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1, minWidth: 0, gap: 2 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 4 },
  pill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.pill },
});
