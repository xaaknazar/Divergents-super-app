import React from 'react';
import { Text, View } from 'react-native';
import type { ReadingDetail } from '../data/reading';
import { useTheme } from '../theme/ThemeContext';
import { StatusBadge } from './StatusBadge';
import { Button } from './Button';

export function ReadingMemberRow({ member, rank, day, isMe, phase, last, onHistory }: {
  member: ReadingDetail['ranking'][number]; rank: number; day: number; isMe: boolean; phase: ReadingDetail['phase']; last: boolean;
  onHistory?: () => void;
}) {
  const { T, ty } = useTheme();
  const state = member.history.find(h => h.day === day)?.state;
  const label = member.eliminatedOn ? 'Участие завершено' : phase === 'finished' ? 'Итоговый результат' : phase === 'upcoming' ? 'Готов к старту'
    : state === 'complete' ? 'Сегодня: час завершён' : state === 'missed' ? 'Сегодня: красный флаг'
    : state === 'review' ? 'Сегодня: на проверке' : 'Сегодня: не подтверждено';
  return <View style={{ flexDirection: 'row', padding: 16, gap: 12, backgroundColor: isMe ? T.brandTinted : T.cardBg,
    borderBottomWidth: last ? 0 : 0.5, borderBottomColor: T.separator }}>
    <Text accessibilityLabel={member.rankingEligible === false ? 'Пока без места' : `${rank} место`} style={[ty.footnoteEm, { color: T.brandText, minWidth: 20, fontVariant: ['tabular-nums'] }]}>{member.rankingEligible === false ? '—' : rank}</Text>
    <View style={{ flex: 1, minWidth: 0, gap: 8 }}>
      <Text style={[ty.headline, { color: T.label }]}>{member.name}{isMe ? ' · вы' : ''}</Text>
      {member.averageMinutes !== undefined ? <>
        <Text style={[ty.title3, { color: member.pace === 'on_target' ? T.greenText : T.redText }]}>{member.averageMinutes.toLocaleString('ru-RU', { maximumFractionDigits: 1 })} мин/день</Text>
        {member.rankingEligible === false ? <Text style={[ty.footnote, { color: T.labelSecondary }]}>{member.rankingPending ? 'Результат на проверке' : `До рейтинга: ${member.qualificationDaysLeft} дн.`}</Text> : null}
      </> : null}
      <Text style={[ty.subhead, { color: T.labelSecondary }]}>{member.completedDays} дн. · {member.pages.toLocaleString('ru-RU')} стр. · {Math.floor(member.elapsedMs / 60000)} мин.</Text>
      <StatusBadge label={label} tone={phase !== 'active' || member.eliminatedOn ? 'neutral'
        : state === 'complete' ? 'success' : state === 'missed' ? 'danger' : state === 'review' ? 'warning' : 'neutral'} />
      {onHistory ? <Button label="Книги и история" variant="plain" onPress={onHistory} /> : null}
    </View>
  </View>;
}
