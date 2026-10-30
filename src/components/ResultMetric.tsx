import React from 'react';
import { Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { radius } from '../theme/tokens';
import { SF } from './SFIcon';

export function ResultMetric({ kind, value, label }: { kind: 'reading' | 'walking' | 'sugar' | 'focus' | 'completed'; value: string; label: string }) {
  const { T, ty } = useTheme();
  const icon = { reading: 'book.fill', walking: 'figure.walk', sugar: 'cube.fill', focus: 'clock', completed: 'checkmark.circle.fill' }[kind];
  return <View testID={`result-metric-${kind}`} accessible accessibilityLabel={`${value} ${label}`} style={{
    flexGrow: 1, alignItems: 'center', gap: 8, padding: 14,
    backgroundColor: T.cardBg, borderRadius: radius.block, borderCurve: 'continuous',
    borderWidth: 0.5, borderColor: T.cardBorder,
  }}>
    <SF name={icon} size={22} color={T.brandText} />
    <Text style={[ty.title3, { color: T.label, textAlign: 'center', fontVariant: ['tabular-nums'] }]}>{value}</Text>
    <Text style={[ty.footnote, { color: T.labelSecondary, textAlign: 'center', minHeight: (ty.footnote.lineHeight ?? 20) * 2 }]}>{label}</Text>
  </View>;
}
