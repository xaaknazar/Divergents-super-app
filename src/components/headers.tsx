// Navigation headers — large title (root tabs) + inline back (detail screens).
import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { minTouch } from '../theme/tokens';
import { useTheme } from '../theme/ThemeContext';
import { hSelect } from '../lib/haptics';
import { SF } from './SFIcon';

export function NavBarLarge({ title, trailing }: { title: string; trailing?: React.ReactNode }) {
  const { T, ty } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 8, minHeight: 48 }}>
      <Text accessibilityRole="header" style={[ty.largeTitle, { color: T.label, flexShrink: 1 }]} numberOfLines={2}>{title}</Text>
      {trailing ? <View style={{ flexDirection: 'row', gap: 16, alignItems: 'center', paddingLeft: 12 }}>{trailing}</View> : null}
    </View>
  );
}

export function BackNav({
  back = 'Назад', onBack, trailing, transparent = false,
}: { back?: string; onBack?: () => void; trailing?: React.ReactNode; transparent?: boolean }) {
  const { T, ty } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={{
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      paddingTop: insets.top + 6, paddingBottom: 10, paddingLeft: 12, paddingRight: 8,
      backgroundColor: transparent ? 'transparent' : T.cardBg,
      borderBottomWidth: transparent ? 0 : 0.33, borderBottomColor: T.separator,
    }}>
      <Pressable onPress={onBack ? () => { hSelect(); onBack(); } : undefined} accessibilityRole="button" accessibilityLabel={back}
        accessibilityState={{ disabled: !onBack }} style={{ minHeight: minTouch, minWidth: minTouch, flexDirection: 'row', alignItems: 'center', gap: 2, paddingHorizontal: 6 }}>
        <SF name="chevron.left" size={20} color={T.brandText} />
        <Text style={[ty.body, { color: T.brandText }]} numberOfLines={1}>{back}</Text>
      </Pressable>
      <View style={{ flexDirection: 'row', gap: 16, paddingRight: 6, alignItems: 'center' }}>{trailing}</View>
    </View>
  );
}

// Trailing icon button helper
export function HeaderIcon({ name, color, size = 20, onPress, badge, label }: {
  name: string; color?: string; size?: number; onPress?: () => void; badge?: number; label?: string;
}) {
  const { T, ty } = useTheme();
  const _color = color ?? T.brandText;
  const accessibleName = label ?? `Действие: ${name}`;
  return (
    <Pressable onPress={onPress ? () => { hSelect(); onPress(); } : undefined} accessibilityRole="button"
      accessibilityLabel={badge ? `${accessibleName}. ${badge}` : accessibleName} accessibilityState={{ disabled: !onPress }}
      style={{ position: 'relative', minWidth: Math.max(minTouch, size + 8), minHeight: Math.max(minTouch, size + 8), alignItems: 'center', justifyContent: 'center' }}>
      <SF name={name} size={size} color={_color} />
      {badge ? (
        <View style={{ position: 'absolute', top: -4, right: -6, minWidth: 16, height: 16, borderRadius: 8, backgroundColor: T.brand, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 }}>
          <Text style={[ty.caption2Em, { color: T.onBrand }]}>{badge}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}
