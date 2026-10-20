import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { ReadingDetail } from '../data/reading';
import { useTheme } from '../theme/ThemeContext';
import { nums } from '../theme/tokens';
import { ContentBlock } from './ContentBlock';
import { StatusBadge } from './StatusBadge';
import { Button } from './Button';

const STATE = { complete: 'Час выполнен', missed: 'Красный флаг', review: 'На проверке', open: 'Идёт', future: 'Впереди', excluded: 'Участие завершено' } as const;

/** Дневник чтения по личным дням: «День N» с дня вступления, минуты, страницы, флаг дня. */
export function ReadingDiary({ member }: { member: NonNullable<ReadingDetail['me']> }) {
  const { T, ty } = useTheme();
  const [expanded, setExpanded] = useState(false);
  const days = member.history.filter(h => h.state !== 'future').reverse();
  const visible = expanded ? days : days.slice(0, 3);
  if (!days.length) return null;
  return <ContentBlock>
    <Text accessibilityRole="header" style={[ty.headline, { color: T.label }]}>Дневник чтения</Text>
    {visible.map(h => <View key={h.day} style={[styles.day, { borderTopColor: T.separator }]}>
      <View style={styles.line}>
        <Text style={[ty.subheadEm, nums, { color: T.label }]}>День {h.day - (member.firstDay ?? 1) + 1}</Text>
        <StatusBadge label={STATE[h.state]} size="compact" icon={h.state === 'missed' ? 'flag.fill' : undefined}
          tone={h.state === 'complete' ? 'success' : h.state === 'missed' ? 'danger' : h.state === 'review' ? 'warning' : 'neutral'} />
      </View>
      <Text style={[ty.subhead, nums, { color: T.labelSecondary }]}>{Math.floor(h.elapsedMs / 60000)} мин · {h.pages} стр.{h.elapsedMs > 3600000 ? ` · +${Math.floor((h.elapsedMs - 3600000) / 60000)} мин сверх часа` : ''}</Text>
    </View>)}
    {days.length > 3 ? <Button label={expanded ? 'Свернуть' : `Все дни (${days.length})`} variant="plain" onPress={() => setExpanded(v => !v)} /> : null}
  </ContentBlock>;
}
const styles = StyleSheet.create({
  day: { gap: 6, borderTopWidth: 0.5, paddingTop: 12, marginTop: 12 },
  line: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
});
