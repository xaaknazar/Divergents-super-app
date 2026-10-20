import React from 'react';
import { Text, View } from 'react-native';
import type { ReadingDetail } from '../data/reading';
import { count } from '../data/plural';
import { useTheme } from '../theme/ThemeContext';
import { ContentBlock } from './ContentBlock';
import { Wrapper } from './Wrapper';
import { SF } from './SFIcon';
import { StatusBadge } from './StatusBadge';
import { ProgressBar } from './ProgressBar';
import { Button } from './Button';
import { fmtDecimal, fmtInt } from '../data/format';

export function ReadingTeamCard({ team, rank, recruiting, isMine, canJoin, busy, onJoin, onRoster }: {
  team: ReadingDetail['teams'][number]; rank: number; recruiting: boolean; isMine: boolean;
  canJoin: boolean; busy: boolean; onJoin: () => void; onRoster: () => void;
}) {
  const { T, ty } = useTheme();
  return <ContentBlock><Wrapper gap={16}>
    <Wrapper dir="row" gap={12} align="center">
      <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: T.brandTinted, alignItems: 'center', justifyContent: 'center' }}>
        <SF name={recruiting ? 'person.3.fill' : rank === 1 ? 'trophy.fill' : 'person.2.fill'} size={22} color={T.brandText} />
      </View>
      <Wrapper flex={1} gap={4}>
        <Text accessibilityRole="header" style={[ty.headline, { color: T.label }]}>{team.name}</Text>
        <Text style={[ty.subhead, { color: T.labelSecondary }]}>{recruiting ? `${team.occupied} из ${team.capacity} мест занято` : `${rank} место · ${count(team.members, 'участник', 'участника', 'участников')}`}</Text>
      </Wrapper>
    </Wrapper>
    {isMine ? <StatusBadge label="Ваша команда" icon="checkmark.circle.fill" tone="brand" /> : null}
    <ProgressBar value={recruiting ? team.occupied / team.capacity : team.completionRate}
      accessibilityLabel={recruiting ? `Заполненность команды ${team.name}` : `Выполненные дни команды ${team.name}`} size="prominent" />
    {!recruiting ? <Text style={[ty.subhead, { color: T.labelSecondary }]}>{Math.round(team.completionRate * 100)}% выполненных дней · {fmtInt(team.pages)} стр.</Text> : null}
    {team.averageMinutes !== undefined ? <Text style={[ty.headline, { color: T.brandText }]}>{fmtDecimal(team.averageMinutes)} мин/день в среднем</Text> : null}
    {canJoin ? <Button label={team.occupied >= team.capacity ? 'Мест нет' : 'Подать заявку'} disabled={busy || team.occupied >= team.capacity} onPress={onJoin} /> : null}
    <Button label="Состав команды" variant="tinted" onPress={onRoster} />
  </Wrapper></ContentBlock>;
}
