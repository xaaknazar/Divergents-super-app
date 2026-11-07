import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../theme/ThemeContext';

const METALS = [
  { colors: ['#FFF0C5', '#EFCE87', '#D7AD58'], ink: '#684719', rim: '#C9A15A' },
  { colors: ['#F7FAFC', '#DCE3EB', '#AEBDCD'], ink: '#455566', rim: '#A6B6C8' },
  { colors: ['#F8E3D3', '#DFB596', '#C08B66'], ink: '#6C4029', rim: '#B98665' },
] as const;
/** A numbered medal, never an avatar or a decoration beside a person's name. */
export function RankMedal({ rank }: { rank: number }) {
  const { T, ty } = useTheme();
  const metal = rank >= 1 && rank <= 3 ? METALS[rank - 1] : null;
  if (!metal) return <Text style={[ty.body, styles.number, { color: T.label }]}>{rank || '—'}</Text>;
  return <View testID={`rank-medal-${rank}`} accessible={false} style={styles.medal}>
    <LinearGradient colors={metal.colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.disc, { borderColor: metal.rim }]}>
      <View style={[styles.rim, { borderColor: metal.ink }]} />
      <Text allowFontScaling={false} style={[styles.digit, { color: metal.ink }]}>{rank}</Text>
    </LinearGradient>
  </View>;
}
const styles = StyleSheet.create({
  medal: { width: 30, height: 30, shadowColor: '#000', shadowOpacity: 0.08, shadowOffset: { width: 0, height: 2 }, shadowRadius: 3 },
  disc: { flex: 1, borderWidth: 1, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  rim: { position: 'absolute', top: 3, bottom: 3, left: 3, right: 3, borderRadius: 12, borderWidth: 0.5, opacity: 0.22 },
  digit: { fontSize: 15, fontWeight: '700', fontVariant: ['tabular-nums'] },
  number: { textAlign: 'center', fontVariant: ['tabular-nums'] },
});
