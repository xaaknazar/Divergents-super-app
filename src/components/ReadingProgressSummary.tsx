import React, { useState } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { ReadingBookSummary, ReadingDetail, readingDaysOf, readingPaceOf } from '../data/reading';
import { word } from '../data/plural';
import { fmtDecimal, fmtInt } from '../data/format';
import { useTheme } from '../theme/ThemeContext';
import { nums, radius } from '../theme/tokens';
import { ReadingTodayBooks } from './ReadingTodayBooks';
import { ReadingFlagRecovery } from './ReadingFlagRecovery';
import { SF } from './SFIcon';

const GOAL_MINUTES = 60;
/** Красным строка становится, только когда до конца дня остаётся меньше двух часов запаса. */
const URGENT_SLACK_MS = 2 * 3_600_000;
const durationOf = (ms: number) => {
  const total = Math.max(0, Math.floor(ms / 60000)), h = Math.floor(total / 60), m = total % 60;
  return h ? m ? `${h} ч ${m} мин` : `${h} ч` : `${m} мин`;
};

/** «Сегодня»: «18 / 60 мин» с полосой и строкой до 00:00 (серой, пока запас есть; красной в последние
 * часы), книги за день; ниже «За весь челлендж» — сетка 2×2 — средний темп
 * в страницах, дни чтения, красные флаги, страницы всего. Оба показателя доступны в рейтинге.
 * Без `todayMs` — только сетка (история). */
export function ReadingProgressSummary({ member, todayMs, dayLeftMs, books }: {
  member: NonNullable<ReadingDetail['me']>; todayMs?: number; books?: ReadingBookSummary[];
  /** Сколько осталось до конца дня по серверу. Без него строка нейтральная, без отсчёта. */
  dayLeftMs?: number;
}) {
  const { T, ty, textScale } = useTheme();
  const { fontScale, width } = useWindowDimensions();
  const [cardWidth, setCardWidth] = useState(width - 32);
  const single = fontScale * textScale > 1.3 || cardWidth < 300;
  const minutes = todayMs !== undefined ? Math.floor(todayMs / 60000) : 0;
  const left = Math.max(0, GOAL_MINUTES - minutes);
  // Утром «иначе красный флаг» только пугает: красный — когда запаса до полуночи мало.
  const urgent = left > 0 && dayLeftMs !== undefined && dayLeftMs - left * 60000 < URGENT_SLACK_MS;
  const deadline = !left ? { text: 'Час выполнен — сегодня без флага', tone: T.greenText, icon: 'checkmark.circle.fill' }
    : urgent ? { text: `До 00:00 — ${durationOf(dayLeftMs!)}. Нужно ещё ${left} мин, иначе красный флаг`, tone: T.redText, icon: 'flag.fill' }
    : { text: dayLeftMs !== undefined ? `Ещё ${left} мин чтения · до 00:00 ${durationOf(dayLeftMs)}` : `Ещё ${left} мин чтения до 00:00`, tone: T.labelSecondary, icon: 'clock' };
  const readingDays = readingDaysOf(member);
  // Единица — мелким шрифтом в той же строке: «22,3 стр/день» не переносится посередине.
  const cells = [
    { value: fmtDecimal(readingPaceOf(member)), unit: ' стр/день', label: 'средний темп', tone: T.label },
    { value: String(readingDays), label: `${word(readingDays, 'день', 'дня', 'дней')} чтения`, tone: T.label },
    { value: String(member.flags), label: word(member.flags, 'красный флаг', 'красных флага', 'красных флагов'), tone: member.flags ? T.redText : T.label },
    { value: fmtInt(member.pages), label: `${word(member.pages, 'страница', 'страницы', 'страниц')} всего`, tone: T.label },
  ];
  return <View onLayout={event => setCardWidth(event.nativeEvent.layout.width)}
    style={[styles.card, { backgroundColor: T.cardBg, borderColor: T.cardBorder }]}>
    {todayMs !== undefined ? <>
      <View style={styles.todayRow}>
        <Text accessibilityRole="header" style={[ty.headline, { color: T.label }]}>Сегодня</Text>
        <Text accessibilityLabel={`Сегодня ${minutes} из ${GOAL_MINUTES} минут`} style={[ty.title2, nums, { color: T.label }]}>
          {minutes}<Text style={[ty.callout, nums, { color: T.labelSecondary }]}> / {GOAL_MINUTES} мин</Text>
        </Text>
      </View>
      <View accessible={false} style={[styles.track, { backgroundColor: T.fillTertiary }]}>
        <View style={[styles.fill, { width: `${Math.min(1, minutes / GOAL_MINUTES) * 100}%`, backgroundColor: left ? T.brandText : T.greenText }]} />
      </View>
      <View style={styles.deadline}>
        <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants"><SF name={deadline.icon} size={14} color={deadline.tone} /></View>
        <Text accessibilityLiveRegion="polite" style={[urgent ? ty.footnoteEm : ty.footnote, nums, styles.flex, { color: deadline.tone }]}>{deadline.text}</Text>
      </View>
      {books ? <><View style={[styles.rule, { backgroundColor: T.separator }]} /><ReadingTodayBooks books={books} /></> : null}
      <View style={[styles.rule, { backgroundColor: T.separator }]} />
      <Text accessibilityRole="header" style={[ty.subheadEm, { color: T.labelSecondary }]}>За весь челлендж</Text>
    </> : null}
    <View style={styles.grid}>
      {cells.map((c, i) => <View key={c.label} style={[styles.cell, single ? styles.full : styles.half,
        !single && i % 2 === 1 && [styles.divided, { borderLeftColor: T.separator }]]}>
        <Text style={[ty.title3, nums, { color: c.tone }]}>{c.value}{c.unit
          ? <Text style={[ty.subheadEm, nums, { color: T.labelSecondary }]}>{c.unit}</Text> : null}</Text>
        <Text style={[ty.footnote, { color: T.labelSecondary }]}>{c.label}</Text>
      </View>)}
    </View>
    {member.flagRecovery ? <ReadingFlagRecovery flags={member.flags} recovery={member.flagRecovery} /> : null}
  </View>;
}
const styles = StyleSheet.create({
  card: { borderRadius: radius.block, borderCurve: 'continuous', borderWidth: 1, padding: 16, gap: 12 },
  todayRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' },
  track: { height: 6, borderRadius: 3, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 3 },
  rule: { height: 0.5, marginVertical: 2 },
  deadline: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  flex: { flex: 1, minWidth: 0 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 14 },
  cell: { gap: 2, paddingRight: 8 },
  half: { width: '50%' },
  full: { width: '100%' },
  divided: { borderLeftWidth: 0.5, paddingLeft: 12 },
});
