import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { SF } from './SFIcon';
import { movementLabel } from './StandingsTable';
export function RankMovement({ change }: { change: number | null }) {
  const { T, ty } = useTheme();
  const color = change == null || change === 0 ? T.labelSecondary : change > 0 ? T.greenText : T.redText;
  return <View accessible accessibilityLabel={movementLabel(change, 'member')} style={styles.row}>
    {change ? <SF name={change > 0 ? 'arrowtriangle.up.fill' : 'arrowtriangle.down.fill'} size={9} color={color} /> : null}
    <Text style={[ty.footnoteEm, styles.number, { color }]}>{change == null ? '' : change === 0 ? '–' : Math.abs(change)}</Text>
  </View>;
}
const styles = StyleSheet.create({ row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 3, minWidth: 32 }, number: { fontVariant: ['tabular-nums'] } });
