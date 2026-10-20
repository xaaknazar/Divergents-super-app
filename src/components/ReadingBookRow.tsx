import React from 'react';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { radius } from '../theme/tokens';
import { SF } from './SFIcon';

/** Текущая книга: без выдуманной обложки — заглушка-корешок, если обложки нет; название и
 * «автор · страница», когда они известны. «Сменить» — только если смена доступна. */
export function ReadingBookRow({ title, author, page, coverId, variant = 'card', onChange }: {
  title: string; author?: string | null;
  /** Текущая страница (или с которой начнём). */
  page?: number | null;
  /** Обложка Open Library — только настоящая, выбранная человеком. */
  coverId?: number | null;
  /** card — отдельный белый блок; option — вариант в результатах поиска. */
  variant?: 'card' | 'option';
  onChange?: () => void;
}) {
  const { T, ty } = useTheme();
  const meta = author ? [author, page != null ? `Страница ${page}` : null].filter(Boolean).join(' · ')
    : page != null ? `Начнём со страницы ${page}` : 'Автор не указан';
  const body = <>
    {coverId ? <Image source={{ uri: `https://covers.openlibrary.org/b/id/${coverId}-M.jpg` }} accessible={false}
      style={[styles.cover, { backgroundColor: T.fillSecondary }]} contentFit="cover" />
      : <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[styles.spine, { backgroundColor: T.brandTinted, borderLeftColor: T.brandText }]}>
        <SF name="book.fill" size={18} color={T.brandText} />
      </View>}
    <View style={styles.copy}>
      <Text numberOfLines={2} style={[ty.headline, { color: T.label }]}>{title}</Text>
      <Text numberOfLines={1} style={[ty.footnote, { color: T.labelSecondary }]}>{meta}</Text>
    </View>
  </>;
  return <View style={[styles.row, variant === 'card' ? [styles.card, { backgroundColor: T.cardBg, borderColor: T.cardBorder }] : { backgroundColor: T.fillTertiary, borderRadius: radius.block }]}>
    {body}
    {onChange && variant === 'card' ? <Pressable onPress={onChange} accessibilityRole="button" accessibilityLabel={`Сменить книгу: ${title}`}
      style={({ pressed }) => [styles.action, { opacity: pressed ? 0.6 : 1 }]}>
      <Text style={[ty.subheadEm, { color: T.brandText }]}>Сменить</Text>
    </Pressable> : null}
  </View>;
}
const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 },
  card: { borderRadius: radius.block, borderCurve: 'continuous', borderWidth: 1, paddingLeft: 14 },
  cover: { width: 34, height: 48, borderRadius: 4 },
  spine: { width: 34, height: 48, borderRadius: 4, borderLeftWidth: 3, alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1, minWidth: 0, gap: 2 },
  action: { minHeight: 48, minWidth: 48, justifyContent: 'center', paddingLeft: 4 },
});
