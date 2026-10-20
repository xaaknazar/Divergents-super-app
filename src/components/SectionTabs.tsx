import { BlurView } from 'expo-blur';
import React, { useEffect, useRef, useState } from 'react';
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
  const { T, ty, isDark, reduceTransparency, reduceMotion } = useTheme();
  const scroll = useRef<ScrollView>(null);
  const positions = useRef(new Map<number, { x: number; width: number }>());
  const viewport = useRef(0);
  const offset = useRef(0);
  const [focusedId, setFocusedId] = useState<number>();
  const reveal = (id: number) => {
    const item = positions.current.get(id);
    if (!item || !viewport.current) return;
    const left = item.x - 4;
    const right = item.x + item.width + 4;
    const next = item.width > viewport.current - 8 || left < offset.current ? left
      : right > offset.current + viewport.current ? right - viewport.current : offset.current;
    if (next !== offset.current) {
      offset.current = Math.max(0, next);
      scroll.current?.scrollTo({ x: offset.current, animated: !reduceMotion });
    }
  };
  useEffect(() => { reveal(value); }, [value, reduceMotion]);

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
        contentContainerStyle={styles.row} keyboardShouldPersistTaps="handled" scrollEventThrottle={16}
        onLayout={event => { viewport.current = event.nativeEvent.layout.width; reveal(value); }}
        onScroll={event => { offset.current = event.nativeEvent.contentOffset.x; }}>
        {items.map(item => <Pressable key={item.id} accessibilityRole="tab" accessibilityLabel={item.label}
          accessibilityState={{ selected: value === item.id }}
          onLayout={event => { positions.current.set(item.id, event.nativeEvent.layout); if (item.id === value) reveal(value); }}
          onFocus={() => { setFocusedId(item.id); reveal(item.id); }} onBlur={() => setFocusedId(undefined)}
          onPress={() => { reveal(item.id); onChange(item.id); }}
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
  row: { flexDirection: 'row', flexWrap: 'nowrap', gap: 4, padding: 4 },
  tab: { minHeight: minTouch, minWidth: minTouch, flexShrink: 0, paddingHorizontal: 18, paddingVertical: 10,
    borderWidth: 2, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  // Soft lift for the selected segment, like the iOS segmented control.
  selected: { shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
});
