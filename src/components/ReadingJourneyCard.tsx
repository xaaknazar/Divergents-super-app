import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ReadingPeriod } from '../data/reading';
import { useTheme } from '../theme/ThemeContext';
import { radius } from '../theme/tokens';
import { SF } from './SFIcon';
export function ReadingJourneyCard({ period, completed, onPress }: { period?: ReadingPeriod; completed: boolean; onPress?: () => void }) {
  const { T, ty } = useTheme();
  return <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={completed ? 'Итоги года чтения' : 'Статистика чтения'}
    style={({ pressed }) => [styles.card, { backgroundColor: T.cardBg, borderColor: T.cardBorder, opacity: pressed ? 0.75 : 1 }]}>
    <View style={styles.row}>
      <SF name={completed ? 'trophy.fill' : 'chart.bar.fill'} size={22} color={T.brandText} />
      <View style={styles.copy}>
        <Text style={[ty.headline, { color: T.label }]}>{completed ? 'Ваш год чтения завершён' : 'Статистика'}</Text>
        <Text style={[ty.footnote, { color: T.labelSecondary }]}>{completed ? 'Итоги, книги и карточки для сторис' : period ? `День ${period.personalDay} из ${period.totalDays} · ваш год чтения` : 'Мой прогресс и карточки для сторис'}</Text>
      </View>
      <SF name="chevron.right" size={14} color={T.labelSecondary} />
    </View>
    {period ? <View accessible accessibilityLabel={`Пройдено ${period.personalDay} из ${period.totalDays} дней`} style={[styles.track, { backgroundColor: T.fillTertiary }]}>
      <View style={[styles.fill, { backgroundColor: T.brandText, width: `${Math.min(100, period.personalDay / period.totalDays * 100)}%` }]} />
    </View> : null}
  </Pressable>;
}
const styles = StyleSheet.create({ card: { borderRadius: radius.block, borderWidth: 1, padding: 16, gap: 16 }, row: { flexDirection: 'row', gap: 12, alignItems: 'center' }, copy: { flex: 1, gap: 5 }, track: { height: 5, borderRadius: 3, overflow: 'hidden' }, fill: { height: 5 } });
