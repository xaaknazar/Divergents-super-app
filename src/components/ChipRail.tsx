import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { minTouch, radius } from '../theme/tokens';
import { Chip } from './Chip';
import { SF, SFName } from './SFIcon';

export type ChipRailItem = { key: string; label: string; icon?: SFName | string; active?: boolean; onPress: () => void };

export interface ChipRailProps {
  items: readonly ChipRailItem[];
  inset?: 'page' | 'compact' | 'none';
  itemRole?: 'button' | 'tab';
  overflowHint?: boolean;
}

/** Shared filter pills. Edge controls appear only when more filters are offscreen;
 * selection and keyboard focus reveal a pill without hiding it behind a control. */
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
    // Reserve space for controls at intermediate offsets too, not just the current edge.
    const guard = overflowHint && max > 1 ? minTouch + 4 : 0;
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
    {(['previous', 'next'] as const).map(direction => edges[direction] ? <Pressable key={direction}
      testID={`chip-rail-${direction}`} accessibilityRole="button"
      accessibilityLabel={direction === 'previous' ? 'Предыдущие фильтры' : 'Следующие фильтры'}
      accessibilityHint="Прокрутить список без изменения выбранного фильтра"
      onPress={() => scrollTo(offset.current + viewport.current * (direction === 'previous' ? -0.7 : 0.7), true)}
      style={({ pressed }) => [styles.arrow, direction === 'previous' ? styles.previous : styles.next, {
        backgroundColor: T.cardBg, borderColor: T.separator, opacity: pressed ? 0.65 : 1,
      }]}>
      <View accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <SF name={direction === 'previous' ? 'chevron.left' : 'chevron.right'} size={16} color={T.brandText} />
      </View>
    </Pressable> : null)}
  </View>;
}

const styles = StyleSheet.create({
  rail: { position: 'relative' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  arrow: {
    position: 'absolute', top: 0, bottom: 0, minWidth: minTouch, minHeight: minTouch,
    alignItems: 'center', justifyContent: 'center', borderRadius: radius.pill, borderWidth: 0.5,
    shadowColor: '#000', shadowOpacity: 0.14, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 3,
  },
  previous: { left: 0 },
  next: { right: 0 },
});
