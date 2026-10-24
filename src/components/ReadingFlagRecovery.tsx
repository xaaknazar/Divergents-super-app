import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { ReadingFlagRecoveryState } from '../data/reading';
import { useTheme } from '../theme/ThemeContext';
import { nums, radius } from '../theme/tokens';

/** Read-only server progress. Never infer forgiveness from a local timer. */
export function ReadingFlagRecovery({ flags, recovery }: { flags: number; recovery: ReadingFlagRecoveryState }) {
  const { T, ty } = useTheme();
  const active = flags > 0;
  return <View style={[styles.panel, { backgroundColor: T.fillTertiary }]}>
    <Text accessibilityRole="header" style={[ty.headline, { color: T.label }]}>
      {active ? 'Снимите один красный флаг' : 'Красных флагов нет'}
    </Text>
    {active ? <>
      <Text style={[ty.body, nums, { color: T.brandText }]}>Дней подряд: {recovery.progressDays} из {recovery.requiredDays}</Text>
      <View accessible accessibilityRole="progressbar" accessibilityLabel="Серия для снятия одного красного флага"
        accessibilityValue={{ min: 0, max: recovery.requiredDays, now: recovery.progressDays }}
        style={[styles.track, { backgroundColor: T.fillSecondary }]}>
        <View style={[styles.fill, { backgroundColor: T.brandText, width: `${Math.min(100, recovery.progressDays / recovery.requiredDays * 100)}%` }]} />
      </View>
      <Text style={[ty.body, { color: T.labelSecondary }]}>Читайте минимум 60 минут и сохраняйте страницы каждый день. За {recovery.requiredDays} дней подряд снимается один флаг. Пропуск начинает серию заново.</Text>
    </> : <Text style={[ty.body, { color: T.labelSecondary }]}>Если появится флаг, его можно снять за {recovery.requiredDays} дней чтения подряд. Списания не копятся на будущее.</Text>}
    {recovery.forgivenFlags > 0 ? <Text style={[ty.footnoteEm, { color: T.greenText }]}>Снято флагов за серии: {recovery.forgivenFlags}</Text> : null}
  </View>;
}
const styles = StyleSheet.create({
  panel: { padding: 14, borderRadius: radius.block, gap: 10 },
  track: { height: 6, borderRadius: 3, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 3 },
});
