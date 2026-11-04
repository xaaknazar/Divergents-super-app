import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { READING_WEEKDAYS, ReadingCalendarCell, ReadingCalendarState, readingMonthShort } from '../data/readingCalendar';
import { word } from '../data/plural';
import { useTheme } from '../theme/ThemeContext';
import { hexToRgba } from '../theme/personalization';
import { nums } from '../theme/tokens';

const GAP = 4;
/** Календарь чтения: недели столбцами, дни недели строками (как в GitHub/Apple Fitness).
 * Норма — зелёный, флаг — красный, флаг снят — оранжевый, сегодня — обводка. Только сохранённые дни сервера. */
export function ReadingCalendar({ weeks }: { weeks: ReadingCalendarCell[][] }) {
  const { T, ty, isDark } = useTheme();
  const [width, setWidth] = useState(0);
  const cell = width ? Math.max(12, Math.floor((width - 22 - GAP * (weeks.length - 1)) / weeks.length)) : 0;
  const fill: Record<ReadingCalendarState, string> = {
    complete: T.green, flag: T.red, forgiven: hexToRgba(T.orange, 0.75), today: 'transparent',
    pending: T.fillSecondary, future: T.fillQuaternary, outside: 'transparent',
  };
  const all = weeks.flat();
  const count = (s: ReadingCalendarState) => all.filter(c => c.state === s).length;
  const done = count('complete'), flags = count('flag'), forgiven = count('forgiven');
  const label = `Календарь за ${weeks.length} ${word(weeks.length, 'неделю', 'недели', 'недель')}: ${done} ${word(done, 'день', 'дня', 'дней')} с нормой, ${flags} ${word(flags, 'флаг', 'флага', 'флагов')}${forgiven ? `, снято флагов: ${forgiven}` : ''}`;
  const legend: [ReadingCalendarState, string][] = [['complete', 'Норма'], ['flag', 'Флаг'], ['forgiven', 'Флаг снят'], ['today', 'Сегодня']];
  return <View style={styles.root}>
    <View accessible accessibilityRole="image" accessibilityLabel={label} onLayout={e => setWidth(e.nativeEvent.layout.width)}>
      {cell ? <>
        <View style={styles.months}>
          {weeks.map((week, i) => {
            // A month label sits over the first week whose Monday is in that month.
            const month = readingMonthShort(week[0].date);
            if (i > 0 && month === readingMonthShort(weeks[i - 1][0].date)) return null;
            return <Text key={week[0].key} numberOfLines={1}
              style={[ty.caption2, styles.month, { left: 22 + i * (cell + GAP), color: T.labelSecondary }]}>{month}</Text>;
          })}
        </View>
        {READING_WEEKDAYS.map((name, d) => <View key={name} style={[styles.row, { marginTop: GAP }]}>
          <Text style={[ty.caption2, styles.weekday, { color: T.labelTertiary }]}>{d % 2 === 0 ? name : ''}</Text>
          {weeks.map(week => {
            const c = week[d];
            return <View key={c.key} style={[styles.cell, { width: cell, height: cell, backgroundColor: fill[c.state] },
              c.state === 'today' && { borderWidth: 2, borderColor: T.brandText },
              c.state === 'outside' && { borderWidth: StyleSheet.hairlineWidth, borderColor: isDark ? T.separator : T.fillTertiary }]} />;
          })}
        </View>)}
      </> : <View style={{ height: 160 }} />}
    </View>
    <View style={styles.legend} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {legend.map(([state, text]) => <View key={state} style={styles.legendItem}>
        <View style={[styles.swatch, { backgroundColor: fill[state] }, state === 'today' && { borderWidth: 2, borderColor: T.brandText }]} />
        <Text style={[ty.caption1, nums, { color: T.labelSecondary }]}>{text}</Text>
      </View>)}
    </View>
  </View>;
}
const styles = StyleSheet.create({
  root: { gap: 12 },
  row: { flexDirection: 'row', gap: GAP, alignItems: 'center' },
  months: { height: 14 },
  month: { position: 'absolute', top: 0 },
  weekday: { width: 18 },
  cell: { borderRadius: 4, borderCurve: 'continuous' },
  legend: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 14, rowGap: 6 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  swatch: { width: 12, height: 12, borderRadius: 3 },
});
