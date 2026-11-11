import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { minTouch, radius } from '../theme/tokens';
import { hSelect } from '../lib/haptics';
import { SF, SFName } from './SFIcon';
import { GlassSurface } from './GlassSurface';
import { MapGlassMaterial } from './MapGlassMaterial';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';

export function Chip({
  label, active, icon, onPress, accessibilityRole = 'button', onFocus, onMap = false,
}: {
  label: string; active?: boolean; icon?: SFName | string; onPress?: () => void;
  accessibilityRole?: 'button' | 'tab'; onFocus?: () => void;
  /** Фильтр поверх карты (iOS 26): выбранная категория — синее стекло в обеих темах. */
  onMap?: boolean;
}) {
  const { T, ty, isDark, reduceMotion } = useTheme();
  const scale = useSharedValue(1);
  const feedback = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const [focused, setFocused] = useState(false);
  // Dark filters share the navigation material; the selected pill catches more
  // light. Keep the existing light palette and 48 pt touch target.
  const ink = isDark ? '#FFFFFF' : active ? T.onBrand : T.label;
  const mapShape = { flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'center' as const, gap: 6, maxWidth: '100%' as const,
    minHeight: 38, paddingVertical: 8, paddingHorizontal: 14, borderRadius: radius.pill, borderCurve: 'continuous' as const };
  return (
    <Pressable onPress={onPress ? () => { hSelect(); onPress(); } : undefined} accessibilityRole={accessibilityRole}
      onPressIn={() => { scale.value = reduceMotion ? 1 : withTiming(0.98, { duration: 90 }); }}
      onPressOut={() => { scale.value = reduceMotion ? 1 : withSpring(1, { damping: 24, stiffness: 300 }); }}
      onFocus={() => { setFocused(true); onFocus?.(); }} onBlur={() => setFocused(false)}
      disabled={!onPress} accessibilityLabel={label} accessibilityState={{ selected: active, disabled: !onPress }} style={{
      maxWidth: '100%', minHeight: minTouch, minWidth: minTouch, justifyContent: 'center',
    }}>
      <Animated.View style={feedback}>
      {onMap ? <View style={[mapShape, { outlineWidth: focused ? 2 : 0, outlineColor: T.brandText, outlineOffset: 2 }]}>
        <MapGlassMaterial role={active ? 'selected' : 'filter'} />
        {icon ? <SF name={icon} size={14} color={active || isDark ? '#FFFFFF' : '#182843'} /> : null}
        <Text style={[ty.subheadEm, { color: active || isDark ? '#FFFFFF' : '#182843', flexShrink: 1 }]}>{label}</Text>
      </View> : (
      <View style={{
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, maxWidth: '100%',
        minHeight: 38, paddingVertical: 8, paddingHorizontal: 14, borderRadius: radius.pill, borderCurve: 'continuous',
        backgroundColor: isDark ? 'transparent' : active ? T.brand : '#E4E7F0',
        shadowColor: T.brand, shadowOpacity: active && !isDark ? 0.09 : 0,
        shadowRadius: 5, shadowOffset: { width: 0, height: 2 }, elevation: active ? 1 : 0,
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
      </Animated.View>
    </Pressable>
  );
}
