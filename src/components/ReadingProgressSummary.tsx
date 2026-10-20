import React, { useState } from 'react';
import { Text, View } from 'react-native';
import type { ReadingDetail } from '../data/reading';
import { useTheme } from '../theme/ThemeContext';
import { Wrapper } from './Wrapper';
import { ContentBlock } from './ContentBlock';
import { StatusBadge } from './StatusBadge';
import { Button } from './Button';
import { ReadingPaceSummary } from './ReadingPaceSummary';

/** «Сегодня / цель» и накопительные показатели (ReadingPaceSummary) + дневник чтения по дням. */
export function ReadingProgressSummary({ member, day }: { member: NonNullable<ReadingDetail['me']>; day?: number }) {
  const { T, ty } = useTheme();
  const [expanded, setExpanded] = useState(false);
  const days = member.history.filter(h => h.state !== 'future');
  const visible = expanded ? days : days.slice(-3);
  return <View style={{ gap: 12 }}>
    <Text accessibilityRole="header" style={[ty.title3, { color: T.label }]}>Ваш прогресс</Text>
    <ReadingPaceSummary member={member} day={day} />
    <ContentBlock><Wrapper gap={16}>
      <Wrapper dir="row" justify="space-between" align="center" wrap gap={8}>
        <Text accessibilityRole="header" style={[ty.headline, { color: T.label }]}>Дневник чтения</Text>
        <StatusBadge label={member.averageMinutes !== undefined ? `Пропуски: ${member.flags}` : `Флаги: ${member.flags} из 3`} icon="flag.fill" tone={member.flags ? 'danger' : 'neutral'} />
      </Wrapper>
      {visible.map(h => <View key={h.day} style={{ gap: 8, borderTopWidth: 0.5, borderTopColor: T.separator, paddingTop: 12 }}>
        <Wrapper dir="row" justify="space-between" align="center" wrap gap={8}>
          <Text style={[ty.subheadEm, { color: T.label }]}>День {h.day - (member.firstDay ?? 1) + 1}</Text>
          <StatusBadge label={{ complete: 'Выполнен', missed: 'Красный флаг', review: 'На проверке', open: 'Идёт', future: 'Впереди', excluded: 'Участие завершено' }[h.state]}
            tone={h.state === 'complete' ? 'success' : h.state === 'missed' ? 'danger' : h.state === 'review' ? 'warning' : 'neutral'} size="compact" />
        </Wrapper>
        <Text style={[ty.subhead, { color: T.labelSecondary }]}>{Math.floor(h.elapsedMs / 60000)} мин · {h.pages} стр.{h.elapsedMs > 3600000 ? ` · +${Math.floor((h.elapsedMs - 3600000) / 60000)} мин сверх часа` : ''}</Text>
      </View>)}
      {days.length > 3 ? <Button label={expanded ? 'Свернуть историю' : `Все дни (${days.length})`} variant="plain" onPress={() => setExpanded(v => !v)} /> : null}
    </Wrapper></ContentBlock>
  </View>;
}
