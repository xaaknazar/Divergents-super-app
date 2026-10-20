import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { ReadingDetail } from '../data/reading';
import { days as daysLabel } from '../data/plural';
import { useTheme } from '../theme/ThemeContext';
import { nums } from '../theme/tokens';
import { SF } from './SFIcon';
import { fmtDecimal, fmtInt } from '../data/format';

/** Строка рейтинга: место или причина его отсутствия, среднее мин/день (по сроку — страницы),
 * своя строка — спокойная подсветка и «вы». */
export function ReadingMemberRow({ member, rank, day, isMe, phase, last, teamName, onHistory }: {
  member: ReadingDetail['ranking'][number]; rank: number; day: number; isMe: boolean; phase: ReadingDetail['phase']; last: boolean;
  teamName?: string; onHistory?: () => void;
}) {
  const { T, ty } = useTheme();
  const state = member.history.find(h => h.day === day)?.state;
  const continuous = member.averageMinutes !== undefined;
  const unranked = member.rankingEligible === false;
  const today = member.eliminatedOn ? 'Участие завершено' : phase === 'finished' ? 'Итоговый результат' : phase === 'upcoming' ? 'Готов к старту'
    : state === 'complete' ? 'Сегодня: час завершён' : state === 'missed' ? 'Сегодня: красный флаг'
    : state === 'review' ? 'Сегодня: на проверке' : 'Сегодня: не подтверждено';
  const reason = unranked ? member.rankingPending ? 'Результат на проверке' : `До участия в рейтинге — ${daysLabel(member.qualificationDaysLeft ?? 0)}` : null;
  const sub = reason ?? [teamName, continuous ? daysLabel(member.daysParticipated ?? member.completedDays) : `${member.completedDays} дн. · ${Math.floor(member.elapsedMs / 60000)} мин.`].filter(Boolean).join(' · ');
  const todayTone = state === 'complete' ? T.greenText : state === 'missed' ? T.redText : state === 'review' ? T.orangeText : T.labelSecondary;
  return <View style={[styles.row, { backgroundColor: isMe ? T.brandTinted : T.cardBg, borderBottomWidth: last ? 0 : 0.5, borderBottomColor: T.separator }]}>
    <Text accessibilityLabel={unranked ? 'Пока без места' : `${rank} место`}
      style={[ty.headline, nums, styles.rank, { color: unranked ? T.labelTertiary : isMe ? T.labelSecondary : T.brandText }]}>{unranked ? '—' : rank}</Text>
    <View style={styles.main}>
      <View style={styles.nameRow}>
        <Text style={[ty.headline, styles.shrink, { color: T.label }]}>{member.name}</Text>
        {isMe ? <View style={[styles.me, { backgroundColor: T.brand }]}><Text style={[ty.caption2Em, { color: T.onBrand }]}>вы</Text></View> : null}
      </View>
      <Text style={[ty.footnote, { color: reason && member.rankingPending ? T.orangeText : T.labelSecondary }]}>{sub}</Text>
      {!continuous && phase !== 'upcoming' ? <Text style={[ty.footnote, { color: member.eliminatedOn || phase !== 'active' ? T.labelSecondary : todayTone }]}>{today}</Text> : null}
      {onHistory ? <Pressable onPress={onHistory} accessibilityRole="button" accessibilityLabel="Книги и история"
        style={({ pressed }) => [styles.link, { opacity: pressed ? 0.6 : 1 }]}>
        <Text style={[ty.footnoteEm, { color: T.brandText }]}>Книги и история</Text>
        <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants"><SF name="chevron.forward" size={12} color={T.brandText} /></View>
      </Pressable> : null}
    </View>
    {continuous && !unranked ? <View style={styles.value}>
      <Text style={[ty.headline, nums, { color: T.label }]}>{fmtDecimal(member.averageMinutes ?? 0)}</Text>
      <Text style={[ty.caption1, { color: T.labelSecondary }]}>мин/день</Text>
    </View> : !continuous ? <View style={styles.value}>
      <Text style={[ty.headline, nums, { color: T.label }]}>{fmtInt(member.pages)}</Text>
      <Text style={[ty.caption1, { color: T.labelSecondary }]}>стр.</Text>
    </View> : null}
  </View>;
}
const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16, gap: 12 },
  rank: { minWidth: 24, textAlign: 'center' },
  main: { flex: 1, minWidth: 0, gap: 2 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  me: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  shrink: { flexShrink: 1 },
  link: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start' },
  value: { alignItems: 'flex-end' },
});
