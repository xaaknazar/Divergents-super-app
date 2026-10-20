import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { ReadingDetail } from '../data/reading';
import { count, word } from '../data/plural';
import { useTheme } from '../theme/ThemeContext';
import { nums, radius } from '../theme/tokens';
import { Wrapper } from './Wrapper';
import { SF } from './SFIcon';
import { StatusBadge } from './StatusBadge';
import { Button } from './Button';
import { fmtDecimal, fmtInt } from '../data/format';

/** Команда в наборе: монограмма, «Капитан X · N мест свободно», занято/вместимость (капитан входит),
 * полоса занятости, «Состав команды ›» и одно действие. После старта — место и выполненные дни. */
export function ReadingTeamCard({ team, rank, recruiting, isMine, pending = false, captainName, canJoin, busy, onJoin, onRoster }: {
  team: ReadingDetail['teams'][number]; rank: number; recruiting: boolean; isMine: boolean;
  /** Заявка пользователя в эту команду ждёт капитана. */
  pending?: boolean;
  /** Имя капитана, если оно известно из данных челленджа. */
  captainName?: string;
  canJoin: boolean; busy: boolean; onJoin: () => void; onRoster: () => void;
}) {
  const { T, ty } = useTheme();
  const full = team.occupied >= team.capacity;
  const free = Math.max(0, team.capacity - team.occupied);
  const initial = team.name.trim().charAt(0).toUpperCase();
  const meta = recruiting
    ? [captainName ? `Капитан ${captainName}` : null, full ? 'мест нет' : `${free} ${word(free, 'место', 'места', 'мест')} свободно`].filter(Boolean).join(' · ')
    : `${rank} место · ${count(team.members, 'участник', 'участника', 'участников')} · ${fmtInt(team.pages)} стр.`;
  const action = !recruiting && !canJoin ? null : isMine ? pending ? 'Заявка отправлена' : 'Вы в команде' : canJoin ? full ? 'Мест нет' : 'Подать заявку' : null;
  const muted = recruiting && full && !isMine;
  const value = recruiting ? team.occupied / Math.max(1, team.capacity) : team.completionRate;
  return <View accessible={false} style={[styles.card, { backgroundColor: T.cardBg, borderColor: isMine ? T.brandText : T.cardBorder }]}>
    <Wrapper dir="row" gap={12} align="center">
      <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[styles.mono, { backgroundColor: T.brandTinted }]}>
        <Text style={[ty.headline, { color: T.brandText }]}>{initial}</Text>
      </View>
      <Wrapper flex={1} gap={2}>
        <Wrapper dir="row" gap={8} align="center" wrap>
          <Text accessibilityRole="header" style={[ty.headline, { color: T.label }]}>{team.name}</Text>
          {isMine ? <StatusBadge label="Ваша команда" tone="brand" size="compact" /> : null}
        </Wrapper>
        <Text style={[ty.footnote, { color: T.labelSecondary }]}>{meta}</Text>
      </Wrapper>
      {recruiting ? <Text accessibilityLabel={`Занято ${team.occupied} из ${team.capacity}`} style={[ty.title3, nums, { color: muted ? T.labelTertiary : T.label }]}>
        {team.occupied}<Text style={[ty.footnote, { color: T.labelTertiary }]}>/{team.capacity}</Text>
      </Text> : team.averageMinutes !== undefined ? <View style={styles.metric}>
        <Text style={[ty.title3, nums, { color: T.label }]}>{fmtDecimal(team.averageMinutes)}</Text>
        <Text style={[ty.caption1, { color: T.labelSecondary }]}>мин/день</Text>
      </View> : <View style={styles.metric}>
        <Text style={[ty.title3, nums, { color: T.label }]}>{Math.round(team.completionRate * 100)}%</Text>
        <Text style={[ty.caption1, { color: T.labelSecondary }]}>дней выполнено</Text>
      </View>}
    </Wrapper>
    <View accessible accessibilityRole="progressbar" accessibilityLabel={recruiting ? `Заполненность команды ${team.name}` : `Выполненные дни команды ${team.name}`}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(Math.min(1, Math.max(0, value)) * 100) }}
      style={[styles.track, { backgroundColor: T.fillTertiary }]}>
      <View style={[styles.fill, { width: `${Math.min(1, Math.max(0, value)) * 100}%`, backgroundColor: muted ? T.labelTertiary : T.brandText }]} />
    </View>
    <Wrapper dir="row" gap={12} align="center" justify="space-between" wrap>
      <Pressable onPress={onRoster} accessibilityRole="button" accessibilityLabel="Состав команды"
        style={({ pressed }) => [styles.link, { opacity: pressed ? 0.6 : 1 }]}>
        <Text style={[ty.subheadEm, { color: T.brandText }]}>Состав команды</Text>
        <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants"><SF name="chevron.forward" size={13} color={T.brandText} /></View>
      </Pressable>
      {action ? <Button label={action} size="compact" variant={action === 'Подать заявку' ? 'solid' : 'tinted'}
        disabled={action !== 'Подать заявку' || busy} onPress={onJoin} /> : null}
    </Wrapper>
  </View>;
}
const styles = StyleSheet.create({
  card: { borderRadius: radius.block, borderCurve: 'continuous', borderWidth: 1, padding: 16, gap: 12 },
  mono: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  metric: { alignItems: 'flex-end' },
  track: { height: 4, borderRadius: 2, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 2 },
  link: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 4 },
});
