import { BlurView } from 'expo-blur';
import React, { useState } from 'react';
import { useHorizontalFilterScroll } from '../state/useHorizontalFilterScroll';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { hexToRgba } from '../theme/personalization';
import { minTouch, radius } from '../theme/tokens';

export interface SectionTabsProps {
  items: ReadonlyArray<{ id: number; label: string }>;
  value: number;
  onChange: (id: number) => void;
}

/** One scrollable glass rail that follows the light/dark theme; full labels remain available at any text size. */
export function SectionTabs({ items, value, onChange }: SectionTabsProps) {
  const { T, ty, isDark, reduceTransparency } = useTheme();
  const [focusedId, setFocusedId] = useState<number>();
  const { scroll, reveal, onItemLayout, scrollProps } = useHorizontalFilterScroll(String(value), 4);

  if (!items.length) return null;

  return <View testID="section-tabs-container">
    <View testID="section-tabs-surface" style={[styles.surface, { borderColor: T.cardBorder }]}>
      <View pointerEvents="none" accessible={false} importantForAccessibility="no-hide-descendants" style={StyleSheet.absoluteFill}>
        {Platform.OS === 'ios' && !reduceTransparency ? <BlurView testID="section-tabs-blur" intensity={40} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} /> : null}
        <View testID="section-tabs-tint" style={[StyleSheet.absoluteFill, {
          backgroundColor: reduceTransparency ? T.cardBg : hexToRgba(T.cardBg, Platform.OS === 'ios' ? 0.82 : 0.97),
        }]} />
      </View>
      <ScrollView ref={scroll} testID="section-tabs-scroll" horizontal showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row} keyboardShouldPersistTaps="handled" {...scrollProps}>
        {items.map(item => <Pressable key={item.id} accessibilityRole="tab" accessibilityLabel={item.label}
          accessibilityState={{ selected: value === item.id }}
          onLayout={event => onItemLayout(String(item.id), event)}
          onFocus={() => { setFocusedId(item.id); reveal(String(item.id)); }} onBlur={() => setFocusedId(undefined)}
          onPress={() => onChange(item.id)}
          style={({ pressed }) => [styles.tab, {
            backgroundColor: value === item.id ? T.brand : pressed ? T.fillPrimary : 'transparent',
            borderColor: focusedId === item.id ? T.label : 'transparent',
            opacity: pressed ? 0.75 : 1,
          }, value === item.id ? styles.selected : null]}>
          <Text style={[ty.footnoteEm, { color: value === item.id ? T.onBrand : T.labelSecondary }]}>{item.label}</Text>
        </Pressable>)}
      </ScrollView>
    </View>
  </View>;
}

const styles = StyleSheet.create({
  surface: { borderRadius: radius.pill, borderWidth: 1, overflow: 'hidden' },
  row: { flexDirection: 'row', flexWrap: 'nowrap', gap: 4, paddingHorizontal: 4, paddingVertical: 8 },
  tab: { minHeight: minTouch, minWidth: minTouch, flexShrink: 0, paddingHorizontal: 16, paddingVertical: 10,
    borderWidth: 2, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  // Soft lift for the selected segment, like the iOS segmented control.
  selected: { shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
});
