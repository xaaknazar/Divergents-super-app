import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { minTouch } from '../theme/tokens';
import { SF } from './SFIcon';
import { hSelect } from '../lib/haptics';

export function HeaderIcon({ name, onPress, onLongPress, badge, label, variant = 'plain' }: {
  name: string; onPress?: () => void; onLongPress?: () => void; badge?: number; label: string;
  variant?: 'plain' | 'floating' | 'primary';
}) {
  const { T, ty } = useTheme();
  const size = 20;
  return (
    <Pressable onPress={onPress ? () => { hSelect(); onPress(); } : undefined} onLongPress={onLongPress} accessibilityRole="button"
      disabled={!onPress}
      accessibilityLabel={badge ? `${label}. ${badge}` : label} accessibilityState={{ disabled: !onPress }}
      style={({ pressed }) => ({ position: 'relative', minWidth: Math.max(minTouch, size + 8), minHeight: Math.max(minTouch, size + 8), borderRadius: 14,
        backgroundColor: variant === 'primary' ? T.brand : variant === 'floating' ? T.cardBg : 'transparent',
        alignItems: 'center', justifyContent: 'center', opacity: !onPress ? 0.45 : pressed ? 0.55 : 1 })}>
      <SF name={name} size={size} color={variant === 'primary' ? T.onBrand : T.brandText} />
      {badge ? (
        <View style={{ position: 'absolute', top: -4, right: -6, minWidth: 16, height: 16, borderRadius: 8, borderCurve: 'continuous', backgroundColor: T.brand, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 }}>
          <Text allowFontScaling={false} style={[ty.caption2Em, { color: T.onBrand }]}>{badge > 99 ? '99+' : badge}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}
