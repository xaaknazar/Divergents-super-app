// Soft "aurora" backdrop driven by the chosen background preset.
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../theme/ThemeContext';
import { hexToRgba } from '../theme/personalization';

export function Aurora({ height = 560 }: { height?: number }) {
  const { isDark, auroraColors } = useTheme();
  if (!auroraColors) return null;
  const a = isDark ? 0.24 : 0.16;
  const a2 = isDark ? 0.20 : 0.12;
  const [c1, c2, c3] = auroraColors;
  return (
    <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, height }}>
      <LinearGradient colors={[hexToRgba(c1, a), 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 0.85, y: 0.75 }} style={StyleSheet.absoluteFill} />
      <LinearGradient colors={[hexToRgba(c2, a), 'transparent']} start={{ x: 1, y: 0 }} end={{ x: 0.1, y: 0.7 }} style={StyleSheet.absoluteFill} />
      <LinearGradient colors={['transparent', hexToRgba(c3, a2), 'transparent']} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} style={StyleSheet.absoluteFill} />
    </View>
  );
}
