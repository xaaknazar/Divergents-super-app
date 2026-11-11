import { NavigationContext, NavigationRouteContext } from '@react-navigation/native';
import { RefObject, useContext, useEffect, useRef } from 'react';
import { ScrollView } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

/** Root tab re-tap only: never resets a hidden tab, nested page or prevented tap.
 * Optional contexts keep the shared Screen usable in previews and modals. */
export function useTabScrollToTop(ref: RefObject<ScrollView | null>, enabled = true, onScrollToTop?: () => void) {
  const beforeScroll = useRef(onScrollToTop);
  beforeScroll.current = onScrollToTop;
  const navigation = useContext(NavigationContext);
  const route = useContext(NavigationRouteContext);
  const { reduceMotion } = useTheme();
  useEffect(() => {
    if (!enabled || !navigation || !route || !navigation.getState) return;
    let parent = navigation;
    while (parent && parent.getState().type !== 'tab') parent = parent.getParent();
    if (!parent) return;
    let frame: number | undefined;
    // The parent navigation object is scoped to this screen's tab route.
    // @ts-expect-error tabPress belongs to the parent tab navigator.
    const unsubscribe = parent.addListener('tabPress', (event: { defaultPrevented?: boolean }) => {
      const state = navigation.getState();
      const focusedRoot = navigation.isFocused() && (state.type === 'tab' || state.routes[0]?.key === route.key);
      if (frame !== undefined) cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (focusedRoot && navigation.isFocused() && !event.defaultPrevented) {
          beforeScroll.current?.();
          ref.current?.scrollTo({ y: 0, animated: !reduceMotion });
        }
      });
    });
    return () => { unsubscribe(); if (frame !== undefined) cancelAnimationFrame(frame); };
  }, [enabled, navigation, route, ref, reduceMotion]);
}
