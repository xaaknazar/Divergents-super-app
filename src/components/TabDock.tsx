import { BlurView } from 'expo-blur';
import React, { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TAB_DOCK_GUTTER, TAB_DOCK_HEIGHT, TAB_DOCK_MAX_WIDTH, TAB_DOCK_PLAYER_GAP, tabDockBottomInset } from '../lib/tabDockLayout';
import { useTheme } from '../theme/ThemeContext';
import { hexToRgba } from '../theme/personalization';
import { radius, shadow } from '../theme/tokens';
import { SF } from './SFIcon';

export interface TabDockProps {
  items: readonly { id: string; label: string; shortLabel?: string; icon: string; selected: boolean }[];
  onSelect: (id: string) => void;
  onLongPress?: (id: string) => void;
  children?: React.ReactNode;
}

/** Floating glass navigation. Visuals are sealed here; TabBar owns routing. */
export function TabDock({ items, onSelect, onLongPress, children }: TabDockProps) {
  const { T, ty, isDark, reduceTransparency } = useTheme();
  const { width, fontScale } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [measuredWidth, setMeasuredWidth] = useState<number>();
  const [playerHeight, setPlayerHeight] = useState(0);
  const [focusedId, setFocusedId] = useState<string>();
  const availableWidth = Math.min(TAB_DOCK_MAX_WIDTH, width - insets.left - insets.right - TAB_DOCK_GUTTER * 2);
  const dockWidth = Math.min(measuredWidth ?? availableWidth, availableWidth);
  const slot = (dockWidth - 16) / Math.max(items.length, 1) - 8;
  const size = (ty.caption2.fontSize ?? 11) * fontScale;
  const fits = (label: string) => label.length * size * 0.58 + 4 <= slot;
  const labels = items.map(i => fits(i.label) ? i.label : i.shortLabel && fits(i.shortLabel) ? i.shortLabel : null);
  const labelLineHeight = Math.ceil(size * 1.25);
  const showLabels = labels.every(Boolean) && labelLineHeight + 25 + 5 + 4 <= TAB_DOCK_HEIGHT - 14;
  // SDK 54's Android blur is experimental. A tinted translucent surface keeps
  // navigation cheap over video/maps, without opting into that renderer.
  const useNativeMaterial = Platform.OS === 'ios' && !reduceTransparency;
  const surface = reduceTransparency ? T.cardBg : hexToRgba(T.cardBg, Platform.OS === 'android' ? 0.96 : isDark ? 0.84 : 0.78);
  const edge = hexToRgba(isDark ? T.label : T.systemBg, isDark ? 0.22 : 0.92);

  if (!items.length) return null;

  return <View pointerEvents="box-none" testID="tab-dock-position" style={[styles.position, {
    left: insets.left + TAB_DOCK_GUTTER, right: insets.right + TAB_DOCK_GUTTER, bottom: tabDockBottomInset(insets.bottom),
  }]}>
    <View pointerEvents="box-none" style={styles.width}>
      {/* Mini-player stays above the capsule, without a screen-wide scrim. */}
      <View testID="tab-dock-player" onLayout={event => setPlayerHeight(event.nativeEvent.layout.height)}
        style={[styles.player, { backgroundColor: T.cardBg, marginBottom: playerHeight > 0 ? TAB_DOCK_PLAYER_GAP : 0 }]}>
        {children}
      </View>
      <View style={[styles.elevation, shadow({ color: isDark ? T.systemBg : T.label, opacity: isDark ? 0.32 : 0.12, radius: 18, y: 6 })]}>
      <View testID="tab-dock-surface" onLayout={event => setMeasuredWidth(event.nativeEvent.layout.width)} style={[styles.surface, { borderColor: edge }]}>
        <View pointerEvents="none" accessible={false} importantForAccessibility="no-hide-descendants" style={StyleSheet.absoluteFill}>
          {useNativeMaterial ? <BlurView testID="tab-dock-blur" intensity={72}
            tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} /> : null}
          <View testID="tab-dock-tint" style={[StyleSheet.absoluteFill, { backgroundColor: surface }]} />
        </View>
        <View style={styles.row}>
          {items.map((item, i) => <Pressable key={item.id} accessibilityRole="tab" accessibilityLabel={item.label}
            accessibilityShowsLargeContentViewer accessibilityLargeContentTitle={item.label}
            accessibilityState={{ selected: item.selected }} onPress={() => onSelect(item.id)}
            onLongPress={onLongPress ? () => onLongPress(item.id) : undefined}
            onFocus={() => setFocusedId(item.id)} onBlur={() => setFocusedId(undefined)}
            style={({ pressed }) => [styles.tab, {
              opacity: pressed ? 0.65 : 1,
              backgroundColor: item.selected ? T.brandTintedStrong : 'transparent',
              borderColor: focusedId === item.id ? T.brandText : item.selected ? T.brandTinted : 'transparent',
            }]}>
            <View pointerEvents="none" accessible={false} importantForAccessibility="no-hide-descendants">
              <SF name={item.icon} size={showLabels ? 25 : 28} color={item.selected ? T.brandText : T.labelSecondary} />
            </View>
            {showLabels ? <Text numberOfLines={1} allowFontScaling={false} style={[ty.caption2, {
              fontSize: size, lineHeight: labelLineHeight, color: item.selected ? T.brandText : T.labelSecondary,
            }]}>{labels[i]}</Text> : null}
          </Pressable>)}
        </View>
      </View>
      </View>
    </View>
  </View>;
}

const styles = StyleSheet.create({
  position: { position: 'absolute', alignItems: 'center' },
  width: { width: '100%', maxWidth: TAB_DOCK_MAX_WIDTH },
  elevation: { borderRadius: radius.pill },
  surface: { height: TAB_DOCK_HEIGHT, borderRadius: radius.pill, borderWidth: 1, overflow: 'hidden', padding: 6 },
  player: { borderRadius: 24, overflow: 'hidden' },
  row: { flex: 1, flexDirection: 'row', gap: 2 },
  tab: { flex: 1, minWidth: 0, minHeight: 64, paddingHorizontal: 2, gap: 5,
    alignItems: 'center', justifyContent: 'center', borderRadius: radius.pill, borderWidth: 2 },
});
