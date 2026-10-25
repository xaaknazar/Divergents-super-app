import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { minTouch, nums } from '../theme/tokens';
import { BookThumb } from './BookThumb';
import { Button } from './Button';

/** Книга в «Моих книгах»: обложка, название, откуда она (библиотека или Reading) и отметка «Прочитана». */
export function MyBookRow({ title, author, cover, detail, read, busy = false, onPress, onToggleRead }: {
  title: string; author?: string; cover?: string | null; detail: string; read: boolean; busy?: boolean;
  onPress?: () => void; onToggleRead?: () => void;
}) {
  const { T, ty } = useTheme();
  const body = <>
    <BookThumb uri={cover} />
    <View style={styles.text}>
      <Text style={[ty.subheadEm, { color: T.label }]} numberOfLines={2}>{title}</Text>
      {author ? <Text style={[ty.footnote, { color: T.labelSecondary }]} numberOfLines={1}>{author}</Text> : null}
      <Text style={[ty.footnote, nums, { color: read ? T.greenText : T.brandText }]} numberOfLines={2}>{detail}</Text>
    </View>
  </>;
  return <View style={styles.row}>
    {onPress ? <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`${title}${author ? `, ${author}` : ''}. ${detail}`}
      style={({ pressed }) => [styles.main, { opacity: pressed ? 0.6 : 1 }]}>{body}</Pressable>
      : <View accessible accessibilityLabel={`${title}${author ? `, ${author}` : ''}. ${detail}`} style={styles.main}>{body}</View>}
    {onToggleRead ? <Button label={read ? 'Вернуть' : 'Прочитана'} icon={read ? undefined : 'checkmark'} size="compact"
      variant={read ? 'plain' : 'tinted'} tone={read ? 'neutral' : 'success'} loading={busy}
      accessibilityHint={read ? `Вернуть «${title}» в «Читаю»` : `Отметить «${title}» прочитанной — и в Reading-челленджах тоже`} onPress={onToggleRead} /> : null}
  </View>;
}
const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: 16, paddingRight: 10, paddingVertical: 8, minHeight: minTouch + 16 },
  main: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 12 },
  text: { flex: 1, minWidth: 0, gap: 1 },
});
