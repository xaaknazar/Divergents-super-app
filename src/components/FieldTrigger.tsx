import React from 'react';
import { Pressable, Text } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { SF } from './SFIcon';

/** Picker field appearance cannot be overridden by its caller. */
export function FieldTrigger({ value, placeholder, icon = 'chevron.right', invalid = false, accessibilityLabel, onPress }: {
  value?: string; placeholder: string; icon?: string; invalid?: boolean; accessibilityLabel: string; onPress: () => void;
}) {
  const { T, ty } = useTheme();
  return <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={accessibilityLabel}
    style={({ pressed }) => ({ minHeight: 52, paddingVertical: 14, paddingHorizontal: 14, borderRadius: 16,
      borderWidth: 1, borderColor: invalid ? T.redText : T.cardBorder, backgroundColor: T.cardBg,
      flexDirection: 'row', alignItems: 'center', gap: 12, opacity: pressed ? 0.65 : 1 })}>
    <Text style={[ty.body, { color: value ? T.label : T.labelTertiary, flex: 1 }]}>{value || placeholder}</Text>
    <SF name={icon} size={18} color={T.labelSecondary} />
  </Pressable>;
}
