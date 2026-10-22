import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { READING_CHALLENGE_RULES } from '../data/reading';
import { useTheme } from '../theme/ThemeContext';
import { nums, radius } from '../theme/tokens';
import { SF } from './SFIcon';

const STRICT_MODE = 'В строгом режиме iOS ограничивает приложения и сайты, доступные для блокировки, кроме Divergents и выбранных вами разрешённых приложений. Перед подходом можно выбрать читалки в системном окне; iOS не позволяет нам проверить их назначение. Исключения действуют весь подход и не меняются на паузе. Пауза сразу снимает ограничения, даже без интернета.';

/** Правила Reading challenge: пронумерованные пункты, каждый раскрывается на месте.
 * list — на экране вступления: заголовок «Правила» и пункты сразу видны.
 * collapsed — у участника: одна строка «Правила челленджа · 9», раскрывается на месте. */
export function ReadingRules({ variant = 'collapsed', initiallyExpanded = false, blockingMode = 'selected' }: {
  variant?: 'list' | 'collapsed'; initiallyExpanded?: boolean; blockingMode?: 'selected' | 'all-apps';
}) {
  const { T, ty } = useTheme();
  const [expanded, setExpanded] = useState(initiallyExpanded);
  const [open, setOpen] = useState<number | null>(null);
  const rules = READING_CHALLENGE_RULES.map((rule, index) => blockingMode === 'all-apps' && index === READING_CHALLENGE_RULES.length - 1
    ? { ...rule, text: `${rule.text} ${STRICT_MODE}` } : rule);
  const items = rules.map((rule, index) => {
    const isOpen = open === index;
    return <Pressable key={rule.title} onPress={() => setOpen(isOpen ? null : index)} accessibilityRole="button"
      accessibilityLabel={`Пункт ${index + 1}. ${rule.title}`} accessibilityHint={isOpen ? 'Свернуть' : 'Раскрыть'} accessibilityState={{ expanded: isOpen }}
      style={({ pressed }) => [styles.row, (variant === 'collapsed' || index > 0) && { borderTopWidth: 0.5, borderTopColor: T.separator }, { opacity: pressed ? 0.65 : 1 }]}>
      <View style={styles.line}>
        <Text accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[ty.footnoteEm, nums, styles.number, { color: T.labelSecondary }]}>{index + 1}</Text>
        <Text style={[ty.subhead, styles.flex, { color: T.label }]}>{rule.title}</Text>
        <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants"><SF name={isOpen ? 'chevron.up' : 'chevron.down'} size={14} color={T.labelTertiary} /></View>
      </View>
      {isOpen ? <Text style={[ty.subhead, styles.text, { color: T.labelSecondary }]}>{rule.text}</Text> : null}
    </Pressable>;
  });
  if (variant === 'list') return <View style={styles.section}>
    <Text accessibilityRole="header" style={[ty.title3, { color: T.label }]}>Правила</Text>
    <View style={[styles.card, { backgroundColor: T.cardBg, borderColor: T.cardBorder }]}>{items}</View>
  </View>;
  return <View style={[styles.card, { backgroundColor: T.cardBg, borderColor: T.cardBorder }]}>
    <Pressable onPress={() => setExpanded(v => !v)} accessibilityRole="button" accessibilityLabel={`Правила челленджа, ${rules.length} пунктов`}
      accessibilityState={{ expanded }} style={({ pressed }) => [styles.head, { opacity: pressed ? 0.65 : 1 }]}>
      <Text style={[ty.headline, styles.flex, { color: T.label }]}>Правила челленджа <Text style={[ty.headline, nums, { color: T.labelSecondary }]}>· {rules.length}</Text></Text>
      <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants"><SF name={expanded ? 'chevron.up' : 'chevron.down'} size={16} color={T.labelTertiary} /></View>
    </Pressable>
    {expanded ? items : null}
  </View>;
}
const styles = StyleSheet.create({
  section: { gap: 10 },
  card: { borderRadius: radius.block, borderCurve: 'continuous', borderWidth: 1, paddingHorizontal: 16 },
  head: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 12 },
  row: { minHeight: 48, paddingVertical: 12, gap: 6, justifyContent: 'center' },
  line: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  number: { minWidth: 20 },
  text: { paddingLeft: 32 },
  flex: { flex: 1, minWidth: 0 },
});
