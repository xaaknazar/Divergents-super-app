import React, { useCallback, useEffect, useRef, useState } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { hexToRgba } from '../theme/personalization';
import { Chip } from './Chip';
import { SFName } from './SFIcon';

export type ChipRailItem = { key: string; label: string; icon?: SFName | string; active?: boolean; onPress: () => void };

export interface ChipRailProps {
  items: readonly ChipRailItem[];
  inset?: 'page' | 'compact' | 'none';
  itemRole?: 'button' | 'tab';
  overflowHint?: boolean;
}

/** Shared filter pills. When more filters are offscreen, the edge softly fades (no arrow
 * buttons covering pills — November 2026); selection and keyboard focus scroll a pill into view. */
export function ChipRail({ items, inset = 'page', itemRole = 'button', overflowHint = false }: ChipRailProps) {
  const { T, reduceMotion } = useTheme();
  const scroll = useRef<ScrollView>(null);
  const positions = useRef(new Map<string, { x: number; width: number }>());
  const viewport = useRef(0);
  const contentWidth = useRef(0);
  const offset = useRef(0);
  const [edges, setEdges] = useState({ previous: false, next: false });
  const activeKey = items.find(item => item.active)?.key;
  const gutter = inset === 'page' ? 16 : inset === 'compact' ? 12 : 0;
  const keys = JSON.stringify(items.map(item => item.key));
  const updateEdges = useCallback(() => {
    const max = Math.max(0, contentWidth.current - viewport.current);
    offset.current = Math.max(0, Math.min(max, offset.current));
    const previous = overflowHint && viewport.current > 0 && offset.current > 1;
    const next = overflowHint && viewport.current > 0 && max - offset.current > 1;
    setEdges(current => current.previous === previous && current.next === next ? current : { previous, next });
  }, [overflowHint]);
  const scrollTo = useCallback((x: number, animated: boolean) => {
    const max = Math.max(0, contentWidth.current - viewport.current);
    const next = Math.max(0, Math.min(max, x));
    if (Math.abs(next - offset.current) < 1) return;
    offset.current = next;
    updateEdges();
    scroll.current?.scrollTo({ x: next, animated: animated && !reduceMotion });
  }, [reduceMotion, updateEdges]);
  const reveal = useCallback((key: string | undefined, animated: boolean) => {
    const item = key ? positions.current.get(key) : undefined;
    if (!item || !viewport.current || !contentWidth.current) return;
    const max = Math.max(0, contentWidth.current - viewport.current);
    // Keep a revealed pill clear of the fade at intermediate offsets too.
    const guard = overflowHint && max > 1 ? FADE : 0;
    const left = item.x - gutter - guard;
    const right = item.x + item.width + gutter + guard;
    const oversized = item.width + gutter * 2 > viewport.current - guard * 2;
    const next = oversized || left < offset.current ? left
      : right > offset.current + viewport.current ? right - viewport.current : offset.current;
    scrollTo(next, animated);
  }, [gutter, overflowHint, scrollTo]);
  useEffect(() => {
    const existing = new Set<string>(JSON.parse(keys));
    for (const key of positions.current.keys()) {
      if (!existing.has(key)) positions.current.delete(key);
    }
    updateEdges();
    reveal(activeKey, true);
  }, [activeKey, keys, reveal, updateEdges]);

  if (!items.length) return null;
  return <View testID="chip-rail" style={styles.rail}>
    <ScrollView ref={scroll} testID="chip-rail-scroll" horizontal showsHorizontalScrollIndicator={false} scrollEventThrottle={16}
      keyboardShouldPersistTaps="handled" contentContainerStyle={[styles.row, { paddingHorizontal: gutter }]}
      onLayout={event => { viewport.current = event.nativeEvent.layout.width; updateEdges(); reveal(activeKey, false); }}
      onContentSizeChange={width => { contentWidth.current = width; updateEdges(); reveal(activeKey, false); }}
      onScroll={event => { offset.current = event.nativeEvent.contentOffset.x; updateEdges(); }}>
      {items.map(item => <View key={item.key} testID={`chip-rail-item-${item.key}`}
        onLayout={event => { positions.current.set(item.key, event.nativeEvent.layout); if (item.key === activeKey) reveal(item.key, false); }}>
        <Chip label={item.label} icon={item.icon} active={item.active} accessibilityRole={itemRole}
          onFocus={() => reveal(item.key, true)} onPress={() => { reveal(item.key, true); item.onPress(); }} />
      </View>)}
    </ScrollView>
    {(['previous', 'next'] as const).map(direction => edges[direction] ? <LinearGradient key={direction}
      testID={`chip-rail-fade-${direction}`} pointerEvents="none" accessible={false} importantForAccessibility="no-hide-descendants"
      start={{ x: direction === 'previous' ? 1 : 0, y: 0 }} end={{ x: direction === 'previous' ? 0 : 1, y: 0 }}
      colors={[hexToRgba(T.groupedBg, 0), T.groupedBg]}
      style={[styles.fade, direction === 'previous' ? styles.previous : styles.next]} /> : null)}
  </View>;
}

const FADE = 32;
const styles = StyleSheet.create({
  rail: { position: 'relative' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  fade: { position: 'absolute', top: 0, bottom: 0, width: FADE },
  previous: { left: 0 },
  next: { right: 0 },
});
