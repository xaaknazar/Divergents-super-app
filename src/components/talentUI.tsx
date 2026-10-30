// Modern talent widgets: progress ring + Gallup domain distribution bar.
import React from 'react';
import { Text,View } from 'react-native';
import { GALLUP_DOMAIN_META,GallupDomain,GallupTalent } from '../data/talentslab';
import { useTheme } from '../theme/ThemeContext';

const ORDER: GallupDomain[] = ['executing', 'influencing', 'relationship', 'strategic'];

export function DomainBar({ gallup }: { gallup: GallupTalent[] }) {
  const { T, ty } = useTheme();
  const counts = ORDER.map((d) => ({ d, n: gallup.filter((g) => g.domain === d).length }));
  const total = counts.reduce((s, c) => s + c.n, 0) || 1;
  return (
    <View>
      <View style={{ flexDirection: 'row', height: 10, borderRadius: 6, borderCurve: 'continuous', overflow: 'hidden', backgroundColor: T.fillTertiary }}>
        {counts.map(({ d, n }) => n > 0 ? (
          <View key={d} style={{ flex: n / total, backgroundColor: GALLUP_DOMAIN_META[d].color }} />
        ) : null)}
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 10 }}>
        {counts.map(({ d, n }) => (
          <View key={d} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, borderCurve: 'continuous', backgroundColor: GALLUP_DOMAIN_META[d].color }} />
            <Text style={[ty.caption1, { color: T.labelSecondary }]}>{GALLUP_DOMAIN_META[d].label} · {n}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}
