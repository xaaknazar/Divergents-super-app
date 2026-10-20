import React, { useState } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import type { ReadingDetail } from '../data/reading';
import { word } from '../data/plural';
import { useTheme } from '../theme/ThemeContext';
import { nums, radius } from '../theme/tokens';
import { StatusBadge } from './StatusBadge';
import { fmtDecimal, fmtInt } from '../data/format';

/** «Сегодня N / 60 мин» + полоса, ниже три показателя. Постоянный челлендж: средний темп
 * (метрика рейтинга) с «Ниже цели» / «Темп достигнут», серия, страницы. По сроку: дни, страницы, минуты сверх цели. */
export function ReadingPaceSummary({ member, day }: { member: NonNullable<ReadingDetail['me']>; day?: number }) {
  const { T, ty, textScale } = useTheme();
  const { fontScale, width } = useWindowDimensions();
  const [availableWidth, setAvailableWidth] = useState(width - 32);
  const stacked = fontScale * textScale > 1.15 || availableWidth < 320;
  const today = day !== undefined ? member.history.find(h => h.day === day) : undefined;
  const todayMinutes = Math.floor((today?.elapsedMs ?? 0) / 60000);
  const continuous = member.averageMinutes !== undefined;
  const onTarget = member.pace === 'on_target';
  const extra = Math.floor(member.extraMs / 60000);
  const metrics: { value: string; label: string; badge?: React.ReactNode }[] = continuous ? [
    { value: `${fmtDecimal(member.averageMinutes ?? 0)} мин`, label: 'в среднем в день',
      badge: <StatusBadge label={onTarget ? 'Темп достигнут' : 'Ниже цели'} tone={onTarget ? 'success' : 'warning'} size="compact" /> },
    { value: String(member.streak ?? 0), label: `${word(member.streak ?? 0, 'день', 'дня', 'дней')} подряд` },
    { value: fmtInt(member.pages), label: `${word(member.pages, 'страница', 'страницы', 'страниц')} всего` },
  ] : [
    { value: String(member.completedDays), label: word(member.completedDays, 'день выполнен', 'дня выполнено', 'дней выполнено') },
    { value: fmtInt(member.pages), label: word(member.pages, 'страница прочитана', 'страницы прочитано', 'страниц прочитано') },
    { value: String(extra), label: `${word(extra, 'минута', 'минуты', 'минут')} сверх цели` },
  ];
  return <View onLayout={event => setAvailableWidth(event.nativeEvent.layout.width)}
    style={[styles.card, { backgroundColor: T.cardBg, borderColor: T.cardBorder }]}>
    {day !== undefined ? <>
      <View style={styles.todayRow}>
        <Text accessibilityRole="header" style={[ty.headline, { color: T.label }]}>Сегодня</Text>
        <Text accessibilityLabel={`Сегодня ${todayMinutes} из 60 минут`} style={[ty.title2, nums, { color: T.label }]}>
          {todayMinutes}<Text style={[ty.callout, { color: T.labelSecondary }]}> / 60 мин</Text>
        </Text>
      </View>
      <View style={[styles.track, { backgroundColor: T.fillTertiary }]}>
        <View style={[styles.fill, { width: `${Math.min(1, todayMinutes / 60) * 100}%`, backgroundColor: T.brandText }]} />
      </View>
      <View style={[styles.rule, { backgroundColor: T.separator }]} />
    </> : <Text accessibilityRole="header" style={[ty.headline, { color: T.label }]}>Ритм чтения</Text>}
    <View style={[styles.metrics, stacked && styles.stacked]}>
      {metrics.map((m, i) => <View key={m.label} style={[styles.metric, !stacked && i > 0 && [styles.divided, { borderLeftColor: T.separator }]]}>
        <Text style={[ty.title3, nums, { color: T.label }]}>{m.value}</Text>
        <Text style={[ty.footnote, { color: T.labelSecondary }]}>{m.label}</Text>
        {m.badge ? <View style={styles.badge}>{m.badge}</View> : null}
      </View>)}
    </View>
    {continuous ? <Text style={[ty.footnote, { color: T.labelSecondary }]}>{member.rankingPending ? 'Место появится после проверки неподтверждённых результатов.'
      : member.rankingEligible ? 'Вы участвуете в рейтинге по среднему времени чтения.' : `До рейтинга: ${member.qualificationDaysLeft ?? 10} дн. наблюдения.`}
      {` Участие: ${member.daysParticipated ?? 0} дн. · лучшая серия: ${member.bestStreak ?? 0} дн.`}</Text> : null}
  </View>;
}
const styles = StyleSheet.create({
  card: { borderRadius: radius.block, borderCurve: 'continuous', borderWidth: 1, padding: 16, gap: 12 },
  todayRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' },
  track: { height: 6, borderRadius: 3, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 3 },
  rule: { height: 0.5 },
  metrics: { flexDirection: 'row' },
  stacked: { flexDirection: 'column', gap: 12 },
  metric: { flex: 1, minWidth: 0, gap: 2, paddingRight: 8 },
  divided: { borderLeftWidth: 0.5, paddingLeft: 12 },
  badge: { marginTop: 6 },
});
