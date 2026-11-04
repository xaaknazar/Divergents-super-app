import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ReadingHistory } from '../data/readingBooks';
import { readingStatistics, readingStatsDate } from '../data/readingStatistics';
import { readingCalendarWeeks } from '../data/readingCalendar';
import { word } from '../data/plural';
import { useTheme } from '../theme/ThemeContext';
import { nums } from '../theme/tokens';
import { Wrapper } from './Wrapper';
import { ContentBlock } from './ContentBlock';
import { Button } from './Button';
import { ReadingCalendar } from './ReadingCalendar';
import { ReadingWeekChart } from './ReadingWeekChart';
import { ReadingYearBookRow } from './ReadingYearBookRow';

/** Статистика года: главный итог (страницы) крупно, остальное — сеткой; неделя столбиками с линией нормы,
 * календарь 12 недель, книги с обложками. Только сохранённые сервером результаты, без прогнозов. */
export function ReadingStatisticsContent({ data, onShare }: { data: ReadingHistory; onShare: () => void }) {
  const { T, ty } = useTheme();
  const s = readingStatistics(data);
  const r = data.reader;
  const firstDay = r.firstDay ?? 1;
  const targetMinutes = (data.targetMs ?? r.targetMs ?? 3_600_000) / 60000;
  const [pages, ...rest] = s.metrics;
  const secondary = rest.filter(m => m.key !== 'flags');
  const weeks = s.period ? readingCalendarWeeks(r.history, firstDay, s.period.startsAt, 12) : [];
  const met = s.recent.filter(d => d.state === 'complete').length;
  return <Wrapper padding={16} gap={20}>
    <ContentBlock><Wrapper gap={14}>
      <Wrapper gap={4}>
        <Text style={[ty.footnoteEm, { color: T.brandText }]}>{data.title ?? 'Reading challenge'}</Text>
        <Text accessibilityRole="header" style={[ty.title1, { color: T.label }]}>{s.period?.completed ? 'Год, который вы прочитали' : 'Ваше чтение в цифрах'}</Text>
        <Text style={[ty.subhead, nums, { color: T.labelSecondary }]}>{r.name}{s.period ? ` · день ${s.period.personalDay} из ${s.period.totalDays}` : ''}</Text>
      </Wrapper>
      {s.period ? <View accessible accessibilityRole="progressbar" accessibilityLabel="Пройдено дней года"
        accessibilityValue={{ min: 0, max: s.period.totalDays, now: s.period.personalDay }}
        style={[styles.track, { backgroundColor: T.fillTertiary }]}>
        <View style={[styles.fill, { backgroundColor: T.brandText, width: `${Math.min(100, s.period.personalDay / s.period.totalDays * 100)}%` }]} />
      </View> : null}
      <View>
        <Text style={[ty.largeTitle, nums, { fontSize: (ty.largeTitle.fontSize ?? 34) * 1.6, lineHeight: (ty.largeTitle.lineHeight ?? 41) * 1.5, color: T.label }]}>{pages.value}</Text>
        <Text style={[ty.subheadEm, { color: T.labelSecondary }]}>{pages.label} прочитано</Text>
      </View>
      <View style={styles.grid}>{secondary.map(m => <View key={m.key} style={[styles.cell, { backgroundColor: T.fillQuaternary }]}>
        <Text style={[ty.title3, nums, { color: T.label }]}>{m.value}</Text>
        <Text style={[ty.footnote, { color: T.labelSecondary }]}>{m.label}</Text>
      </View>)}</View>
      <Text style={[ty.footnoteEm, nums, { color: r.flags ? T.redText : T.greenText }]}>
        {r.flags ? `${r.flags} ${word(r.flags, 'красный флаг', 'красных флага', 'красных флагов')}` : 'Красных флагов нет'}{s.forgivenFlags ? ` · ${s.forgivenFlags} ${word(s.forgivenFlags, 'снят', 'снято', 'снято')} за серии` : ''}
      </Text>
      <Button icon="square.and.arrow.up" label="Поделиться в сторис" onPress={onShare} />
      <Text style={[ty.caption1, { color: T.labelSecondary }]}>Только сохранённые результаты{data.generatedAt ? ` · ${readingStatsDate(data.generatedAt)}` : ''}</Text>
    </Wrapper></ContentBlock>
    {s.recent.length ? <ContentBlock><Wrapper gap={14}>
      <Wrapper gap={2}>
        <Text accessibilityRole="header" style={[ty.title3, { color: T.label }]}>Последние 7 дней</Text>
        <Text style={[ty.footnote, nums, { color: T.labelSecondary }]}>Норма выполнена в {met} из {s.recent.length} · под столбиком — страницы</Text>
      </Wrapper>
      <ReadingWeekChart days={s.recent} firstDay={firstDay} startsAt={s.period?.startsAt} targetMinutes={targetMinutes} />
    </Wrapper></ContentBlock> : null}
    {weeks.length ? <ContentBlock><Wrapper gap={14}>
      <Wrapper gap={2}>
        <Text accessibilityRole="header" style={[ty.title3, { color: T.label }]}>Календарь</Text>
        <Text style={[ty.footnote, nums, { color: T.labelSecondary }]}>{s.completedDays} {word(s.completedDays, 'день', 'дня', 'дней')} с нормой · {s.completionRate}% дней участия · лучшая серия {r.bestStreak ?? 0}</Text>
      </Wrapper>
      <ReadingCalendar weeks={weeks} />
    </Wrapper></ContentBlock> : null}
    <ContentBlock><Wrapper gap={16}>
      <Text accessibilityRole="header" style={[ty.title3, { color: T.label }]}>Книги этого года</Text>
      {!s.books.length ? <Text style={[ty.body, { color: T.labelSecondary }]}>Здесь появятся книги после сохранения первого подхода.</Text>
        : s.books.map(b => <ReadingYearBookRow key={b.key} book={b} />)}
    </Wrapper></ContentBlock>
  </Wrapper>;
}
const styles = StyleSheet.create({
  track: { height: 4, borderRadius: 2, overflow: 'hidden' },
  fill: { height: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  cell: { flexGrow: 1, flexBasis: '45%', minWidth: 120, gap: 2, padding: 12, borderRadius: 12, borderCurve: 'continuous' },
});
