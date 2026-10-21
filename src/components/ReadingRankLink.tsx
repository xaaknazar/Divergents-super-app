import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { participantsOf } from '../data/reading';
import { useTheme } from '../theme/ThemeContext';
import { nums } from '../theme/tokens';
import { SF } from './SFIcon';
import { TappableSurface } from './TappableSurface';

/** «Мой рейтинг · 31 место из 48 участников ›». Вся карточка открывает «Рейтинг участников». */
export function ReadingRankLink({ place, participants, onPress }: {
  place: number | null; participants: number;
  onPress: () => void;
}) {
  const { T, ty } = useTheme();
  const main = place != null ? `${place} место из ${participantsOf(participants)}` : 'Открыть рейтинг участников';
  return <TappableSurface onPress={onPress} accessibilityLabel={`Мой рейтинг. ${main}`} accessibilityHint="Открыть рейтинг участников">
    <View style={styles.row}>
      <View style={[styles.badge, { backgroundColor: T.brandTinted }]}>
        {place != null ? <Text style={[ty.headline, nums, { color: T.brandText }]} numberOfLines={1}>{place}</Text>
          : <SF name="chart.bar.fill" size={20} color={T.brandText} />}
      </View>
      <View style={styles.copy}>
        <Text style={[ty.footnote, { color: T.labelSecondary }]}>Мой рейтинг</Text>
        <Text style={[ty.headline, nums, { color: T.label }]}>{main}</Text>
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
