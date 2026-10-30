import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { SF } from './SFIcon';
import { IconTile } from './IconTile';
import { TappableSurface } from './TappableSurface';

/** «Мои книги и история ›» — вся карточка открывает книги и дневник по дням. */
export function ReadingHistoryLink({ onPress }: { onPress: () => void }) {
  const { T, ty } = useTheme();
  return <TappableSurface onPress={onPress} accessibilityLabel="Мои книги и история" accessibilityHint="Текущие книги, архив прочитанных и дневник по дням">
    <View style={styles.row}>
      <IconTile icon="books.vertical.fill" tone="violet" size="sm" />
      <View style={styles.copy}>
        <Text style={[ty.headline, { color: T.label }]}>Мои книги и история</Text>
        <Text style={[ty.footnote, { color: T.labelSecondary }]}>Текущие книги, прочитанные и дневник</Text>
      </View>
      <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants"><SF name="chevron.forward" size={16} color={T.labelTertiary} /></View>
    </View>
  </TappableSurface>;
}
const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingLeft: 14, paddingRight: 16, minHeight: 60 },
  copy: { flex: 1, minWidth: 0, gap: 3 },
});
