import React from 'react';
import { Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

export function TeamResultMetric({ value, label }: { value: string; label: string }) {
  const { T, ty } = useTheme();
  return <View style={{ alignItems: 'center', gap: 4 }}>
    <Text style={[ty.subheadEm, { color: T.label, textAlign: 'center', fontVariant: ['tabular-nums'] }]}>{value}</Text>
    <Text style={[ty.caption1, { color: T.labelSecondary, textAlign: 'center' }]}>{label}</Text>
  </View>;
}
