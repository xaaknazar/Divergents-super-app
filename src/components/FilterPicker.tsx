import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { Chip } from './ui';
import { SF } from './SFIcon';

/** All choices stay discoverable without a clipped horizontal strip. */
export function FilterPicker({ label, items, value, onChange }: {
  label: string; items: string[]; value: string; onChange: (value: string) => void;
}) {
  const { T, ty } = useTheme();
  const [open, setOpen] = useState(false);
  return <View style={{ gap: 8 }}>
    <Pressable accessibilityRole="button" accessibilityLabel={`${label}: ${value}`} accessibilityState={{ expanded: open }}
      onPress={() => setOpen(v => !v)} style={({ pressed }) => ({ minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 12,
        paddingVertical: 10, opacity: pressed ? 0.6 : 1 })}>
      <Text style={[ty.subheadEm, { flex: 1, color: T.label }]}>{label}: {value}</Text>
      <SF name={open ? 'chevron.up' : 'chevron.down'} size={16} color={T.brandText} />
    </Pressable>
    {open ? <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {items.map(item => <View key={item} style={{ maxWidth: '100%' }}><Chip label={item} active={item === value}
        onPress={() => { onChange(item); setOpen(false); }} /></View>)}
    </View> : null}
  </View>;
}
