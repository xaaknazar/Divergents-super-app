import { useCallback, useEffect, useRef, useState } from 'react';
import { LayoutChangeEvent, NativeScrollEvent, NativeSyntheticEvent, ScrollView } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

/** Native inertia owns scrolling. Reveal a selection once, never on every
 * item measurement or React render (those used to interrupt a running scroll). */
export function useHorizontalFilterScroll(activeKey: string | undefined, gutter: number, guard = 0) {
  const { reduceMotion } = useTheme();
  const scroll = useRef<ScrollView>(null);
  const positions = useRef(new Map<string, { x: number; width: number }>());
  const viewport = useRef(0), content = useRef(0), offset = useRef(0);
  const target = useRef<number | null>(null);
  const dragging = useRef(false), momentum = useRef(false);
  const pending = useRef<{ key: string; animated: boolean } | null>(activeKey ? { key: activeKey, animated: false } : null);
  const selected = useRef(activeKey);
  const frame = useRef<number | undefined>(undefined);
  const [edges, setEdges] = useState({ previous: false, next: false });
  const updateEdges = useCallback(() => {
    const max = Math.max(0, content.current - viewport.current);
    // Hints follow the visible content, never a requested animation's destination.
    const x = Math.max(0, Math.min(max, offset.current));
    const previous = viewport.current > 0 && x > 1;
    const next = viewport.current > 0 && max - x > 1;
    setEdges(old => old.previous === previous && old.next === next ? old : { previous, next });
  }, []);
  const scrollTo = useCallback((x: number, animated: boolean) => {
    const next = Math.max(0, Math.min(Math.max(0, content.current - viewport.current), x));
    if (Math.abs(next - (target.current ?? offset.current)) < 1) return;
    target.current = next;
    scroll.current?.scrollTo({ x: next, animated: animated && !reduceMotion });
    updateEdges();
  }, [reduceMotion, updateEdges]);
  const flush = useCallback(() => {
    if (dragging.current || momentum.current || !pending.current || !viewport.current || !content.current) return;
    const item = positions.current.get(pending.current.key);
    if (!item) return;
    const { animated } = pending.current;
    pending.current = null;
    const inset = gutter + (content.current > viewport.current ? guard : 0);
    const current = target.current ?? offset.current;
    const left = item.x - inset, right = item.x + item.width + inset;
    scrollTo(item.width + inset * 2 > viewport.current || left < current ? left
      : right > current + viewport.current ? right - viewport.current : current, animated);
  }, [gutter, guard, scrollTo]);
  const reveal = useCallback((key: string, animated = true) => {
    pending.current = { key, animated };
    flush();
  }, [flush]);
  useEffect(() => {
    if (selected.current !== activeKey) {
      selected.current = activeKey;
      pending.current = activeKey ? { key: activeKey, animated: true } : null;
      flush();
    }
  }, [activeKey, flush]);
  useEffect(() => () => { if (frame.current !== undefined) cancelAnimationFrame(frame.current); }, []);
  const onLayout = (event: LayoutChangeEvent) => {
    const width = event.nativeEvent.layout.width;
    if (viewport.current && width !== viewport.current && activeKey && !dragging.current && !momentum.current) {
      target.current = null;
      pending.current = { key: activeKey, animated: false };
    }
    viewport.current = width; updateEdges(); flush();
  };
  const onContentSizeChange = (width: number) => { content.current = width; updateEdges(); flush(); };
  const onItemLayout = (key: string, event: LayoutChangeEvent) => {
    positions.current.set(key, event.nativeEvent.layout); flush();
  };
  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    offset.current = event.nativeEvent.contentOffset.x;
    if (target.current !== null && Math.abs(offset.current - target.current) < 1) target.current = null;
    updateEdges();
  };
  return {
    scroll, edges, reveal, onItemLayout,
    scrollBy: (direction: -1 | 1) => scrollTo((target.current ?? offset.current) + viewport.current * direction * 0.7, true),
    scrollProps: {
      onLayout, onContentSizeChange, onScroll,
      decelerationRate: 'normal' as const, directionalLockEnabled: true, scrollEventThrottle: 16,
      onScrollBeginDrag: () => { dragging.current = true; target.current = null; pending.current = null; },
      onScrollEndDrag: () => {
        dragging.current = false;
        if (frame.current !== undefined) cancelAnimationFrame(frame.current);
        frame.current = requestAnimationFrame(flush);
      },
      onMomentumScrollBegin: () => { momentum.current = true; },
      onMomentumScrollEnd: () => { momentum.current = false; target.current = null; updateEdges(); flush(); },
    },
  };
}
