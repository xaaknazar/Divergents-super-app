import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { participantsOf, ReadingPeriod } from '../data/reading';
import { useTheme } from '../theme/ThemeContext';
import { minTouch } from '../theme/tokens';
import { ContentBlock } from './ContentBlock';
import { IconTile, IconTileTone } from './IconTile';
import { SF, SFName } from './SFIcon';

/**
 * Переходы экрана чтения одним списком, как в «Настройках» iOS: «Статистика», «Мой рейтинг»,
 * «Мои книги и история». Раньше это были три карточки разного вида (с тенью и без, иконка то
 * глифом, то плашкой) — одинаковые по смыслу строки теперь и выглядят одинаково.
 */
export function ReadingLinksGroup({ statistics, rank, onHistory }: {
  /** Нет — строка скрыта (например, год уже завершён и итоги показаны выше). */
  statistics?: { period?: ReadingPeriod; onPress?: () => void };
  /** `place` — место по среднему темпу, `pagesPlace` — по страницам. */
  rank: { place: number | null; pagesPlace: number | null; participants: number; onPress: () => void };
  onHistory?: () => void;
}) {
  const { T } = useTheme();
  const of = participantsOf(rank.participants);
  const rankLabel = `Мой рейтинг. ${rank.pagesPlace != null ? `По страницам: ${rank.pagesPlace} место из ${of}` : 'По страницам: место пока недоступно'}. По среднему темпу: ${rank.place != null ? `${rank.place} место из ${of}` : 'Открыть рейтинг участников'}`;
  // Части переносятся целиком: «4 из 5 по страницам» / «4 из 5 по темпу», а не «… по / темпу».
  const rankDetail = rank.pagesPlace == null && rank.place == null ? ['Места появятся после первого дня']
    : [`${rank.pagesPlace ?? '—'} из ${rank.participants} по страницам`, `${rank.place ?? '—'} из ${rank.participants} по темпу`];
  const rows: RowProps[] = [];
  if (statistics) rows.push({ icon: 'chart.bar.fill', tone: 'brand', title: 'Статистика', label: 'Статистика чтения', onPress: statistics.onPress,
    detail: statistics.period ? `День ${statistics.period.personalDay} из ${statistics.period.totalDays} · ваш год чтения` : 'Прогресс и карточки для сторис' });
  rows.push({ icon: 'trophy.fill', tone: 'orange', title: 'Мой рейтинг', detail: rankDetail, label: rankLabel, onPress: rank.onPress,
    hint: 'Открыть рейтинг: всего страниц или средний темп' });
  if (onHistory) rows.push({ icon: 'books.vertical.fill', tone: 'violet', title: 'Мои книги и история', detail: 'Текущие, прочитанные и дневник',
    label: 'Мои книги и история', hint: 'Текущие книги, архив прочитанных и дневник по дням', onPress: onHistory });
  return <ContentBlock size="flush">
    {rows.map((row, i) => <React.Fragment key={row.title}>
      {i > 0 ? <View style={[styles.separator, { backgroundColor: T.separator }]} /> : null}
      <Row {...row} />
    </React.Fragment>)}
  </ContentBlock>;
}

interface RowProps { icon: SFName; tone: IconTileTone; title: string; detail: string | string[]; label: string; hint?: string; onPress?: () => void }
function Row({ icon, tone, title, detail, label, hint, onPress }: RowProps) {
  const { T, ty } = useTheme();
  return <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} accessibilityHint={hint}
    style={({ pressed }) => [styles.row, { opacity: pressed ? 0.6 : 1 }]}>
    <IconTile icon={icon} tone={tone} size="sm" />
    <View style={styles.copy}>
      <Text style={[ty.headline, { color: T.label }]}>{title}</Text>
      <View style={styles.detail}>
        {(Array.isArray(detail) ? detail : [detail]).map((part, i, all) => <Text key={i} style={[ty.footnote, { color: T.labelSecondary }]}>
          {part}{i < all.length - 1 ? ' ·' : ''}
        </Text>)}
      </View>
    </View>
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants"><SF name="chevron.forward" size={14} color={T.labelTertiary} /></View>
  </Pressable>;
}
const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11, paddingHorizontal: 16, minHeight: minTouch + 12 },
  copy: { flex: 1, minWidth: 0, gap: 2 },
  detail: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 4 },
  // Разделитель начинается от текста, а не от края — как в списках iOS (16 + плашка 36 + 12).
  separator: { height: StyleSheet.hairlineWidth, marginLeft: 64 },
});
