import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { READING_RULES, CONTINUOUS_READING_RULES } from '../data/reading';
import { useTheme } from '../theme/ThemeContext';
import { radius } from '../theme/tokens';
import { SF } from './SFIcon';

/** Резюме + пронумерованные раскрываемые пункты. Тексты правил — как в данных, без изменений:
 * свёрнутый пункт показывает начало правила, раскрытый — правило целиком. */
export function ReadingRules({ initiallyExpanded = false, mode = 'scheduled' }: { initiallyExpanded?: boolean; mode?: 'scheduled' | 'continuous' }) {
  const [expanded, setExpanded] = useState(initiallyExpanded);
  const [open, setOpen] = useState<number | null>(null);
  const { T, ty } = useTheme();
  const rules = mode === 'continuous' ? CONTINUOUS_READING_RULES : READING_RULES;
  return <View style={[styles.card, { backgroundColor: T.cardBg, borderColor: T.cardBorder }]}>
    <Pressable onPress={() => setExpanded(v => !v)} accessibilityRole="button" accessibilityLabel="Правила и защита" accessibilityState={{ expanded }}
      style={({ pressed }) => [styles.head, { opacity: pressed ? 0.65 : 1 }]}>
      <View style={styles.flex}>
        <Text style={[ty.headline, { color: T.label }]}>Правила и защита</Text>
        <Text style={[ty.subhead, { color: T.labelSecondary }]}>{mode === 'continuous' ? '60 минут в день · без выбывания' : '60 минут в день · 3 флага — выход'}</Text>
      </View>
      <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants"><SF name={expanded ? 'chevron.up' : 'chevron.down'} size={16} color={T.labelTertiary} /></View>
    </Pressable>
    <Text style={[ty.callout, styles.summary, { color: T.labelSecondary }]}>Пауза сохраняет подход. День засчитывается после подтверждения времени и страниц сервером.</Text>
    {expanded ? rules.map((rule, index) => {
      const isOpen = open === index;
      return <Pressable key={rule} onPress={() => setOpen(isOpen ? null : index)} accessibilityRole="button"
        accessibilityLabel={`Пункт ${index + 1}`} accessibilityHint={isOpen ? 'Свернуть' : 'Раскрыть'} accessibilityState={{ expanded: isOpen }}
        style={({ pressed }) => [styles.row, { borderTopColor: T.separator, opacity: pressed ? 0.65 : 1 }]}>
        <Text accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[ty.footnoteEm, styles.number, { color: T.labelSecondary }]}>{index + 1}</Text>
        <Text numberOfLines={isOpen ? undefined : 2} style={[ty.subhead, styles.flex, { color: T.label }]}>{rule}</Text>
        <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants"><SF name={isOpen ? 'chevron.up' : 'chevron.down'} size={14} color={T.labelTertiary} /></View>
      </Pressable>;
    }) : null}
  </View>;
}
const styles = StyleSheet.create({
  card: { borderRadius: radius.block, borderCurve: 'continuous', borderWidth: 1, paddingHorizontal: 16, paddingBottom: 6 },
  head: { minHeight: 56, paddingTop: 14, gap: 12, flexDirection: 'row', alignItems: 'center' },
  summary: { paddingTop: 8, paddingBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 48, paddingVertical: 10, borderTopWidth: 0.5 },
  number: { minWidth: 20 },
  flex: { flex: 1, minWidth: 0, gap: 4 },
});
