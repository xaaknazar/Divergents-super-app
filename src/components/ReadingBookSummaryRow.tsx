import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { ReadingBookSummary } from '../data/reading';
import { fmtInt } from '../data/format';
import { useTheme } from '../theme/ThemeContext';
import { SF } from './SFIcon';

/** One book, one accumulated result. Appearance is shared by today's diary and the book picker. */
export function ReadingBookSummaryRow({ book, onSelect, disabled = false, selected = false }: {
  book: ReadingBookSummary; onSelect?: () => void; disabled?: boolean; selected?: boolean;
}) {
  const { T, ty } = useTheme();
  const minutes = Math.floor(book.elapsedMs / 60000);
  const time = minutes === 0 && book.elapsedMs > 0 ? 'меньше минуты' : `${fmtInt(minutes)} мин`;
  const content = <>
    {book.coverId != null ? <Image source={{ uri: `https://covers.openlibrary.org/b/id/${book.coverId}-M.jpg` }}
      accessible={false} style={[styles.cover, { backgroundColor: T.fillTertiary }]} />
      : <View accessible={false} style={[styles.cover, styles.placeholder, { backgroundColor: T.brandTinted }]}>
        <SF name="book.closed.fill" size={22} color={T.brandText} />
      </View>}
    <View style={styles.copy}>
      <Text style={[ty.headline, { color: T.label }]}>{book.title}</Text>
      {book.author ? <Text style={[ty.footnote, { color: T.labelSecondary }]}>{book.author}</Text> : null}
      <Text style={[ty.subheadEm, { color: T.brandText }]}>{onSelect && book.pages === 0 && book.elapsedMs === 0 ? 'Ещё не начали' : `${fmtInt(book.pages)} стр. · ${time}`}</Text>
      {onSelect && book.nextPage != null ? <Text style={[ty.footnote, { color: T.labelSecondary }]}>Со страницы {fmtInt(book.nextPage)}</Text> : null}
    </View>
    {onSelect ? <SF name={selected ? 'checkmark.circle.fill' : 'chevron.right'} size={18} color={T.brandText} /> : null}
  </>;
  return onSelect ? <Pressable onPress={onSelect} disabled={disabled} accessibilityRole="button"
    accessibilityLabel={`Читать «${book.title}»${book.author ? `, ${book.author}` : ''}. ${fmtInt(book.pages)} страниц, ${time}${book.nextPage != null ? `. Со страницы ${book.nextPage}` : ''}`}
    accessibilityState={{ selected, disabled }} accessibilityHint="Выбрать книгу для следующего подхода"
    style={({ pressed }) => [styles.row, { opacity: disabled ? 0.5 : pressed ? 0.65 : 1 }]}>{content}</Pressable>
    : <View style={styles.row}>{content}</View>;
}
const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, minHeight: 72 },
  cover: { width: 40, height: 56, borderRadius: 6 },
  placeholder: { alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1, gap: 3 },
});
