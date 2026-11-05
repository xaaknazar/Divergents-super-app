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
      {/* Части «Reading · 96 стр. · 5 ч 12 мин» переносятся целиком: время не рвётся на «5 ч 12 / мин». */}
      <View style={styles.detail}>
        {detail.split(' · ').map((part, i, all) => <Text key={i} style={[ty.footnote, nums, { color: read ? T.greenText : T.brandText }]} numberOfLines={1}>
          {part}{i < all.length - 1 ? ' ·' : ''}
        </Text>)}
      </View>
    </View>
  </>;
  return <View style={styles.row}>
    {onPress ? <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`${title}${author ? `, ${author}` : ''}. ${detail}`}
      style={({ pressed }) => [styles.main, { opacity: pressed ? 0.6 : 1 }]}>{body}</Pressable>
      : <View accessible accessibilityLabel={`${title}${author ? `, ${author}` : ''}. ${detail}`} style={styles.main}>{body}</View>}
    {/* Действие, а не статус: зелёная «✓ Прочитана» у книги, которую ещё читают, выглядела как уже
        поставленная отметка. Короткое «Готово» в цвете приложения — кнопка, не отметка, и не отнимает
        ширину у названия; что именно произойдёт, говорит подсказка VoiceOver. */}
    {onToggleRead ? <Button label={read ? 'Вернуть' : 'Готово'} icon={read ? undefined : 'checkmark'} size="compact"
      variant={read ? 'plain' : 'tinted'} tone={read ? 'neutral' : 'brand'} loading={busy}
      accessibilityHint={read ? `Вернуть «${title}» в «Читаю»` : `Отметить «${title}» прочитанной — и в Reading-челленджах тоже`} onPress={onToggleRead} /> : null}
  </View>;
}
const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: 16, paddingRight: 10, paddingVertical: 8, minHeight: minTouch + 16 },
  main: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 12 },
  text: { flex: 1, minWidth: 0, gap: 1 },
  detail: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 4 },
});
