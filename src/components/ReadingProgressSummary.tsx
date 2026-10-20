import React, { useState } from 'react';
import { Text, View, useWindowDimensions } from 'react-native';
import type { ReadingDetail } from '../data/reading';
import { word } from '../data/plural';
import { useTheme } from '../theme/ThemeContext';
import { Wrapper } from './Wrapper';
import { ResultMetric } from './ResultMetric';
import { ContentBlock } from './ContentBlock';
import { PageHeading } from './PageHeading';
import { StatusBadge } from './StatusBadge';
import { Button } from './Button';
import { ReadingPaceSummary } from './ReadingPaceSummary';
import { fmtInt } from '../data/format';

export function ReadingProgressSummary({ member }: { member: NonNullable<ReadingDetail['me']> }) {
  const { T, ty, textScale } = useTheme();
  const { fontScale, width } = useWindowDimensions();
  const [availableWidth, setAvailableWidth] = useState(width - 32);
  const [expanded, setExpanded] = useState(false);
  const days = member.history.filter(h => h.state !== 'future');
  const visible = expanded ? days : days.slice(-3);
  const stacked = fontScale * textScale > 1.15 || availableWidth < 340;
  return <View onLayout={event => setAvailableWidth(event.nativeEvent.layout.width)} style={{ gap: 12 }}>
    <PageHeading title="Ваш прогресс" />
    {member.averageMinutes !== undefined ? <ReadingPaceSummary member={member} /> : null}
    <Wrapper dir={stacked ? 'column' : 'row'} gap={8}>
      <Wrapper flex={1}><ResultMetric kind="completed" value={String(member.completedDays)} label={word(member.completedDays, 'день выполнен', 'дня выполнено', 'дней выполнено')} /></Wrapper>
      <Wrapper flex={1}><ResultMetric kind="reading" value={fmtInt(member.pages)} label={word(member.pages, 'страница прочитана', 'страницы прочитано', 'страниц прочитано')} /></Wrapper>
      <Wrapper flex={1}><ResultMetric kind="focus" value={String(Math.floor(member.extraMs / 60000))} label={`${word(Math.floor(member.extraMs / 60000), 'минута', 'минуты', 'минут')} сверх цели`} /></Wrapper>
    </Wrapper>
    <ContentBlock><Wrapper gap={16}>
      <Wrapper dir="row" justify="space-between" align="center" wrap gap={8}>
        <Text accessibilityRole="header" style={[ty.headline, { color: T.label }]}>Дневник чтения</Text>
        <StatusBadge label={member.averageMinutes !== undefined ? `Пропуски: ${member.flags}` : `Флаги: ${member.flags} из 3`} icon="flag.fill" tone={member.flags ? 'danger' : 'neutral'} />
      </Wrapper>
      {visible.map(h => <View key={h.day} style={{ gap: 8, borderTopWidth: 0.5, borderTopColor: T.separator, paddingTop: 12 }}>
        <Wrapper dir="row" justify="space-between" align="center" wrap gap={8}>
          <Text style={[ty.subheadEm, { color: T.label }]}>День {h.day - (member.firstDay ?? 1) + 1}</Text>
          <StatusBadge label={{ complete: 'Выполнен', missed: 'Красный флаг', review: 'На проверке', open: 'Идёт', future: 'Впереди', excluded: 'Участие завершено' }[h.state]}
            tone={h.state === 'complete' ? 'success' : h.state === 'missed' ? 'danger' : h.state === 'review' ? 'warning' : 'neutral'} />
        </Wrapper>
        <Text style={[ty.subhead, { color: T.labelSecondary }]}>{Math.floor(h.elapsedMs / 60000)} мин · {h.pages} стр.{h.elapsedMs > 3600000 ? ` · +${Math.floor((h.elapsedMs - 3600000) / 60000)} мин сверх часа` : ''}</Text>
      </View>)}
      {days.length > 3 ? <Button label={expanded ? 'Свернуть историю' : `Все дни (${days.length})`} variant="plain" onPress={() => setExpanded(v => !v)} /> : null}
    </Wrapper></ContentBlock>
  </View>;
}
