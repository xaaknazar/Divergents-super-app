// CardMotif — декоративная заливка тематической карточки (handoff 2026-10-20, §5):
// подкрашенный градиент + одна бледная иллюстрация справа. Кладётся первым слоем
// внутрь карточки с overflow: hidden; на касания не реагирует, скринридер её не видит.
// challenge / challengeDark — пламя, trip — горы и солнце, sport — беговая дорожка.
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { StyleSheet,View } from 'react-native';
import Svg,{ Circle,Defs,G,Path,RadialGradient,Rect,Stop } from 'react-native-svg';
import { useTheme } from '../theme/ThemeContext';

export type CardMotifKind = 'challenge' | 'challengeDark' | 'trip' | 'sport';

const FLAME = 'M13.258 15.172a4 4 0 0 1 0 5.657L12 22.086l-1.258-1.257a4 4 0 0 1 0-5.657L12 13.915zm-2.4-14.162c2.197-.314 4.75.926 6.685 2.994C19.518 6.115 21 9.231 21 13.001c0 4.331-2.708 7.686-6.06 8.952a6 6 0 0 0-.268-8.195l-1.965-1.964a1 1 0 0 0-1.414 0l-1.965 1.965a6 6 0 0 0-.19 8.285C5.8 20.964 3 18.047 3 14c0-2.39.826-4.004 2.046-5.14C6.206 7.784 7.68 7.189 8.79 6.709c.585-.253 1.063-.47 1.445-.707.38-.234.585-.443.692-.638.17-.312.304-1.032-.785-2.848a1 1 0 0 1 .715-1.505';

// Фон: [светлая тема, тёмная тема]. challengeDark одинаков в обеих — это синяя карточка.
const BG: Record<CardMotifKind, { light: [string, string]; dark: [string, string]; start: { x: number; y: number }; end: { x: number; y: number } }> = {
  challenge: { light: ['#FFF6EE', '#FFE8D6'], dark: ['#2A1D14', '#352112'], start: { x: 0, y: 0 }, end: { x: 1, y: 1 } },
  challengeDark: { light: ['#234088', '#2F4FB8'], dark: ['#234088', '#2F4FB8'], start: { x: 0.18, y: 0 }, end: { x: 0.82, y: 1 } },
  trip: { light: ['#F1F8F3', '#E1F1E7'], dark: ['#14231A', '#17301F'], start: { x: 0.33, y: 0 }, end: { x: 0.67, y: 1 } },
  sport: { light: ['#F1F4FF', '#E3E9FF'], dark: ['#161C30', '#1B2445'], start: { x: 0, y: 0 }, end: { x: 1, y: 1 } },
};

function Flame({ fill }: { fill: string }) {
  return <Svg width={220} height={240} viewBox="0 0 220 240">
    <G transform="translate(40 18) rotate(-10 84 96) scale(7.2)"><Path d={FLAME} fill={fill} /></G>
  </Svg>;
}

function Mountains({ dark }: { dark: boolean }) {
  const green = dark ? '74,222,128' : '21,128,61';
  return <Svg width={240} height={170} viewBox="0 0 240 170">
    <Circle cx={168} cy={44} r={22} fill={`rgba(245,158,11,${dark ? 0.16 : 0.2})`} />
    <Path d="M0 170 L70 92 L104 128 L150 64 L240 170 Z" fill={`rgba(${green},0.10)`} />
    <Path d="M60 170 L132 104 L170 140 L204 108 L240 136 L240 170 Z" fill={`rgba(${green},0.12)`} />
    <Path d="M150 64 L138 81 L146 79 L152 86 L160 77 L166 80 Z" fill={`rgba(255,255,255,${dark ? 0.18 : 0.55})`} />
  </Svg>;
}

function Track({ dark }: { dark: boolean }) {
  const ink = dark ? '138,160,255' : '61,91,219';
  return <Svg width={300} height={180} viewBox="0 0 300 180">
    {[0, 1, 2, 3].map(i => {
      const h = 140 - i * 28;
      return <Rect key={i} x={40 + i * 14} y={18 + i * 14} width={260 - i * 28} height={h} rx={h / 2} fill="none"
        stroke={`rgba(${ink},${(0.16 - i * 0.03).toFixed(2)})`} strokeWidth={1.5} strokeDasharray={i === 1 ? '6 6' : undefined} />;
    })}
  </Svg>;
}

export function CardMotif({ kind }: { kind: CardMotifKind }) {
  const { isDark } = useTheme();
  const bg = BG[kind];
  return <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={StyleSheet.absoluteFill}>
    <LinearGradient colors={isDark ? bg.dark : bg.light} start={bg.start} end={bg.end} style={StyleSheet.absoluteFill} />
    {kind === 'challengeDark' ? <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
      <Defs>
        {/* Тёплое свечение в правом нижнем углу. */}
        <RadialGradient id="cm-glow" cx="1" cy="1" rx="1.2" ry="0.9" fx="1" fy="1">
          <Stop offset="0" stopColor="#FF8A3D" stopOpacity={0.28} />
          <Stop offset="0.55" stopColor="#FF8A3D" stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Rect x={0} y={0} width="100%" height="100%" fill="url(#cm-glow)" />
    </Svg> : null}
    <View style={ART[kind]}>
      {kind === 'challengeDark' ? <Flame fill="rgba(255,255,255,0.08)" />
        : kind === 'challenge' ? <Flame fill={isDark ? 'rgba(251,146,60,0.12)' : 'rgba(234,88,12,0.10)'} />
        : kind === 'trip' ? <Mountains dark={isDark} /> : <Track dark={isDark} />}
    </View>
  </View>;
}

// Позиция рисунка — как background-position в макете.
const ART = StyleSheet.create({
  challenge: { position: 'absolute', right: -36, top: '50%', marginTop: -120 },
  challengeDark: { position: 'absolute', right: -30, top: -10 },
  trip: { position: 'absolute', right: 0, bottom: 0 },
  sport: { position: 'absolute', right: -60, top: '50%', marginTop: -90 },
});
