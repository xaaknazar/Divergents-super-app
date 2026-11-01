import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ReadingHistory } from '../data/readingBooks';
import { readingStatistics, readingStatsDate } from '../data/readingStatistics';
import { useTheme } from '../theme/ThemeContext';
import { nums } from '../theme/tokens';
import { Wrapper } from './Wrapper';
import { ContentBlock } from './ContentBlock';
import { Button } from './Button';
export function ReadingStatisticsContent({ data, onShare }: { data: ReadingHistory; onShare: () => void }) {
  const { T, ty } = useTheme();
  const s = readingStatistics(data);
  const total = Math.max(1, ...s.recent.map(d => d.pages));
  return <Wrapper padding={16} gap={20}>
    <ContentBlock><Wrapper gap={12}>
      <Text style={[ty.footnoteEm, { color: T.brandText }]}>{data.title ?? 'Reading challenge'}</Text>
      <Text accessibilityRole="header" style={[ty.largeTitle, { color: T.label }]}>{s.period?.completed ? 'Год, который вы прочитали' : 'Ваше чтение в цифрах'}</Text>
      <Text style={[ty.subhead, { color: T.labelSecondary }]}>{data.reader.name}{s.period ? ` · день ${s.period.personalDay} из ${s.period.totalDays}` : ''}</Text>
      {s.period ? <Text style={[ty.footnote, { color: T.labelSecondary }]}>{readingStatsDate(s.period.startsAt)} — {readingStatsDate(s.period.endsAt - 1)}</Text> : null}
      <View style={styles.grid}>{s.metrics.map(m => <View key={m.key} style={styles.cell}>
        <Text style={[ty.title2, nums, { color: T.label }]}>{m.value}</Text>
        <Text style={[ty.footnote, { color: T.labelSecondary }]}>{m.label}</Text>
      </View>)}</View>
      <Button icon="square.and.arrow.up" label="Поделиться в сторис" onPress={onShare} />
      <Text style={[ty.caption1, { color: T.labelSecondary }]}>Только сохранённые результаты{data.generatedAt ? ` · ${readingStatsDate(data.generatedAt)}` : ''}</Text>
    </Wrapper></ContentBlock>
    <ContentBlock><Wrapper gap={14}>
      <Text accessibilityRole="header" style={[ty.title3, { color: T.label }]}>Последние 7 дней</Text>
      {s.recent.map(d => <View key={d.day} style={styles.day}>
        <Text style={[ty.footnote, styles.dayLabel, { color: T.labelSecondary }]}>День {d.day - (data.reader.firstDay ?? 1) + 1}</Text>
        <View style={[styles.track, { backgroundColor: T.fillTertiary }]} accessible={false}><View style={[styles.bar, { backgroundColor: T.brandText, width: `${d.pages / total * 100}%` }]} /></View>
        <Text style={[ty.footnoteEm, nums, { color: T.label }]}>{d.pages} стр.</Text>
      </View>)}
      <Text style={[ty.subhead, { color: T.labelSecondary }]}>{s.completedDays} дней с выполненной нормой · {s.completionRate}% дней участия</Text>
      <Text style={[ty.subhead, { color: T.labelSecondary }]}>Читали в {s.readingDays} днях. Лучший день — {s.bestDay?.pages ?? 0} страниц.</Text>
      <Text style={[ty.subhead, { color: T.labelSecondary }]}>Получено флагов: {s.earnedFlags} · снято за серии: {s.forgivenFlags}</Text>
    </Wrapper></ContentBlock>
    <ContentBlock><Wrapper gap={16}>
      <Text accessibilityRole="header" style={[ty.title3, { color: T.label }]}>Книги этого года</Text>
      {!s.books.length ? <Text style={[ty.body, { color: T.labelSecondary }]}>Здесь появятся книги после сохранения первого подхода.</Text> : s.books.map(b => <View key={b.key} style={styles.book}>
        <Text style={[ty.headline, { color: T.label }]}>{b.title}</Text>
        <Text style={[ty.subhead, { color: T.labelSecondary }]}>{b.author}</Text>
        <Text style={[ty.footnoteEm, { color: b.finished ? T.greenText : T.brandText }]}>{b.finished ? 'Прочитана' : 'В процессе'} · {b.pages} стр. · {Math.floor(b.elapsedMs / 60000)} мин</Text>
      </View>)}
    </Wrapper></ContentBlock>
  </Wrapper>;
}
const styles = StyleSheet.create({ grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 }, cell: { flexGrow: 1, flexBasis: '42%', minWidth: 110, gap: 4 }, day: { flexDirection: 'row', alignItems: 'center', gap: 10 }, dayLabel: { minWidth: 58 }, track: { flex: 1, height: 8, borderRadius: 4, overflow: 'hidden' }, bar: { height: 8 }, book: { gap: 5 } });
