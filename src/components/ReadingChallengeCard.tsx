import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import type { ReadingCatalogItem } from '../data/reading';
import { readingDateLabel } from '../data/readingCreation';
import { days } from '../data/plural';
import { useTheme } from '../theme/ThemeContext';
import { radius, shadows } from '../theme/tokens';
import { SF } from './SFIcon';
import { ReadingCardStyle } from '../data/readingAppearance';
import { ReadingBookIllustration } from './ReadingBookIllustration';
import { Wrapper } from './Wrapper';

/** A complete catalog card, not a styleable shell. Placement belongs to Shelf.
 * «Тишина и бумага», handoff 2026-10-20 §6: заголовок раздела даёт секция; в карточке —
 * цель, название (≤ 2 строк), одна строка статуса, книга справа и строка-действие. Вся карточка — одна кнопка. */
export function ReadingChallengeCard({ challenge: c, onPress, variant = 'feature' }: { challenge: ReadingCatalogItem; onPress: () => void; variant?: ReadingCardStyle }) {
  const { T, ty, textScale, isDark } = useTheme();
  const { width, fontScale } = useWindowDimensions();
  const [cardWidth, setCardWidth] = useState<number | null>(null);
  const [focused, setFocused] = useState(false);
  const compact = variant === 'compact';
  // Узкая карточка или крупный шрифт: книга уходит наверх, название не обрезается.
  const stacked = (cardWidth ?? width - 32) < 300 || fontScale * textScale > 1.15;
  const status = c.phase === 'finished' ? 'Завершён' : c.phase === 'upcoming' ? `Старт ${readingDateLabel(c.startDate)}` : 'Идёт';
  const dot = c.phase === 'finished' ? T.labelTertiary : c.membership === 'pending' ? T.orangeText : c.phase === 'upcoming' ? T.brandAccent : T.greenText;
  const note = c.membership === 'approved' ? 'Вы участвуете' : null;
  const action = c.phase === 'finished' ? 'Смотреть итоги' : c.membership === 'pending' ? 'Заявка на рассмотрении'
    : c.phase === 'active' ? c.membership === 'approved' ? 'Продолжить чтение' : c.mode === 'continuous' ? 'Выбрать команду' : 'Смотреть рейтинг' : 'Выбрать команду';
  const period = c.mode === 'continuous' ? null : days(c.durationDays);
  const goal = `60 минут в день${period ? ` · ${period}` : ''}`;
  return <View style={[styles.lift, isDark ? null : shadows.tappable]}>
    <Pressable onPress={onPress} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
      onLayout={event => setCardWidth(Math.round(event.nativeEvent.layout.width))}
      accessibilityRole="button" accessibilityLabel={`${c.title}. ${status}${note ? `. ${note}` : ''}. ${goal}. ${action}`}
      style={({ pressed }) => [styles.card, { backgroundColor: T.cardBg, borderColor: focused ? T.brandText : T.cardBorder, opacity: pressed ? 0.8 : 1 }]}>
      {compact ? <View style={styles.compactRow}>
        <ReadingBookIllustration placement="thumb" />
        <View style={styles.copy}>
          <Text numberOfLines={stacked ? undefined : 1} style={[ty.caption1, { color: T.labelSecondary }]}>Reading challenge · {goal}</Text>
          <Text numberOfLines={stacked ? undefined : 2} style={[ty.headline, { color: T.label }]}>{c.title}</Text>
          <Text style={[ty.subheadEm, { color: T.brandText }]}>{action}</Text>
        </View>
        <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants"><SF name="chevron.forward" size={16} color={T.brandText} /></View>
      </View> : <>
        <Wrapper testID="reading-paper-composition" dir={stacked ? 'column' : 'row'} gap={12} align={stacked ? 'stretch' : 'center'}
          paddingHorizontal={16} paddingTop={16}>
          {stacked ? <Wrapper align="flex-end"><ReadingBookIllustration placement="card" /></Wrapper> : null}
          <Wrapper flex={stacked ? undefined : 1} gap={4}>
            <Text style={[ty.footnote, { color: T.labelSecondary }]}>{goal}</Text>
            <Text numberOfLines={stacked ? undefined : 2} style={[ty.title3, { color: T.label }]}>{c.title}</Text>
            <View style={styles.status}>
              <View style={[styles.dot, { backgroundColor: dot }]} />
              <Text numberOfLines={stacked ? undefined : 1} style={[ty.footnote, styles.shrink, { color: T.labelSecondary }]}>
                {status}{note ? <Text style={[ty.footnoteEm, { color: T.brandText }]}> · {note}</Text> : null}
              </Text>
            </View>
          </Wrapper>
          {!stacked ? <ReadingBookIllustration placement="card" /> : null}
        </Wrapper>
        <View style={[styles.footer, { borderTopColor: T.separator }]}>
          <Text style={[ty.subheadEm, styles.shrink, { color: T.brandText }]}>{action}</Text>
          <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants"><SF name="arrow.right" size={20} color={T.brandText} /></View>
        </View>
      </>}
    </Pressable>
  </View>;
}
const styles = StyleSheet.create({
  lift: { borderRadius: radius.block, borderCurve: 'continuous' },
  card: { borderRadius: radius.block, borderCurve: 'continuous', overflow: 'hidden', borderWidth: 1 },
  compactRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, paddingLeft: 16, paddingRight: 14 },
  copy: { flex: 1, minWidth: 0, gap: 3 },
  status: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 2 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  footer: { minHeight: 48, marginTop: 12, marginHorizontal: 16, borderTopWidth: 0.5, gap: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  shrink: { flexShrink: 1 },
});
