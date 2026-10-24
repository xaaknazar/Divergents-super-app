import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { ReadingBookSummary } from '../data/reading';
import { fmtInt } from '../data/format';
import { useTheme } from '../theme/ThemeContext';
import { nums, radius } from '../theme/tokens';
import { SF } from './SFIcon';

/** One book, one accumulated result. Appearance is shared by today's diary and the book picker.
 * В выборе книги (onSelect) выбранная строка подсвечена и отмечена галочкой, остальные — пустым кружком. */
export function ReadingBookSummaryRow({ book, onSelect, disabled = false, selected = false }: {
  book: ReadingBookSummary; onSelect?: () => void; disabled?: boolean; selected?: boolean;
}) {
  const { T, ty } = useTheme();
  const minutes = Math.floor(book.elapsedMs / 60000);
  const time = minutes === 0 && book.elapsedMs > 0 ? 'меньше минуты' : `${fmtInt(minutes)} мин`;
  const picker = !!onSelect;
  const content = <>
    {book.coverId != null ? <Image source={{ uri: `https://covers.openlibrary.org/b/id/${book.coverId}-M.jpg` }}
      accessible={false} style={[styles.cover, picker && styles.smallCover, { backgroundColor: T.fillTertiary }]} />
      : <View accessible={false} style={[styles.cover, picker && styles.smallCover, styles.placeholder, { backgroundColor: selected ? T.cardBg : T.brandTinted }]}>
        <SF name="book.fill" size={picker ? 18 : 22} color={T.brandText} />
      </View>}
    <View style={styles.copy}>
      <Text style={[picker ? ty.subheadEm : ty.headline, { color: T.label }]}>{book.title}</Text>
      {book.author ? <Text style={[ty.footnote, { color: T.labelSecondary }]}>{book.author}</Text> : null}
      <View style={styles.meta}>
        <Text style={[picker ? ty.footnoteEm : ty.subheadEm, nums, { color: T.brandText }]}>{picker && book.pages === 0 && book.elapsedMs === 0 ? 'Ещё не начали' : `${fmtInt(book.pages)} стр. · ${time}`}</Text>
        {picker && book.nextPage != null ? <Text style={[ty.footnote, nums, { color: T.labelSecondary }]}>Со страницы {fmtInt(book.nextPage)}</Text> : null}
      </View>
    </View>
    {picker ? <SF name={selected ? 'checkmark.circle.fill' : 'circle'} size={22} color={selected ? T.brandText : T.labelTertiary} /> : null}
  </>;
  return onSelect ? <Pressable onPress={onSelect} disabled={disabled} accessibilityRole="button"
    accessibilityLabel={`Читать «${book.title}»${book.author ? `, ${book.author}` : ''}. ${fmtInt(book.pages)} страниц, ${time}${book.nextPage != null ? `. Со страницы ${book.nextPage}` : ''}`}
    accessibilityState={{ selected, disabled }} accessibilityHint="Выбрать книгу для следующего подхода"
    style={({ pressed }) => [styles.row, styles.pickerRow, selected && { backgroundColor: T.brandTinted },
      { opacity: disabled && !selected ? 0.5 : pressed ? 0.65 : 1 }]}>{content}</Pressable>
    : <View style={styles.row}>{content}</View>;
}
const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, minHeight: 72 },
  pickerRow: { paddingVertical: 10, paddingHorizontal: 10, minHeight: 64, borderRadius: radius.xl, borderCurve: 'continuous' },
  cover: { width: 40, height: 56, borderRadius: 6 },
  smallCover: { width: 34, height: 46, borderRadius: 5 },
  placeholder: { alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1, gap: 2 },
  meta: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 8, rowGap: 2, alignItems: 'baseline' },
});
