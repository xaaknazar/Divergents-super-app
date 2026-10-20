import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { READING_RULES, CONTINUOUS_READING_RULES } from '../data/reading';
import { useTheme } from '../theme/ThemeContext';
import { ContentBlock } from './ContentBlock';
import { SF } from './SFIcon';

export function ReadingRules({ initiallyExpanded = false, mode = 'scheduled' }: { initiallyExpanded?: boolean; mode?: 'scheduled' | 'continuous' }) {
  const [expanded, setExpanded] = useState(initiallyExpanded);
  const { T, ty } = useTheme();
  return <ContentBlock size="flush">
    <Pressable onPress={() => setExpanded(v => !v)} accessibilityRole="button" accessibilityLabel="Правила и защита" accessibilityState={{ expanded }}
      style={({ pressed }) => ({ padding: 18, minHeight: 56, gap: 12, flexDirection: 'row', alignItems: 'center', opacity: pressed ? 0.65 : 1 })}>
      <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[styles.icon, { backgroundColor: T.brandTinted }]}><SF name="checkmark.seal.fill" size={24} color={T.brandText} /></View>
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={[ty.headline, { color: T.label }]}>Правила и защита</Text>
        <Text style={[ty.subhead, { color: T.labelSecondary }]}>{mode === 'continuous' ? '60 минут в день · без выбывания' : '60 минут в день · 3 флага — выход'}</Text>
      </View>
      <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants"><SF name={expanded ? 'chevron.up' : 'chevron.down'} size={14} color={T.brandText} /></View>
    </Pressable>
    <View style={[styles.summary, { borderTopColor: T.separator }]}>
      <Text style={[ty.subheadEm, { color: T.brandText }]}>Читаем → сохраняем страницы → растём вместе</Text>
      <Text style={[ty.subhead, { color: T.labelSecondary }]}>Пауза сохраняет подход. День засчитывается после подтверждения времени и страниц сервером.</Text>
    </View>
    {expanded ? <View style={styles.list}>{(mode === 'continuous' ? CONTINUOUS_READING_RULES : READING_RULES).map((rule, index) => <View key={rule} style={styles.row}>
      <Text accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[ty.footnoteEm, styles.number, { color: T.brandText }]}>{String(index + 1).padStart(2, '0')}</Text>
      <Text style={[ty.subhead, styles.rule, { color: T.labelSecondary }]}>{rule}</Text>
    </View>)}</View> : null}
  </ContentBlock>;
}
const styles = StyleSheet.create({
  icon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  summary: { padding: 18, paddingTop: 16, borderTopWidth: 0.5, gap: 8 },
  list: { paddingHorizontal: 18, paddingBottom: 20, gap: 18 },
  row: { flexDirection: 'row', gap: 12 }, number: { minWidth: 24 }, rule: { flex: 1 },
});
