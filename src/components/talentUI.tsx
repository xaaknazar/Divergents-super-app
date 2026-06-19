// Modern talent widgets: progress ring + Gallup domain distribution bar.
import React from 'react';
import { View, Text } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useTheme } from '../theme/ThemeContext';
import { ty } from '../theme/tokens';
import { GALLUP_DOMAIN_META, GallupDomain, GallupTalent } from '../data/talentslab';

export function Ring({
  value, size = 64, stroke = 7, color, label, sub, textColor,
}: { value: number; size?: number; stroke?: number; color?: string; label?: string; sub?: string; textColor?: string }) {
  const { T } = useTheme();
  const c = color ?? T.brand;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const pct = Math.min(1, Math.max(0, value));
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size}>
        <Circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={'rgba(255,255,255,0.25)'} strokeWidth={stroke} />
        <Circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={c} strokeWidth={stroke}
          strokeDasharray={`${pct * circ} ${circ}`} strokeLinecap="round" transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      </Svg>
      <View style={{ position: 'absolute', alignItems: 'center' }}>
        {label ? <Text style={[ty.headline, { color: textColor ?? T.label }]}>{label}</Text> : null}
        {sub ? <Text style={[ty.caption2, { color: textColor ?? T.labelSecondary }]}>{sub}</Text> : null}
      </View>
    </View>
  );
}

const ORDER: GallupDomain[] = ['executing', 'influencing', 'relationship', 'strategic'];

export function DomainBar({ gallup }: { gallup: GallupTalent[] }) {
  const { T } = useTheme();
  const counts = ORDER.map((d) => ({ d, n: gallup.filter((g) => g.domain === d).length }));
  const total = counts.reduce((s, c) => s + c.n, 0) || 1;
  return (
    <View>
      <View style={{ flexDirection: 'row', height: 10, borderRadius: 6, overflow: 'hidden', backgroundColor: T.fillTertiary }}>
        {counts.map(({ d, n }) => n > 0 ? (
          <View key={d} style={{ flex: n / total, backgroundColor: GALLUP_DOMAIN_META[d].color }} />
        ) : null)}
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 10 }}>
        {counts.map(({ d, n }) => (
          <View key={d} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: GALLUP_DOMAIN_META[d].color }} />
            <Text style={[ty.caption1, { color: T.labelSecondary }]}>{GALLUP_DOMAIN_META[d].label} · {n}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}
