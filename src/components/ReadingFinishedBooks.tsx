import React, { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { minTouch, nums } from '../theme/tokens';
import { Button } from './Button';
import { SF } from './SFIcon';

export type ReadingFinishedBook = { key: string; title: string; author: string; coverId: number | null };

/** «Прочитанные» под полкой «Что читаете»: свёрнуты, чтобы не мешать выбору; книгу можно вернуть в чтение. */
export function ReadingFinishedBooks({ books, busyKey, disabled = false, onReturn }: {
  books: ReadingFinishedBook[]; busyKey?: string; disabled?: boolean; onReturn?: (key: string) => void;
}) {
  const { T, ty } = useTheme();
  const [open, setOpen] = useState(false);
  if (!books.length) return null;
  return <View style={[styles.box, { borderTopColor: T.separator }]}>
    <Pressable onPress={() => setOpen(v => !v)} accessibilityRole="button" accessibilityState={{ expanded: open }}
      accessibilityLabel={`Прочитанные книги: ${books.length}`} style={({ pressed }) => [styles.toggle, { opacity: pressed ? 0.6 : 1 }]}>
      <SF name="checkmark.circle.fill" size={18} color={T.greenText} />
      <Text style={[ty.subheadEm, styles.flex, { color: T.label }]}>Прочитанные</Text>
      <Text style={[ty.subhead, nums, { color: T.labelSecondary }]}>{books.length}</Text>
      <SF name={open ? 'chevron.up' : 'chevron.down'} size={13} color={T.labelTertiary} />
    </Pressable>
    {open ? books.map(book => <View key={book.key} style={styles.row}>
      {book.coverId != null ? <Image accessible={false} source={{ uri: `https://covers.openlibrary.org/b/id/${book.coverId}-M.jpg` }}
        style={[styles.cover, { backgroundColor: T.fillTertiary }]} />
        : <View style={[styles.cover, styles.placeholder, { backgroundColor: T.fillTertiary }]}><SF name="book.fill" size={14} color={T.labelTertiary} /></View>}
      <View style={styles.flex}>
        <Text style={[ty.subheadEm, { color: T.labelSecondary }]}>{book.title}</Text>
        {book.author ? <Text style={[ty.footnote, { color: T.labelTertiary }]}>{book.author}</Text> : null}
      </View>
      {onReturn ? <Button label="Вернуть" size="compact" variant="plain" loading={busyKey === book.key} disabled={disabled || !!busyKey}
        accessibilityHint={`Вернуть «${book.title}» в «Что читаете»`} onPress={() => onReturn(book.key)} /> : null}
    </View>) : null}
  </View>;
}
const styles = StyleSheet.create({
  box: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 4 },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: minTouch },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56 },
  cover: { width: 30, height: 42, borderRadius: 5 },
  placeholder: { alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1, minWidth: 0 },
});
