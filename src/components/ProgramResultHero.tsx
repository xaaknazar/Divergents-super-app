import React from 'react';
import { Text, View, StyleSheet, useWindowDimensions } from 'react-native';
import { FitnessProgram, ProgramStats } from '../data/fitness';
import { days } from '../data/plural';
import { programNumber, programPeriod } from '../data/programResults';
import { useTheme } from '../theme/ThemeContext';
import { SF } from './SFIcon';
export function ProgramResultHero({ program: p, stats: s }: { program: FitnessProgram; stats: ProgramStats }) {
 const { T, ty, textScale = 1 } = useTheme();
 const { width, fontScale } = useWindowDimensions();
 const compact = width < 360 || fontScale * textScale > 1.3;
 return <View style={{ padding: 24, borderRadius: 24, borderCurve: 'continuous', backgroundColor: T.brand }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            <SF name={s.done === p.days ? 'checkmark.seal.fill' : 'flag.fill'} size={24} color={T.onBrand} />
          </View>
          <Text style={[ty.subheadEm, { color: T.onBrand, flex: 1 }]}>{s.finished ? 'Программа завершена' : 'Ваш прогресс'}</Text>
        </View>
        <Text accessibilityRole="header" style={[ty.title1, { color: T.onBrand, marginTop: 20 }]}>{p.title}</Text>
        <Text style={[ty.subhead, { color: T.onBrand, marginTop: 8 }]}>{programPeriod(p)}</Text>
        <View style={{ marginTop: 28, paddingTop: 20, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: T.onBrand }}>
          <Text style={[ty.subhead, { color: T.onBrand }]}>Всего за программу</Text>
          <Text testID="program-total" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.65}
            style={[ty.largeTitle, { fontSize: compact ? 32 : 44, lineHeight: compact ? 40 : 54, color: T.onBrand, marginTop: 8, fontVariant: ['tabular-nums'] }]}>{programNumber(s.total)}</Text>
          <Text style={[ty.title3, { color: T.onBrand, marginTop: 4 }]}>{p.unit}</Text>
          <Text style={[ty.footnote, { color: T.onBrand, marginTop: 12 }]}>Цель — {programNumber(p.target)} {p.unit} каждый день, {days(p.days)}</Text>
        </View>
      </View>;
}
