// Активный челлендж участника на главной «Сообщества» (в макете — CommunityChallengeProgress).
// Одна синяя карточка-ссылка без полноширинной кнопки: «таблетка» статуса и круглая
// стрелка сверху, название, участники и команды, полоса дня, три метрики по центру колонок.
import React from 'react';
import { StyleSheet,Text,View } from 'react-native';
import * as pl from '../data/plural';
import { tr } from '../state/LanguageContext';
import { useTheme } from '../theme/ThemeContext';
import { FONT,nums } from '../theme/tokens';
import { CardMotif } from './CardMotif';
import { SF } from './SFIcon';
import { TappableSurface } from './TappableSurface';

export function ChallengeProgressSummary({ title, day, totalDays, teamName, members, teamPoints, pointsToday, rank, teamCount, eliminated, onPress }: {
  title: string; day: number; totalDays: number; teamName: string; members: number; teamPoints: number; pointsToday: number;
  rank: number; teamCount: number; eliminated: boolean; onPress: () => void;
}) {
  const { ty } = useTheme();
  const progress = totalDays > 0 ? Math.max(0, Math.min(1, day / totalDays)) : 0;
  const status = eliminated ? tr('Очки зафиксированы') : teamName ? `${tr('Идёт')} · ${tr('команда')} «${teamName}»` : tr('Идёт');
  const subtitle = [members > 0 ? pl.count(members, 'участник', 'участника', 'участников') : '', teamCount > 0 ? pl.teams(teamCount) : '']
    .filter(Boolean).join(' · ');
  // Без разделителя тысяч: в узкой колонке пробел рвал число на две строки.
  const stats = [
    { v: String(teamPoints), l: tr('Очки команды') },
    { v: rank > 0 ? `${rank} ${tr('из')} ${teamCount}` : '—', l: tr('Место команды') },
    { v: eliminated ? '—' : `+${pointsToday}`, l: tr('Сегодня') },
  ];
  return <TappableSurface onPress={onPress} accessibilityLabel={`${title}. ${tr('Открыть челлендж')}`}>
    <View style={styles.body}>
      <CardMotif kind="challengeDark" />
      <View style={styles.top}>
        <View style={styles.pill}>
          <SF name="flame.fill" size={12} color="#FFFFFF" />
          <Text style={[ty.caption2Em, styles.white, styles.shrink]} numberOfLines={1}>{status}</Text>
        </View>
        <View style={styles.arrow}><SF name="arrow.right" size={16} color="#FFFFFF" /></View>
      </View>
      <View style={styles.titles}>
        <Text accessibilityRole="header" style={[ty.title3, styles.white]} numberOfLines={2}>{title}</Text>
        {subtitle ? <Text style={[ty.footnote, styles.muted]} numberOfLines={1}>{subtitle}</Text> : null}
      </View>
      <View style={styles.progressRow}>
        <View style={styles.track}><View style={[styles.fill, { width: `${progress * 100}%` }]} /></View>
        <Text style={[ty.caption1, styles.day, nums]} numberOfLines={1}>{tr('День')} {day}/{totalDays}</Text>
      </View>
      <View style={styles.stats}>
        {stats.map((st, i) => <View key={st.l} style={[styles.stat, i > 0 ? styles.divider : null]}>
          <Text style={[ty.title3, styles.white, nums]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{st.v}</Text>
          <Text style={[ty.caption2, styles.label]} numberOfLines={1}>{st.l}</Text>
        </View>)}
      </View>
    </View>
  </TappableSurface>;
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#234088' },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 4, flexShrink: 1, paddingVertical: 4, paddingHorizontal: 10,
    borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.16)' },
  arrow: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.16)' },
  titles: { marginTop: 10, gap: 4 },
  white: { color: '#FFFFFF' },
  shrink: { flexShrink: 1 },
  muted: { color: 'rgba(255,255,255,0.78)' },
  progressRow: { marginTop: 14, flexDirection: 'row', alignItems: 'center', gap: 10 },
  track: { flex: 1, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.22)', overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 2, backgroundColor: '#FFFFFF' },
  day: { fontFamily: FONT.bold, color: 'rgba(255,255,255,0.85)' },
  stats: { flexDirection: 'row', marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.14)' },
  stat: { flex: 1, minWidth: 0, alignItems: 'center', gap: 2, paddingHorizontal: 4 },
  divider: { borderLeftWidth: 1, borderLeftColor: 'rgba(255,255,255,0.14)' },
  label: { color: 'rgba(255,255,255,0.68)', textAlign: 'center' },
});
