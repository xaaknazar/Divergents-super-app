import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { SF, SFName } from './SFIcon';

export interface StatusBadgeProps {
  label: string;
  icon?: SFName | string;
  tone?: 'neutral' | 'brand' | 'success' | 'warning' | 'danger' | 'inverse' | 'info';
  variant?: 'tinted' | 'solid' | 'surface' | 'media' | 'accentOverlay';
  size?: 'regular' | 'compact';
}
export function StatusBadge({ label, icon, tone = 'neutral', variant = 'tinted', size = 'regular' }: StatusBadgeProps) {
  const { T, ty } = useTheme();
  const colors = {
    neutral: [T.fillTertiary, T.label], brand: [T.brandTinted, T.brandText],
    success: [T.emeraldBadgeBg, T.greenText], warning: ['rgba(255,149,0,0.16)', T.orangeText],
    danger: ['rgba(255,59,48,0.14)', T.redText], inverse: ['rgba(255,255,255,0.20)', '#FFFFFF'],
    info: [T.skyBadgeBg, T.sky],
  }[tone];
  const solid = {
    neutral: [T.labelTertiary, T.systemBg], brand: [T.brand, T.onBrand], success: [T.green, T.onGreen],
    warning: [T.orange, T.onOrange], danger: [T.red, T.onRed], inverse: [T.label, T.systemBg], info: [T.skyBadgeBg, T.sky],
  }[tone];
  const [background, ink] = variant === 'solid' ? solid
    : variant === 'surface' ? [T.cardBg, colors[1]]
    : variant === 'media' ? ['rgba(0,0,0,0.55)', '#FFFFFF']
    : variant === 'accentOverlay' ? ['rgba(255,255,255,0.20)', T.onBrand] : colors;
  return <View style={[styles.container, size === 'compact' && styles.compact, { backgroundColor: background }]}>
    {icon ? <SF name={icon} size={11} color={ink} /> : null}
    <Text style={[ty.caption2Em, styles.label, { color: ink }]}>{label}</Text>
  </View>;
}
const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 4,
    maxWidth: '100%', paddingVertical: 4, paddingHorizontal: 10, borderRadius: 999, borderCurve: 'continuous' },
  label: { flexShrink: 1 },
  compact: { paddingVertical: 3, paddingHorizontal: 8 },
});
