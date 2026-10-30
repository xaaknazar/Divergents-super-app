import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { participantsOf } from '../data/reading';
import { useTheme } from '../theme/ThemeContext';
import { nums } from '../theme/tokens';
import { SF } from './SFIcon';
import { TappableSurface } from './TappableSurface';

/** Оба места из одного списка участников; карточка открывает переключаемый рейтинг.
 * Два места — двумя равными колонками: «4 из 5 · по темпу» и «4 из 5 · по страницам». */
export function ReadingRankLink({ place, pagesPlace, participants, onPress }: {
  /** Место по среднему темпу. */
  place: number | null; pagesPlace: number | null; participants: number;
  onPress: () => void;
}) {
  const { T, ty } = useTheme();
  const main = place != null ? `${place} место из ${participantsOf(participants)}` : 'Открыть рейтинг участников';
  const pages = pagesPlace != null ? `По страницам: ${pagesPlace} место из ${participantsOf(participants)}` : 'По страницам: место пока недоступно';
  const metric = (value: number | null, label: string) => <View style={styles.metric}>
    <Text style={[ty.title2, nums, { color: value != null ? T.label : T.labelTertiary }]}>
      {value != null ? value : '—'}<Text style={[ty.subhead, nums, { color: T.labelSecondary }]}> из {participants}</Text>
    </Text>
    <Text style={[ty.footnote, { color: T.labelSecondary }]}>{label}</Text>
  </View>;
  return <TappableSurface onPress={onPress} accessibilityLabel={`Мой рейтинг. По среднему темпу: ${main}. ${pages}`}
    accessibilityHint="Открыть рейтинг и выбрать средний темп или всего страниц">
    <View style={styles.root}>
      <View style={styles.heading}>
        <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants"><SF name="trophy.fill" size={16} color={T.brandText} /></View>
        <Text style={[ty.headline, styles.flex, { color: T.label }]}>Мой рейтинг</Text>
        <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants"><SF name="chevron.forward" size={16} color={T.labelTertiary} /></View>
      </View>
      <View style={styles.metrics}>
        {metric(place, 'по среднему темпу')}
        <View style={[styles.divider, { backgroundColor: T.separator }]} />
        {metric(pagesPlace, 'по страницам')}
      </View>
    </View>
  </TappableSurface>;
}
const styles = StyleSheet.create({
  root: { paddingVertical: 14, paddingHorizontal: 16, gap: 10, minHeight: 64 },
  heading: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  flex: { flex: 1, minWidth: 0 },
  metrics: { flexDirection: 'row', alignItems: 'stretch', gap: 14 },
  metric: { flex: 1, minWidth: 0, gap: 2 },
  divider: { width: 0.5 },
});
