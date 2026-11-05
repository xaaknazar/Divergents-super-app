import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { minTouch, radius } from '../theme/tokens';
import { hSelect } from '../lib/haptics';
import { SF, SFName } from './SFIcon';

export function Chip({
  label, active, icon, onPress, accessibilityRole = 'button', onFocus,
}: {
  label: string; active?: boolean; icon?: SFName | string; onPress?: () => void;
  accessibilityRole?: 'button' | 'tab'; onFocus?: () => void;
}) {
  const { T, ty, isDark } = useTheme();
  const [focused, setFocused] = useState(false);
  // Мягкий чип (ноябрь 2026): без рамки, невыбранный — сплошная светло-синяя заливка (читается
  // и на карте), выбранный — цвет бренда. Видимая «таблетка» 38 pt, но область нажатия — 48:
  // внешний Pressable прозрачный и держит минимальный размер касания.
  const soft = isDark ? '#23262E' : '#E4E7F0';
  return (
    <Pressable onPress={onPress ? () => { hSelect(); onPress(); } : undefined} accessibilityRole={accessibilityRole}
      onFocus={() => { setFocused(true); onFocus?.(); }} onBlur={() => setFocused(false)}
      disabled={!onPress} accessibilityLabel={label} accessibilityState={{ selected: active, disabled: !onPress }} style={({ pressed }) => ({
      maxWidth: '100%', minHeight: minTouch, minWidth: minTouch, justifyContent: 'center',
      transform: [{ scale: pressed ? 0.96 : 1 }],
    })}>
      <View style={{
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, maxWidth: '100%',
        minHeight: 38, paddingVertical: 8, paddingHorizontal: 14, borderRadius: radius.pill, borderCurve: 'continuous',
        backgroundColor: active ? T.brand : soft,
        outlineWidth: focused ? 2 : 0, outlineColor: T.label, outlineOffset: 2,
      }}>
        {icon ? <SF name={icon} size={14} color={active ? T.onBrand : T.brandText} /> : null}
        <Text style={[ty.subheadEm, { color: active ? T.onBrand : T.label, flexShrink: 1 }]}>{label}</Text>
      </View>
    </Pressable>
  );
}
