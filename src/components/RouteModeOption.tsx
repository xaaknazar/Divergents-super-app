import React from 'react';
import { Pressable, Text } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

export function RouteModeOption({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  const { T, ty } = useTheme();
  return <Pressable onPress={onPress} accessibilityRole="radio" accessibilityLabel={label} accessibilityState={{ checked: selected }}
    style={({ pressed }) => ({ minHeight: 48, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, justifyContent: 'center',
      borderWidth: 1, borderColor: selected ? T.onBrand : 'transparent', backgroundColor: T.brand, opacity: pressed ? 0.6 : 1 })}>
    <Text style={[ty.footnoteEm, { color: T.onBrand }]}>{label}</Text>
  </Pressable>;
}
