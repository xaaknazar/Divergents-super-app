import React from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

export interface FieldValueRowProps {
  label: string;
  value?: string | null;
  hideWhenEmpty?: boolean;
}
export function FieldValueRow({ label, value, hideWhenEmpty = false }: FieldValueRowProps) {
  const { T, ty } = useTheme();
  if (hideWhenEmpty && !value) return null;
  return <View style={styles.row}>
    <Text style={[ty.subhead, styles.label, { color: T.labelSecondary }]}>{label}</Text>
    <Text style={[ty.subhead, styles.value, { color: T.label }]}>{value}</Text>
  </View>;
}
const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  label: { flexShrink: 0, maxWidth: '45%' },
  value: { flex: 1, textAlign: 'right' },
});
