import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TAB_DOCK_GUTTER, TAB_DOCK_HEIGHT, TAB_DOCK_MAX_WIDTH, TAB_DOCK_PLAYER_GAP, tabDockBottomInset } from '../lib/tabDockLayout';
import { useTheme } from '../theme/ThemeContext';
import { hexToRgba } from '../theme/personalization';
import { shadow } from '../theme/tokens';
import { SF } from './SFIcon';

export interface TabDockProps {
  items: readonly { id: string; label: string; shortLabel?: string; icon: string; selected: boolean }[];
  onSelect: (id: string) => void;
  onLongPress?: (id: string) => void;
  children?: React.ReactNode;
}

/** Floating glass navigation. Visuals are sealed here; TabBar owns routing.
 * Панель — радиус 24; выбранная вкладка заполняет всю ячейку, радиус 18 (концентрично). */
export function TabDock({ items, onSelect, onLongPress, children }: TabDockProps) {
  const { T, ty, isDark, reduceTransparency } = useTheme();
  const { width, fontScale } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [measuredWidth, setMeasuredWidth] = useState<number>();
  const [playerHeight, setPlayerHeight] = useState(0);
  const [focusedId, setFocusedId] = useState<string>();
  const availableWidth = Math.min(TAB_DOCK_MAX_WIDTH, width - insets.left - insets.right - TAB_DOCK_GUTTER * 2);
  const dockWidth = Math.min(measuredWidth ?? availableWidth, availableWidth);
  const slot = (dockWidth - 8) / Math.max(items.length, 1) - 4;
  const size = (ty.caption2.fontSize ?? 11) * fontScale;
  const fits = (label: string) => label.length * size * 0.58 + 4 <= slot;
  const labels = items.map(i => fits(i.label) ? i.label : i.shortLabel && fits(i.shortLabel) ? i.shortLabel : null);
  const labelLineHeight = Math.ceil(size * 1.25);
  const showLabels = labels.every(Boolean) && labelLineHeight + ICON + 3 + 8 <= TAB_DOCK_HEIGHT - 8;
  // SDK 54's Android blur is experimental. A tinted translucent surface keeps
  // navigation cheap over video/maps, without opting into that renderer.
  const useNativeMaterial = Platform.OS === 'ios' && !reduceTransparency;
  const surface = reduceTransparency ? T.cardBg : hexToRgba(T.cardBg, Platform.OS === 'android' ? 0.96 : 0.84);
  // Светлое стекло поверх blur: градиент сверху вниз, как в макете.
  const glass = useNativeMaterial && !isDark;
  const edge = isDark ? hexToRgba(T.label, 0.22) : 'rgba(255,255,255,0.75)';
  const idle = isDark ? T.labelTertiary : '#8A8F98';

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
      <View style={[styles.elevation, isDark ? shadow({ color: T.systemBg, opacity: 0.32, radius: 18, y: 6 })
        : shadow({ color: '#234088', opacity: 0.14, radius: 15, y: 10, elevation: 6 })]}>
      <View testID="tab-dock-surface" onLayout={event => setMeasuredWidth(event.nativeEvent.layout.width)} style={[styles.surface, { borderColor: edge }]}>
        <View pointerEvents="none" accessible={false} importantForAccessibility="no-hide-descendants" style={StyleSheet.absoluteFill}>
          {useNativeMaterial ? <BlurView testID="tab-dock-blur" intensity={72}
            tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} /> : null}
          {glass ? <LinearGradient testID="tab-dock-tint" colors={['rgba(255,255,255,0.58)', 'rgba(244,246,251,0.42)']}
            style={StyleSheet.absoluteFill} />
            : <View testID="tab-dock-tint" style={[StyleSheet.absoluteFill, { backgroundColor: surface }]} />}
        </View>
        <View style={styles.row}>
          {items.map((item, i) => <Pressable key={item.id} accessibilityRole="tab" accessibilityLabel={item.label}
            accessibilityShowsLargeContentViewer accessibilityLargeContentTitle={item.label}
            accessibilityState={{ selected: item.selected }} onPress={() => onSelect(item.id)}
            onLongPress={onLongPress ? () => onLongPress(item.id) : undefined}
            onFocus={() => setFocusedId(item.id)} onBlur={() => setFocusedId(undefined)}
            style={({ pressed }) => [styles.tab, {
              opacity: pressed ? 0.65 : 1,
              backgroundColor: item.selected ? T.brandTinted : 'transparent',
              borderColor: focusedId === item.id ? T.brandText : 'transparent',
            }]}>
            {item.selected ? <View pointerEvents="none" style={[styles.selectedLine, { borderColor: hexToRgba(T.brand, 0.12) }]} /> : null}
            <View pointerEvents="none" accessible={false} importantForAccessibility="no-hide-descendants">
              <SF name={item.icon} size={showLabels ? ICON : 28} color={item.selected ? T.brandText : idle} />
            </View>
            {showLabels ? <Text numberOfLines={1} allowFontScaling={false} style={[item.selected ? ty.caption2Em : ty.caption2, {
              fontSize: size, lineHeight: labelLineHeight, color: item.selected ? T.brandText : idle,
            }]}>{labels[i]}</Text> : null}
          </Pressable>)}
        </View>
      </View>
      </View>
    </View>
  </View>;
}

const ICON = 24;
const DOCK_RADIUS = 24;
const TAB_RADIUS = 18;
const styles = StyleSheet.create({
  position: { position: 'absolute', alignItems: 'center' },
  width: { width: '100%', maxWidth: TAB_DOCK_MAX_WIDTH },
  elevation: { borderRadius: DOCK_RADIUS, borderCurve: 'continuous' },
  surface: { height: TAB_DOCK_HEIGHT, borderRadius: DOCK_RADIUS, borderCurve: 'continuous', borderWidth: 0.5, overflow: 'hidden', padding: 4 },
  player: { borderRadius: DOCK_RADIUS, overflow: 'hidden' },
  row: { flex: 1, flexDirection: 'row' },
  tab: { flex: 1, minWidth: 0, minHeight: 60, paddingHorizontal: 2, gap: 3,
    alignItems: 'center', justifyContent: 'center', borderRadius: TAB_RADIUS, borderCurve: 'continuous', borderWidth: 2 },
  // Внутренняя линия 0.5 выбранной ячейки; рамка 2 остаётся под фокус клавиатуры.
  selectedLine: { position: 'absolute', top: -2, left: -2, right: -2, bottom: -2, borderRadius: TAB_RADIUS, borderWidth: 0.5 },
});
