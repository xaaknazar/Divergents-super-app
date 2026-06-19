import React from 'react';
import { View, Pressable } from 'react-native';
import { SF } from './SFIcon';
import { useTheme } from '../theme/ThemeContext';

export function Stars({ value, size = 14, onChange, color }: { value: number; size?: number; onChange?: (v: number) => void; color?: string }) {
  const { T } = useTheme();
  const c = color ?? '#F5A623';
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {[1, 2, 3, 4, 5].map((i) => {
        const filled = i <= Math.round(value);
        const star = <SF name={filled ? 'star.fill' : 'star'} size={size} color={filled ? c : T.labelTertiary} />;
        return onChange
          ? <Pressable key={i} onPress={() => onChange(i)} hitSlop={6}>{star}</Pressable>
          : <View key={i}>{star}</View>;
      })}
    </View>
  );
}
