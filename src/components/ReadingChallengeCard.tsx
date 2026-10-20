import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import type { ReadingCatalogItem } from '../data/reading';
import { readingDateLabel } from '../data/readingCreation';
import { days } from '../data/plural';
import { useTheme } from '../theme/ThemeContext';
import { radius } from '../theme/tokens';
import { SF } from './SFIcon';
import { StatusBadge } from './StatusBadge';
import { ReadingCardStyle } from '../data/readingAppearance';
import { ReadingBookIllustration } from './ReadingBookIllustration';
import { Wrapper } from './Wrapper';

/** A complete catalog card, not a styleable shell. Placement belongs to Shelf. */
export function ReadingChallengeCard({ challenge: c, onPress, variant = 'feature' }: { challenge: ReadingCatalogItem; onPress: () => void; variant?: ReadingCardStyle }) {
  const { T, ty, textScale } = useTheme();
  const { width, fontScale } = useWindowDimensions();
  const [cardWidth, setCardWidth] = useState<number | null>(null);
  const [focused, setFocused] = useState(false);
  const compact = variant === 'compact';
  const stacked = (cardWidth ?? width - 32) < 350 || fontScale * textScale > 1.15;
  const status = c.phase === 'finished' ? 'Завершён' : c.phase === 'upcoming' ? 'Открыт набор' : 'Челлендж идёт';
  const action = c.phase === 'finished' ? 'Смотреть итоги' : c.membership === 'pending' ? 'Заявка на рассмотрении'
    : c.phase === 'active' ? c.membership === 'approved' ? 'Продолжить чтение' : c.mode === 'continuous' ? 'Выбрать команду' : 'Смотреть рейтинг' : 'Выбрать команду';
  const period = c.mode === 'continuous' ? null : days(c.durationDays);
  return <Pressable onPress={onPress} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
    onLayout={event => setCardWidth(Math.round(event.nativeEvent.layout.width))}
    accessibilityRole="button" accessibilityLabel={`${c.title}. ${status}. 60 минут в день.${period ? ` ${period}.` : ''} ${action}`}
    style={({ pressed }) => [styles.card, { backgroundColor: T.cardBg, borderColor: focused ? T.brandText : T.cardBorder, opacity: pressed ? 0.8 : 1 }]}>
    {compact ? <View style={styles.compactHero}>
      <View style={styles.topline}>
        <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[styles.icon, { backgroundColor: T.brandTinted }]}>
          <SF name="book.fill" size={24} color={T.brandText} />
        </View>
        <Text style={[ty.footnoteEm, styles.shrink, { color: T.brandText }]}>{status}</Text>
      </View>
      <Text style={[ty.headline, { color: T.label }]}>{c.title}</Text>
      {c.phase === 'upcoming' ? <Text style={[ty.subhead, { color: T.labelSecondary }]}>{`Старт ${readingDateLabel(c.startDate)}`}</Text> : null}
    </View> : <View style={styles.paperHero}>
      <Wrapper testID="reading-paper-composition" dir={stacked ? 'column' : 'row'} gap={16} align={stacked ? 'stretch' : 'center'}>
        {stacked ? <Wrapper align="flex-end"><ReadingBookIllustration placement="header" /></Wrapper> : null}
        <Wrapper flex={stacked ? undefined : 1} gap={12}>
          <Text style={[ty.subhead, { color: T.labelSecondary }]}>Reading challenge</Text>
          <Text style={[ty.title2, { color: T.label }]}>{c.title}</Text>
          <Text style={[ty.callout, { color: T.labelSecondary }]}>60 минут в день</Text>
        </Wrapper>
        {!stacked ? <ReadingBookIllustration /> : null}
      </Wrapper>
      <Text style={[ty.footnote, { color: T.labelSecondary }]}>{c.phase === 'upcoming'
        ? `${status} · Старт ${readingDateLabel(c.startDate)}` : status}{period ? ` · ${period}` : ''}</Text>
    </View>}
    <View style={[styles.body, !compact && styles.paperBody]}>
      {compact ? <View style={styles.badges}>
        <StatusBadge label="60 мин в день" icon="clock" tone="brand" />
        {period ? <StatusBadge label={period} icon="calendar" /> : null}
        {c.membership === 'approved' ? <StatusBadge label="Вы участвуете" icon="checkmark.circle.fill" tone="success" /> : null}
      </View> : c.membership === 'approved' ? <Text style={[ty.footnoteEm, { color: T.brandText }]}>Вы участвуете</Text> : null}
      <View style={[styles.footer, { borderTopColor: T.separator }]}>
        <Text style={[ty.subheadEm, styles.shrink, { color: T.brandText }]}>{action}</Text>
        <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants"><SF name={compact ? 'chevron.forward' : 'arrow.right'} size={compact ? 14 : 22} color={T.brandText} /></View>
      </View>
    </View>
  </Pressable>;
}
const styles = StyleSheet.create({
  card: { borderRadius: radius.block, borderCurve: 'continuous', overflow: 'hidden', borderWidth: 1 },
  topline: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  paperHero: { padding: 20, paddingBottom: 0, gap: 20 },
  compactHero: { padding: 16, paddingBottom: 0, gap: 8 },
  icon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  body: { padding: 16, gap: 16 }, paperBody: { padding: 20 }, badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  footer: { minHeight: 48, borderTopWidth: 0.5, paddingTop: 12, gap: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  shrink: { flexShrink: 1 },
});
