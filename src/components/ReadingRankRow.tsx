import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { days } from '../data/plural';
import { fmtDecimal, fmtInt } from '../data/format';
import type { ReadingRankingMetric } from '../data/reading';
import { useTheme } from '../theme/ThemeContext';
import { nums } from '../theme/tokens';
import { SF } from './SFIcon';

/** Оба результата видны всегда. metric определяет только визуальный акцент, не пересчитывает рейтинг.
 * Имя и числа могут переноситься: крупный шрифт не обрезает результат на узком экране. */
export function ReadingRankRow({ place, name, readingDays, flags, pace, pages, metric = 'pace', isMe = false, last = false, onPress }: {
  place: number; name: string; readingDays: number; flags: number;
  /** Средний темп, страниц в день. */
  pace: number;
  /** Все сохранённые страницы участника. */
  pages: number;
  metric?: ReadingRankingMetric;
  isMe?: boolean;
  last?: boolean;
  /** Открыть книги и историю участника. */
  onPress?: () => void;
}) {
  const { T, ty, isDark } = useTheme();
  const flagInk = flags > 0 ? T.redText : T.labelSecondary;
  const flagBg = flags > 0 ? (isDark ? 'rgba(255,69,58,0.18)' : 'rgba(197,34,31,0.10)') : T.fillTertiary;
  const paceLabel = `${fmtDecimal(pace)} стр/день`;
  const pagesLabel = fmtInt(pages);
  const primary = metric === 'pages' ? pagesLabel : fmtDecimal(pace);
  const primaryUnit = metric === 'pages' ? 'страниц всего' : 'стр/день';
  const secondary = metric === 'pages' ? `Средний темп: ${paceLabel}` : `Всего прочитано: ${pagesLabel} стр.`;
  const label = [`${place} место`, name, isMe ? 'это вы' : null,
    days(readingDays) + ' чтения', `красных флагов: ${flags}`, `всего прочитано ${pagesLabel} страниц`,
    `средний темп ${paceLabel}`].filter(Boolean).join('. ');
  const body = <>
    <View style={styles.heading}>
      <Text style={[ty.headline, nums, styles.place, { color: isMe ? T.labelSecondary : T.brandText }]}>{fmtInt(place)}</Text>
      <View style={styles.main}>
        <View style={styles.nameRow}>
          <Text style={[ty.headline, styles.shrink, { color: T.label }]}>{name}</Text>
          {isMe ? <View style={[styles.me, { backgroundColor: T.brand }]}><Text style={[ty.caption2Em, { color: T.onBrand }]}>вы</Text></View> : null}
        </View>
        <View style={styles.metaRow}>
          <Text style={[ty.footnote, nums, { color: T.labelSecondary }]}>{days(readingDays)} чтения</Text>
          <View style={[styles.flag, { backgroundColor: flagBg }]}>
            <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants"><SF name="flag.fill" size={11} color={flagInk} /></View>
            <Text style={[ty.footnoteEm, nums, { color: flagInk }]}>{flags}</Text>
          </View>
        </View>
      </View>
    </View>
    <View style={styles.value}>
      <Text style={[ty.title3, nums, styles.result, { color: T.label }]}>{primary}{' '}
        <Text style={[ty.footnote, { color: T.labelSecondary }]}>{primaryUnit}</Text>
      </Text>
      <Text style={[ty.footnote, nums, styles.result, { color: T.labelSecondary }]}>{secondary}</Text>
    </View>
  </>;
  const surface = [styles.row, { backgroundColor: isMe ? T.brandTinted : T.cardBg, borderBottomWidth: last ? 0 : 0.5, borderBottomColor: T.separator }];
  return onPress ? <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} accessibilityHint="Открыть книги и историю"
    style={({ pressed }) => [surface, { opacity: pressed ? 0.7 : 1 }]}>{body}</Pressable>
    : <View accessible accessibilityLabel={label} style={surface}>{body}</View>;
}
const styles = StyleSheet.create({
  row: { paddingVertical: 12, paddingHorizontal: 16, gap: 10, minHeight: 64 },
  heading: { flexDirection: 'row', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 },
  place: { minWidth: 28, maxWidth: '100%', textAlign: 'center', flexShrink: 1 },
  main: { flex: 1, minWidth: 0, gap: 3 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  flag: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 999 },
  me: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  shrink: { flexShrink: 1 },
  value: { gap: 3, alignSelf: 'stretch' },
  result: { textAlign: 'right', flexShrink: 1 },
});
