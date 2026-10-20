import React from 'react';
import { Text, View } from 'react-native';
import { FitnessProgram, ProgramStats } from '../data/fitness';
import { days } from '../data/plural';
import { programNumber, programPeriod } from '../data/programResults';
import { useTheme } from '../theme/ThemeContext';
import { ActionBlock } from './ActionBlock';
import { SF } from './SFIcon';
import { ProgressBar } from './ProgressBar';

export function ProgramHistoryCard({ program: p, stats: s, onPress }: { program: FitnessProgram; stats: ProgramStats; onPress: () => void }) {
  const { T, ty } = useTheme();
  return <ActionBlock accessibilityLabel={`${p.title}, ${programPeriod(p)}, всего ${programNumber(s.total)} ${p.unit}. Открыть результаты`} onPress={onPress}>
    <View style={{ gap: 12 }}>
      <Text style={[ty.footnote, { color: T.labelSecondary }]}>{programPeriod(p)}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ flex: 1, gap: 8 }}><Text style={[ty.headline, { color: T.label }]}>{p.title}</Text>
          <Text style={[ty.title2, { color: T.brandText, fontVariant: ['tabular-nums'] }]}>{programNumber(s.total)} {p.unit}</Text></View>
        {s.done === p.days ? <SF name="checkmark.seal.fill" size={24} color={T.greenText} /> : null}
      </View>
      <ProgressBar value={p.days > 0 ? s.done / p.days : 0} accessibilityLabel="Дни с выполненной нормой" />
      <Text style={[ty.subhead, { color: T.labelSecondary }]}>Норма: {s.done} из {p.days} дней · лучшая серия: {days(s.bestStreak)}</Text>
      {s.done === p.days ? <Text style={[ty.footnote, { color: T.greenText }]}>Все дни с выполненной нормой</Text> : null}
    </View>
  </ActionBlock>;
}
