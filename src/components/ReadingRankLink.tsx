import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { participantsOf } from '../data/reading';
import { useTheme } from '../theme/ThemeContext';
import { nums } from '../theme/tokens';
import { SF } from './SFIcon';
import { TappableSurface } from './TappableSurface';

/** Оба места из одного списка участников; карточка открывает переключаемый рейтинг. */
export function ReadingRankLink({ place, pagesPlace, participants, onPress }: {
  /** Место по среднему темпу. */
  place: number | null; pagesPlace: number | null; participants: number;
  onPress: () => void;
}) {
  const { T, ty } = useTheme();
  const main = place != null ? `${place} место из ${participantsOf(participants)}` : 'Открыть рейтинг участников';
  const pages = pagesPlace != null ? `По страницам: ${pagesPlace} место из ${participantsOf(participants)}` : 'По страницам: место пока недоступно';
  return <TappableSurface onPress={onPress} accessibilityLabel={`Мой рейтинг. По среднему темпу: ${main}. ${pages}`}
    accessibilityHint="Открыть рейтинг и выбрать средний темп или всего страниц">
    <View style={styles.row}>
      <View style={[styles.badge, { backgroundColor: T.brandTinted }]}>
        {place != null ? <Text style={[ty.headline, nums, { color: T.brandText }]} numberOfLines={1}>{place}</Text>
          : <SF name="chart.bar.fill" size={20} color={T.brandText} />}
      </View>
      <View style={styles.copy}>
        <Text style={[ty.footnote, { color: T.labelSecondary }]}>Мой рейтинг</Text>
        <Text style={[ty.footnote, { color: T.labelSecondary }]}>По среднему темпу</Text>
        <Text style={[ty.headline, nums, { color: T.label }]}>{main}</Text>
        <Text style={[ty.subhead, nums, { color: T.labelSecondary }]}>{pages}</Text>
      </View>
      <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants"><SF name="chevron.forward" size={16} color={T.labelTertiary} /></View>
    </View>
  </TappableSurface>;
}
const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, paddingLeft: 14, paddingRight: 16, minHeight: 64 },
  badge: { minWidth: 44, height: 44, borderRadius: 13, borderCurve: 'continuous', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  copy: { flex: 1, minWidth: 0, gap: 2 },
});
