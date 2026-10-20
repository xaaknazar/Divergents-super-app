import React from 'react';
import { Text } from 'react-native';
import type { ReadingDetail } from '../data/reading';
import { useTheme } from '../theme/ThemeContext';
import { ContentBlock } from './ContentBlock';
import { Wrapper } from './Wrapper';
import { StatusBadge } from './StatusBadge';
import { fmtDecimal } from '../data/format';
export function ReadingPaceSummary({ member }: { member: NonNullable<ReadingDetail['me']> }) {
  const { T, ty } = useTheme();
  const onTarget = member.pace === 'on_target';
  return <ContentBlock><Wrapper gap={12}>
    <Text accessibilityRole="header" style={[ty.headline, { color: T.label }]}>Ритм чтения</Text>
    <Text style={[ty.title1, { color: onTarget ? T.greenText : T.redText, fontVariant: ['tabular-nums'] }]}>{fmtDecimal(member.averageMinutes ?? 0)} мин/день</Text>
    <StatusBadge label={onTarget ? 'В среднем цель выполнена' : 'В среднем пока меньше часа'} tone={onTarget ? 'success' : 'danger'} />
    <Text style={[ty.subhead, { color: T.labelSecondary }]}>Участие: {member.daysParticipated ?? 0} дн. · серия: {member.streak ?? 0} дн. · лучшая: {member.bestStreak ?? 0} дн.</Text>
    <Text style={[ty.footnote, { color: T.labelSecondary }]}>{member.rankingPending ? 'Место появится после проверки неподтверждённых результатов.' : member.rankingEligible ? 'Вы участвуете в рейтинге по среднему времени чтения.' : `До рейтинга: ${member.qualificationDaysLeft ?? 10} дн. наблюдения.`}</Text>
    <Text style={[ty.footnote, { color: T.labelSecondary }]}>Среднее учитывает все дни с одобрения, включая сегодняшний и пропуски. Пропуск не исключает из челленджа.</Text>
  </Wrapper></ContentBlock>;
}
