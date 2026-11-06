import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { minTouch, radius } from '../theme/tokens';
import { hSelect } from '../lib/haptics';
import { SF, SFName } from './SFIcon';
import { GlassSurface } from './GlassSurface';

export function Chip({
  label, active, icon, onPress, accessibilityRole = 'button', onFocus, onMap = false,
}: {
  label: string; active?: boolean; icon?: SFName | string; onPress?: () => void;
  accessibilityRole?: 'button' | 'tab'; onFocus?: () => void;
  /** Фильтр поверх карты (iOS 26): в светлой теме — стеклянная капсула, выбранный — тёмный. */
  onMap?: boolean;
}) {
  const { T, ty, isDark } = useTheme();
  const [focused, setFocused] = useState(false);
  // Dark filters share the navigation material; the selected pill catches more
  // light. Keep the existing light palette and 48 pt touch target.
  const ink = isDark ? '#FFFFFF' : active ? T.onBrand : T.label;
  const mapShape = { flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'center' as const, gap: 6, maxWidth: '100%' as const,
    minHeight: 38, paddingVertical: 8, paddingHorizontal: 14, borderRadius: radius.pill, borderCurve: 'continuous' as const };
  return (
    <Pressable onPress={onPress ? () => { hSelect(); onPress(); } : undefined} accessibilityRole={accessibilityRole}
      onFocus={() => { setFocused(true); onFocus?.(); }} onBlur={() => setFocused(false)}
      disabled={!onPress} accessibilityLabel={label} accessibilityState={{ selected: active, disabled: !onPress }} style={({ pressed }) => ({
      maxWidth: '100%', minHeight: minTouch, minWidth: minTouch, justifyContent: 'center',
      transform: [{ scale: pressed ? 0.96 : 1 }],
    })}>
      {onMap && !isDark ? (active
        ? <View style={[mapShape, { backgroundColor: T.label, outlineWidth: focused ? 2 : 0, outlineColor: T.label, outlineOffset: 2 }]}>
          {icon ? <SF name={icon} size={14} color="#FFFFFF" /> : null}
          <Text style={[ty.subheadEm, { color: '#FFFFFF', flexShrink: 1 }]}>{label}</Text>
        </View>
        : <GlassSurface interactive style={[mapShape, focused ? { outlineWidth: 2, outlineColor: T.label, outlineOffset: 2 } : null]}>
          {icon ? <SF name={icon} size={14} color={T.label} /> : null}
          <Text style={[ty.subheadEm, { color: T.label, flexShrink: 1 }]}>{label}</Text>
        </GlassSurface>) : (
      <View style={{
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, maxWidth: '100%',
        minHeight: 38, paddingVertical: 8, paddingHorizontal: 14, borderRadius: radius.pill, borderCurve: 'continuous',
        backgroundColor: isDark ? 'transparent' : active ? T.brand : '#E4E7F0',
        outlineWidth: focused ? 2 : 0, outlineColor: T.label, outlineOffset: 2,
      }}>
        {isDark ? <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          <GlassSurface style={[StyleSheet.absoluteFill, { borderRadius: radius.pill }]} />
          {active ? <View style={[StyleSheet.absoluteFill, { borderRadius: radius.pill, backgroundColor: 'rgba(255,255,255,0.12)' }]} /> : null}
        </View> : null}
        {icon ? <SF name={icon} size={14} color={isDark ? '#FFFFFF' : active ? T.onBrand : T.brandText} /> : null}
        <Text style={[ty.subheadEm, { color: ink, flexShrink: 1 }]}>{label}</Text>
      </View>
      )}
    </Pressable>
  );
}
