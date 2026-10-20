import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { minTouch } from '../theme/tokens';
import { SF } from './SFIcon';

/** Круглый чекбокс iOS (handoff 2026-10-20, Checkbox): кружок 24, отмеченный — заливка бренда и галочка.
 * Вся строка — зона нажатия не меньше 48. Подпись не обрезается. */
export function Checkbox({ label, description, checked, onChange, disabled = false }: {
  label: string; description?: string; checked: boolean; onChange: (checked: boolean) => void; disabled?: boolean;
}) {
  const { T, ty } = useTheme();
  return <Pressable onPress={() => onChange(!checked)} disabled={disabled} accessibilityRole="checkbox"
    accessibilityState={{ checked, disabled }} accessibilityLabel={description ? `${label}. ${description}` : label}
    style={({ pressed }) => [styles.row, description ? styles.top : null, { opacity: disabled ? 0.5 : pressed ? 0.7 : 1 }]}>
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
      style={[styles.box, checked ? { backgroundColor: T.brand } : { borderWidth: 1.5, borderColor: T.labelQuaternary }]}>
      {checked ? <SF name="checkmark" size={14} color={T.onBrand} /> : null}
    </View>
    <View style={styles.copy}>
      <Text style={[description ? ty.subheadEm : ty.subhead, { color: T.label }]}>{label}</Text>
      {description ? <Text style={[ty.caption1, { color: T.labelSecondary }]}>{description}</Text> : null}
    </View>
  </Pressable>;
}
const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: minTouch },
  top: { alignItems: 'flex-start', paddingVertical: 6 },
  box: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1, minWidth: 0, gap: 2 },
});
