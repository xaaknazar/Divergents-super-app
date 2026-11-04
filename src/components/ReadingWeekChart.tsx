import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { READING_WEEKDAYS, readingPersonalDate, readingWeekday } from '../data/readingCalendar';
import type { ReadingDetail } from '../data/reading';
import { useTheme } from '../theme/ThemeContext';
import { nums } from '../theme/tokens';

type Entry = NonNullable<ReadingDetail['me']>['history'][number];
const HEIGHT = 120;
/** Последние 7 дней столбиками: высота — минуты, линия — дневная норма, под столбиком — день недели и страницы. */
export function ReadingWeekChart({ days, firstDay, startsAt, targetMinutes = 60 }: {
  days: Entry[]; firstDay: number; startsAt?: number; targetMinutes?: number;
}) {
  const { T, ty } = useTheme();
  const minutes = days.map(d => Math.floor(d.elapsedMs / 60000));
  const top = Math.max(targetMinutes * 1.5, ...minutes);
  const goal = HEIGHT * targetMinutes / top;
  const met = days.filter(d => d.state === 'complete').length;
  return <View accessible accessibilityRole="image"
    accessibilityLabel={`Последние ${days.length} дней: норма выполнена в ${met}. ${days.map((d, i) => `${minutes[i]} мин, ${d.pages} стр.`).join('; ')}`}>
    <View style={[styles.plot, { height: HEIGHT }]}>
      <View style={[styles.goal, { bottom: goal, borderColor: T.labelTertiary }]} />
      <Text style={[ty.caption2, nums, styles.goalLabel, { bottom: goal + 2, color: T.labelSecondary }]}>{targetMinutes} мин</Text>
      {days.map((d, i) => {
        const color = d.state === 'complete' ? T.green : d.state === 'missed' ? T.red : T.brandText;
        return <View key={d.day} style={styles.column}>
          <View style={[styles.bar, { height: Math.max(3, HEIGHT * minutes[i] / top), backgroundColor: color,
            opacity: d.state === 'open' ? 0.55 : 1 }]} />
        </View>;
      })}
    </View>
    <View style={styles.labels}>
      {days.map(d => <View key={d.day} style={styles.column}>
        <Text style={[ty.caption1, { color: T.labelSecondary }]}>{startsAt != null ? READING_WEEKDAYS[readingWeekday(readingPersonalDate(startsAt, firstDay, d.day))] : `Д${d.day - firstDay + 1}`}</Text>
        <Text style={[ty.caption2, nums, { color: T.label }]}>{d.pages}</Text>
      </View>)}
    </View>
  </View>;
}
const styles = StyleSheet.create({
  plot: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  goal: { position: 'absolute', left: 0, right: 0, borderTopWidth: 1, borderStyle: 'dashed' },
  goalLabel: { position: 'absolute', right: 0 },
  column: { flex: 1, alignItems: 'center', gap: 2 },
  bar: { width: '70%', borderRadius: 6, borderCurve: 'continuous' },
  labels: { flexDirection: 'row', gap: 8, marginTop: 8 },
});
