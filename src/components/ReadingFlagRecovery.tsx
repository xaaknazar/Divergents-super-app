import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { ReadingFlagRecoveryState } from '../data/reading';
import { useTheme } from '../theme/ThemeContext';
import { nums, radius } from '../theme/tokens';
import { word } from '../data/plural';
import { SF } from './SFIcon';

/** Read-only server progress. Never infer forgiveness from a local timer. */
export function ReadingFlagRecovery({ flags, recovery }: { flags: number; recovery: ReadingFlagRecoveryState }) {
  const { T, ty } = useTheme();
  const active = flags > 0;
  const left = Math.max(0, recovery.requiredDays - recovery.progressDays);
  return <View style={[styles.panel, { backgroundColor: T.fillTertiary }]}>
    <View style={styles.heading}>
      <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <SF name="flag.fill" size={16} color={active ? T.redText : T.greenText} />
      </View>
      <Text accessibilityRole="header" style={[ty.subheadEm, styles.title, { color: T.label }]}>
        {active ? 'Снимите один красный флаг' : 'Красных флагов нет'}
      </Text>
      {active ? <Text style={[ty.subheadEm, nums, { color: T.brandText }]}>Дней подряд: {recovery.progressDays} из {recovery.requiredDays}</Text> : null}
    </View>
    {active ? <>
      <View accessible accessibilityRole="progressbar" accessibilityLabel="Серия для снятия одного красного флага"
        accessibilityValue={{ min: 0, max: recovery.requiredDays, now: recovery.progressDays }}
        style={[styles.track, { backgroundColor: T.fillSecondary }]}>
        <View style={[styles.fill, { backgroundColor: T.brandText, width: `${Math.min(100, recovery.progressDays / recovery.requiredDays * 100)}%` }]} />
      </View>
      <Text style={[ty.footnote, { color: T.labelSecondary }]}>Ещё {left} {word(left, 'день', 'дня', 'дней')} с часом чтения и сохранёнными страницами — и один флаг снимется. Пропуск начинает серию заново.</Text>
    </> : <Text style={[ty.footnote, { color: T.labelSecondary }]}>Если появится флаг, его можно снять за {recovery.requiredDays} дней чтения подряд. Списания не копятся на будущее.</Text>}
    {recovery.forgivenFlags > 0 ? <Text style={[ty.footnoteEm, { color: T.greenText }]}>Снято флагов за серии: {recovery.forgivenFlags}</Text> : null}
  </View>;
}
const styles = StyleSheet.create({
  panel: { paddingVertical: 12, paddingHorizontal: 14, borderRadius: radius.xl, borderCurve: 'continuous', gap: 8 },
  heading: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  title: { flex: 1, minWidth: 150 },
  track: { height: 6, borderRadius: 3, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 3 },
});
