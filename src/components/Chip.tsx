import React from 'react';
import { Pressable, Text } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { minTouch, radius } from '../theme/tokens';
import { hSelect } from '../lib/haptics';
import { SF, SFName } from './SFIcon';

export function Chip({
  label, active, icon, onPress,
}: { label: string; active?: boolean; icon?: SFName | string; onPress?: () => void }) {
  const { T, ty } = useTheme();
  return (
    <Pressable onPress={onPress ? () => { hSelect(); onPress(); } : undefined} accessibilityRole="button"
      disabled={!onPress} accessibilityLabel={label} accessibilityState={{ selected: active, disabled: !onPress }} style={({ pressed }) => [{
      flexDirection: 'row', alignItems: 'center', gap: 5, maxWidth: '100%',
      minHeight: minTouch, paddingVertical: 8, paddingHorizontal: 14, borderRadius: radius.pill,
      borderCurve: 'continuous',
      backgroundColor: active ? T.brand : T.cardBg,
      borderWidth: 0.5, borderColor: active ? 'transparent' : T.separator,
      opacity: pressed ? 0.65 : 1,
    }, active ? { shadowColor: T.brand, shadowOpacity: 0.25, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2 } : null]}>
      {icon ? <SF name={icon} size={13} color={active ? T.onBrand : T.brandText} /> : null}
      <Text style={[ty.footnoteEm, { color: active ? T.onBrand : T.label, flexShrink: 1 }]}>{label}</Text>
    </Pressable>
  );
}
