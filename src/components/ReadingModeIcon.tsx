import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { SF } from './SFIcon';
/** Different silhouettes as well as labels: a flame for Extreme, a leaf for Moderate. */
export function ReadingModeIcon({ level }: { level: 'extreme' | 'moderate' }) {
  const { T } = useTheme();
  return <View testID={`reading-mode-${level}`} accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
    style={[styles.mark, { backgroundColor: T.brandTinted }]}>
    <SF name={level === 'moderate' ? 'leaf.fill' : 'flame.fill'} size={30} color={T.brandText} />
  </View>;
}
const styles = StyleSheet.create({ mark: { width: 64, height: 64, borderRadius: 24, alignItems: 'center', justifyContent: 'center' } });
