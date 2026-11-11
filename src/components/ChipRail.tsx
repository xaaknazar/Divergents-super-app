import React from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { hexToRgba } from '../theme/personalization';
import { Chip } from './Chip';
import { SFName } from './SFIcon';
import { useHorizontalFilterScroll } from '../state/useHorizontalFilterScroll';

export type ChipRailItem = { key: string; label: string; icon?: SFName | string; active?: boolean; onPress: () => void };

export interface ChipRailProps {
  items: readonly ChipRailItem[];
  inset?: 'page' | 'compact' | 'none';
  itemRole?: 'button' | 'tab';
  overflowHint?: boolean;
  /** Рейка лежит поверх карты: стеклянные чипы (см. Chip.onMap). */
  onMap?: boolean;
}

/** Shared filter pills. When more filters are offscreen, the edge softly fades (no arrow
 * buttons covering pills — November 2026); selection and keyboard focus scroll a pill into view. */
export function ChipRail({ items, inset = 'page', itemRole = 'button', overflowHint = false, onMap = false }: ChipRailProps) {
  const { T } = useTheme();
  const activeKey = items.find(item => item.active)?.key;
  const gutter = inset === 'page' ? 16 : inset === 'compact' ? 12 : 0;
  const { scroll, edges, reveal, onItemLayout, scrollProps } = useHorizontalFilterScroll(activeKey, gutter, overflowHint ? FADE : 0);

  if (!items.length) return null;
  return <View testID="chip-rail" style={styles.rail}>
    <ScrollView ref={scroll} testID="chip-rail-scroll" horizontal showsHorizontalScrollIndicator={false}
      keyboardShouldPersistTaps="handled" contentContainerStyle={[styles.row, { paddingHorizontal: gutter }]}
      {...scrollProps}>
      {items.map(item => <View key={item.key} testID={`chip-rail-item-${item.key}`}
        onLayout={event => onItemLayout(item.key, event)}>
        <Chip label={item.label} icon={item.icon} active={item.active} accessibilityRole={itemRole} onMap={onMap}
          onFocus={() => reveal(item.key, true)} onPress={item.onPress} />
      </View>)}
    </ScrollView>
    {(['previous', 'next'] as const).map(direction => overflowHint && edges[direction] ? <LinearGradient key={direction}
      testID={`chip-rail-fade-${direction}`} pointerEvents="none" accessible={false} importantForAccessibility="no-hide-descendants"
      start={{ x: direction === 'previous' ? 1 : 0, y: 0 }} end={{ x: direction === 'previous' ? 0 : 1, y: 0 }}
      colors={[hexToRgba(T.groupedBg, 0), T.groupedBg]}
      style={[styles.fade, direction === 'previous' ? styles.previous : styles.next]} /> : null)}
  </View>;
}

const FADE = 32;
const styles = StyleSheet.create({
  rail: { position: 'relative' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8 },
  fade: { position: 'absolute', top: 0, bottom: 0, width: FADE },
  previous: { left: 0 },
  next: { right: 0 },
});
