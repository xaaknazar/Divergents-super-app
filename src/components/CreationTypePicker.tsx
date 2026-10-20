import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

export function CreationTypePicker({ options, value, onChange, disabled = false }: {
  options: { key: string; label: string }[]; value: string; onChange?: (key: string) => void; disabled?: boolean;
}) {
  const { T, ty } = useTheme();
  return <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
    {options.map(item => {
      const selected = item.key === value;
      const label = <Text style={[ty.subheadEm, { color: selected ? '#fff' : T.label }]}>{item.label}</Text>;
      const surface = { minHeight: 48, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 24, justifyContent: 'center' as const, backgroundColor: selected ? T.brand : T.cardBg };
      return onChange ? <Pressable key={item.key} disabled={disabled} onPress={() => onChange(item.key)} accessibilityRole="button"
        accessibilityLabel={item.label} accessibilityState={{ selected, disabled }} style={({ pressed }) => [surface, { opacity: pressed ? 0.6 : 1 }]}>{label}</Pressable>
        : <View key={item.key} style={surface}>{label}</View>;
    })}
  </View>;
}
