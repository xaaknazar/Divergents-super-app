import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { days } from '../data/plural';
import { fmtDecimal } from '../data/format';
import { useTheme } from '../theme/ThemeContext';
import { nums } from '../theme/tokens';
import { SF } from './SFIcon';

/** Строка рейтинга индивидуального Reading challenge: место, имя, «N дней чтения», плашка «⚑ N»
 * (красная при N > 0, серая при 0) и справа средний темп «41 стр/день». Своя строка подсвечена и помечена «вы». */
export function ReadingRankRow({ place, name, readingDays, flags, pace, isMe = false, last = false, onPress }: {
  place: number; name: string; readingDays: number; flags: number;
  /** Средний темп, страниц в день. */
  pace: number; isMe?: boolean;
  last?: boolean;
  /** Открыть книги и историю участника. */
  onPress?: () => void;
}) {
  const { T, ty, isDark } = useTheme();
  const flagInk = flags > 0 ? T.redText : T.labelSecondary;
  const flagBg = flags > 0 ? (isDark ? 'rgba(255,69,58,0.18)' : 'rgba(197,34,31,0.10)') : T.fillTertiary;
  const paceLabel = `${fmtDecimal(pace)} стр/день`;
  const label = [`${place} место`, name, isMe ? 'это вы' : null,
    days(readingDays) + ' чтения', `красных флагов: ${flags}`, `средний темп ${paceLabel}`].filter(Boolean).join('. ');
  const body = <>
    <Text style={[ty.headline, nums, styles.place, { color: isMe ? T.labelSecondary : T.brandText }]}>{place}</Text>
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
    <View style={styles.value}>
      <Text style={[ty.headline, nums, { color: T.label }]}>{fmtDecimal(pace)}</Text>
      <Text style={[ty.caption1, { color: T.labelSecondary }]}>стр/день</Text>
    </View>
  </>;
  const surface = [styles.row, { backgroundColor: isMe ? T.brandTinted : T.cardBg, borderBottomWidth: last ? 0 : 0.5, borderBottomColor: T.separator }];
  return onPress ? <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} accessibilityHint="Открыть книги и историю"
    style={({ pressed }) => [surface, { opacity: pressed ? 0.7 : 1 }]}>{body}</Pressable>
    : <View accessible accessibilityLabel={label} style={surface}>{body}</View>;
}
const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16, gap: 12, minHeight: 64 },
  place: { minWidth: 28, textAlign: 'center' },
  main: { flex: 1, minWidth: 0, gap: 3 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  flag: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 999 },
  me: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  shrink: { flexShrink: 1 },
  value: { alignItems: 'flex-end' },
});
