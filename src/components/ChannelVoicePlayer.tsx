import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { radius } from '../theme/tokens';
import { SF } from './SFIcon';

/** Одинаковая для одного поста «волна»: высоты полос из его идентификатора. */
function waveHeights(seed: string, n = 28): number[] {
  let h = 0; for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const out: number[] = [];
  for (let i = 0; i < n; i++) { h = (h * 1103515245 + 12345) >>> 0; out.push(6 + (h % 18)); }
  return out;
}

/** Голосовая публикация: кнопка воспроизведения и волна; играет — волна цвета бренда. */
export function ChannelVoicePlayer({ seed, playing, onToggle }: { seed: string; playing: boolean; onToggle: () => void }) {
  const { T, ty } = useTheme();
  return <Pressable onPress={onToggle} accessibilityRole="button" accessibilityLabel={playing ? 'Пауза' : 'Слушать голосовое сообщение'}
    accessibilityState={{ selected: playing }}
    style={({ pressed }) => [styles.box, { backgroundColor: T.fillTertiary, opacity: pressed ? 0.8 : 1 }]}>
    <View style={[styles.play, { backgroundColor: T.brand }]}><SF name={playing ? 'pause.fill' : 'play.fill'} size={18} color={T.onBrand} /></View>
    <View style={styles.track}>
      <View style={styles.wave} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        {waveHeights(seed).map((h, i) => <View key={i} style={[styles.bar, { height: h, backgroundColor: playing ? T.brandText : T.labelTertiary }]} />)}
      </View>
      <Text style={[ty.footnote, { color: playing ? T.brandText : T.labelSecondary }]}>{playing ? 'Играет…' : 'Голосовое сообщение'}</Text>
    </View>
  </Pressable>;
}
const styles = StyleSheet.create({
  box: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, borderRadius: radius.xl, borderCurve: 'continuous' },
  play: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  track: { flex: 1, minWidth: 0, gap: 4 },
  wave: { flexDirection: 'row', alignItems: 'center', gap: 3, height: 26, overflow: 'hidden' },
  bar: { width: 3, borderRadius: 2 },
});
