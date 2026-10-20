import React,{ useEffect,useRef } from 'react';
import { ScrollView,StyleSheet,View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { Chip } from './Chip';
import { SFName } from './SFIcon';

export type ChipRailItem = { key: string; label: string; icon?: SFName | string; active?: boolean; onPress: () => void };

/** Горизонтальная строка чипов. При открытии и смене выбора прокручивается так,
 * чтобы первый выбранный чип был виден (handoff 2026-10-20, §2.6). */
export function ChipRail({ items, inset = 'page' }: { items: readonly ChipRailItem[]; inset?: 'page' | 'compact' }) {
  const { reduceMotion } = useTheme();
  const scroll = useRef<ScrollView>(null);
  const positions = useRef(new Map<string, { x: number; width: number }>());
  const viewport = useRef(0);
  const offset = useRef(0);
  const activeKey = items.find(item => item.active)?.key;
  const gutter = inset === 'page' ? 16 : 12;
  const reveal = (animated: boolean) => {
    const item = activeKey ? positions.current.get(activeKey) : undefined;
    if (!item || !viewport.current) return;
    const left = item.x - gutter;
    const right = item.x + item.width + gutter;
    const next = left < offset.current ? left : right > offset.current + viewport.current ? right - viewport.current : offset.current;
    if (next !== offset.current) {
      offset.current = Math.max(0, next);
      scroll.current?.scrollTo({ x: offset.current, animated: animated && !reduceMotion });
    }
  };
  useEffect(() => { reveal(true); }, [activeKey]);
  if (!items.length) return null;
  return <ScrollView ref={scroll} horizontal showsHorizontalScrollIndicator={false} scrollEventThrottle={16}
    keyboardShouldPersistTaps="handled" contentContainerStyle={[styles.row, { paddingHorizontal: gutter }]}
    onLayout={event => { viewport.current = event.nativeEvent.layout.width; reveal(false); }}
    onScroll={event => { offset.current = event.nativeEvent.contentOffset.x; }}>
    {items.map(item => <View key={item.key}
      onLayout={event => { positions.current.set(item.key, event.nativeEvent.layout); if (item.key === activeKey) reveal(false); }}>
      <Chip label={item.label} icon={item.icon} active={item.active} onPress={item.onPress} />
    </View>)}
  </ScrollView>;
}

const styles = StyleSheet.create({ row: { flexDirection: 'row', gap: 8 } });
