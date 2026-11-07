import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { GlassSurface } from './GlassSurface';
import { SF } from './SFIcon';

export function SeasonButton({ season, onPress }: { season?: number | null; onPress: () => void }) {
  const { ty } = useTheme();
  return <Pressable accessibilityRole="button" accessibilityLabel={season ? `Сезон ${season}. Выбрать сезон` : 'Выбрать сезон'} onPress={onPress}>
    <GlassSurface interactive variant="navigation" style={styles.capsule}>
      <Text style={[ty.headline, { color: '#FFFFFF' }]}>{season ? `Сезон ${season}` : 'Сезоны'}</Text>
      <SF name="chevron.down" size={15} color="#FFFFFF" />
    </GlassSurface>
  </Pressable>;
}
const styles = StyleSheet.create({ capsule: { minHeight: 44, borderRadius: 24, paddingHorizontal: 16, paddingVertical: 10, flexDirection: 'row', gap: 8, alignItems: 'center' } });
