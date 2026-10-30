// Шапка «Мои тренировки» (handoff 2026-10-20, §5a): градиент бренда от самого верха,
// прозрачный навбар, справа — рисунок беговой дорожки и стеклянная плашка 56 с иконкой раздела.
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Pressable,StyleSheet,Text,View } from 'react-native';
import Svg,{ Rect } from 'react-native-svg';
import { hTap } from '../lib/haptics';
import { useTheme } from '../theme/ThemeContext';
import { nums } from '../theme/tokens';
import { NavHeader } from './NavHeader';
import { SF } from './SFIcon';

export interface FitnessHeroProps {
  backLabel: string;
  eyebrow: string;
  title: string;
  stats: readonly { value: string; label: string }[];
  recordLabel: string;
  historyLabel: string;
  onBack: () => void;
  onRecord: () => void;
  onHistory: () => void;
}

/** Четыре «стадионные» дорожки, одна пунктиром; линии гаснут к центру. */
function Lanes() {
  return <Svg width={320} height={190} viewBox="0 0 320 190">
    <Rect x={10} y={10} width={300} height={170} rx={85} fill="none" stroke="rgba(255,255,255,0.16)" strokeWidth={1.5} />
    <Rect x={26} y={26} width={268} height={138} rx={69} fill="none" stroke="rgba(255,255,255,0.13)" strokeWidth={1.5} strokeDasharray="7 7" />
    <Rect x={42} y={42} width={236} height={106} rx={53} fill="none" stroke="rgba(255,255,255,0.10)" strokeWidth={1.5} />
    <Rect x={58} y={58} width={204} height={74} rx={37} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={1.5} />
  </Svg>;
}

function HeroButton({ icon, label, onPress, solid }: { icon: string; label: string; onPress: () => void; solid?: boolean }) {
  const { ty } = useTheme();
  return <Pressable onPress={() => { hTap(); onPress(); }} accessibilityRole="button" accessibilityLabel={label}
    style={({ pressed }) => [styles.button, { backgroundColor: solid ? '#FFFFFF' : 'rgba(255,255,255,0.18)', opacity: pressed ? 0.8 : 1 }]}>
    <SF name={icon} size={16} color={solid ? '#234088' : '#FFFFFF'} />
    <Text style={[ty.subheadEm, { color: solid ? '#234088' : '#FFFFFF' }]} numberOfLines={1}>{label}</Text>
  </Pressable>;
}

export function FitnessHero({ backLabel, eyebrow, title, stats, recordLabel, historyLabel, onBack, onRecord, onHistory }: FitnessHeroProps) {
  const { T, ty } = useTheme();
  return <LinearGradient colors={[T.brand, T.brandAccent]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.root}>
    <NavHeader backLabel={backLabel} onBack={onBack} variant="hero" />
    <View style={styles.body}>
      <View pointerEvents="none" style={styles.lanes}><Lanes /></View>
      <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.glass}>
        <SF name="figure.run" size={28} color="#FFFFFF" />
      </View>
      <Text style={[ty.caption1, styles.eyebrow]}>{eyebrow}</Text>
      <Text accessibilityRole="header" style={[ty.largeTitle, styles.title]} numberOfLines={1}>{title}</Text>
      <View style={styles.stats}>
        {stats.map((s, i) => <View key={i} style={styles.stat}>
          <Text style={[ty.title2, nums, { color: '#FFFFFF' }]} numberOfLines={1}>{s.value}</Text>
          <Text style={[ty.caption2, { color: 'rgba(255,255,255,0.8)' }]} numberOfLines={1}>{s.label}</Text>
        </View>)}
      </View>
      <View style={styles.actions}>
        <HeroButton icon="figure.run" label={recordLabel} onPress={onRecord} solid />
        <HeroButton icon="list.bullet" label={historyLabel} onPress={onHistory} />
      </View>
    </View>
  </LinearGradient>;
}

const styles = StyleSheet.create({
  root: { overflow: 'hidden' },
  body: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 22 },
  lanes: { position: 'absolute', right: -150, top: -60 },
  glass: { position: 'absolute', right: 16, top: 4, width: 56, height: 56, borderRadius: 17, borderCurve: 'continuous',
    alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.28)' },
  eyebrow: { color: 'rgba(255,255,255,0.8)', textTransform: 'uppercase', letterSpacing: 0.6, paddingRight: 72 },
  title: { color: '#FFFFFF', marginTop: 2, paddingRight: 64 },
  stats: { flexDirection: 'row', marginTop: 16 },
  stat: { flex: 1, minWidth: 0 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 16 },
  button: { flex: 1, minWidth: 0, minHeight: 46, borderRadius: 13, borderCurve: 'continuous', flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center', gap: 7, paddingHorizontal: 10 },
});
