import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef, useState } from 'react';
import { I18nManager, Platform, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TAB_DOCK_GUTTER, TAB_DOCK_HEIGHT, TAB_DOCK_MAX_WIDTH, TAB_DOCK_PLAYER_GAP, tabDockBottomInset, tabDockItemWidths } from '../lib/tabDockLayout';
import { useTheme } from '../theme/ThemeContext';
import { hexToRgba } from '../theme/personalization';
import { shadow } from '../theme/tokens';
import { GlassView } from 'expo-glass-effect';
import { darkGlassTint, nativeGlass } from './GlassSurface';
import { SF } from './SFIcon';
import { BottomFade } from './BottomFade';

export interface TabDockProps {
  items: readonly { id: string; label: string; icon: string; selected: boolean }[];
  onSelect: (id: string) => void;
  onLongPress?: (id: string) => void;
  children?: React.ReactNode;
}

/** Floating glass navigation. Visuals are sealed here; TabBar owns routing.
 * iOS 26 (Liquid Glass): панель — пилюля, под выбранной вкладкой — нейтральная стеклянная
 * капсула (концентрично панели), которая скользит пружиной. На iOS 26 — системное стекло,
 * ниже — размытие с подкраской; «Понижение прозрачности» — сплошная панель. */
export function TabDock({ items, onSelect, onLongPress, children }: TabDockProps) {
  const { T, ty, isDark, reduceTransparency, reduceMotion } = useTheme();
  const { width, fontScale } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [measuredWidth, setMeasuredWidth] = useState<number>();
  const [playerHeight, setPlayerHeight] = useState(0);
  const [focusedId, setFocusedId] = useState<string>();
  const [rowWidth, setRowWidth] = useState(0);
  const [textWidths, setTextWidths] = useState<Record<string, number>>({});
  const capsuleX = useSharedValue(0);
  const capsuleSize = useSharedValue(0);
  const previousGeometry = useRef('');
  const selectedIndex = items.findIndex(item => item.selected);
  const availableWidth = Math.min(TAB_DOCK_MAX_WIDTH, width - insets.left - insets.right - TAB_DOCK_GUTTER * 2);
  const dockWidth = Math.min(measuredWidth ?? availableWidth, availableWidth);
  const contentWidth = rowWidth || Math.max(0, dockWidth - 9);
  const size = Math.max(11, (ty.caption2.fontSize ?? 11) * fontScale);
  const labelLineHeight = Math.ceil(size * 1.25);
  const labels = items.map(item => item.label);
  const metricKeys = labels.map(label => `${ty.caption2Em.fontFamily}:${size}:${label}`);
  const naturalWidths = labels.map((label, index) => textWidths[metricKeys[index]] ?? label.length * size * 0.75);
  const minimumLabelWidth = naturalWidths.reduce((sum, textWidth) => sum + Math.max(44, textWidth + 4), 0);
  const showLabels = minimumLabelWidth <= contentWidth && labelLineHeight + ICON + 3 + 8 <= TAB_DOCK_HEIGHT - 8;
  const widths = showLabels ? tabDockItemWidths(naturalWidths, contentWidth) : items.map(() => contentWidth / items.length);
  const capsuleWidth = widths[selectedIndex] ?? 0;
  const leadingWidth = widths.slice(0, Math.max(0, selectedIndex)).reduce((sum, itemWidth) => sum + itemWidth, 0);
  const targetX = I18nManager.isRTL ? contentWidth - leadingWidth - capsuleWidth : leadingWidth;
  const geometry = `${contentWidth}:${widths.join(':')}:${items.map(item => item.id).join(':')}`;
  useEffect(() => {
    const target = Math.max(0, targetX);
    // First layout and rotation place the pill directly. Subsequent taps can
    // interrupt the spring, continuing from its current position and velocity.
    const immediate = reduceMotion || previousGeometry.current !== geometry;
    const spring = { stiffness: 280, damping: 26, mass: 0.9 };
    capsuleX.value = immediate ? target : withSpring(target, spring);
    capsuleSize.value = immediate ? capsuleWidth : withSpring(capsuleWidth, spring);
    previousGeometry.current = geometry;
  }, [targetX, capsuleWidth, geometry, reduceMotion, capsuleX, capsuleSize]);
  const capsuleStyle = useAnimatedStyle(() => ({ width: capsuleSize.value, transform: [{ translateX: capsuleX.value }] }));
  // SDK 54's Android blur is experimental. A tinted translucent surface keeps
  // navigation cheap over video/maps, without opting into that renderer.
  const useNativeMaterial = Platform.OS === 'ios' && !reduceTransparency;
  const surface = reduceTransparency ? T.cardBg : Platform.OS === 'ios' && isDark ? 'rgba(255,255,255,0.04)'
    : hexToRgba(T.cardBg, Platform.OS === 'android' ? 0.96 : 0.84);
  // Светлое стекло поверх blur: градиент сверху вниз, как в макете.
  const glass = useNativeMaterial && !isDark;
  const edge = isDark ? hexToRgba(T.label, 0.22) : 'rgba(255,255,255,0.75)';
  const idle = isDark ? 'rgba(255,255,255,0.86)' : '#8A8F98';
  // Выбранная вкладка: синяя в светлой теме, белая в тёмной — как системные панели iOS 26.
  const active = isDark ? '#FFFFFF' : T.brandText;
  const capsuleFill = isDark ? 'rgba(255,255,255,0.14)' : hexToRgba(T.brand, 0.10);
  const capsuleEdge = isDark ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.9)';
  const liquid = nativeGlass && !reduceTransparency;

  if (!items.length) return null;

  return <>
    <BottomFade />
    <View pointerEvents="box-none" testID="tab-dock-position" style={[styles.position, {
    left: insets.left + TAB_DOCK_GUTTER, right: insets.right + TAB_DOCK_GUTTER, bottom: tabDockBottomInset(insets.bottom),
  }]}>
    <View pointerEvents="box-none" style={styles.width}>
      <View pointerEvents="none" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.measurements}>
        {labels.map((label, index) => <Text key={metricKeys[index]} testID={`tab-dock-measure-${items[index].id}`} numberOfLines={1} allowFontScaling={false}
          style={[ty.caption2Em, { fontSize: size }]} onTextLayout={event => {
            const measured = event.nativeEvent.lines[0]?.width;
            if (!measured || !Number.isFinite(measured)) return;
            const key = metricKeys[index];
            setTextWidths(previous => Math.abs((previous[key] ?? 0) - measured) < 0.1 ? previous : { ...previous, [key]: measured });
          }}>{label}</Text>)}
      </View>
      {/* Mini-player stays above the capsule; the fade itself remains non-interactive. */}
      <View testID="tab-dock-player" onLayout={event => setPlayerHeight(event.nativeEvent.layout.height)}
        style={{ marginBottom: playerHeight > 0 ? TAB_DOCK_PLAYER_GAP : 0 }}>
        {children}
      </View>
      <View style={[styles.elevation, isDark ? shadow({ color: T.systemBg, opacity: 0.32, radius: 18, y: 6 })
        : shadow({ color: '#234088', opacity: 0.14, radius: 15, y: 10, elevation: 6 })]}>
      <View testID="tab-dock-surface" onLayout={event => setMeasuredWidth(event.nativeEvent.layout.width)} style={[styles.surface, { borderColor: edge }]}>
        <View pointerEvents="none" accessible={false} importantForAccessibility="no-hide-descendants" style={StyleSheet.absoluteFill}>
          {liquid ? <GlassView testID="tab-dock-glass" glassEffectStyle={isDark ? 'regular' : 'clear'} colorScheme={isDark ? 'dark' : 'light'}
            tintColor={isDark ? darkGlassTint : 'rgba(255,255,255,0.62)'} style={StyleSheet.absoluteFill} />
          : useNativeMaterial ? <BlurView testID="tab-dock-blur" intensity={40}
            tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} /> : null}
          {liquid ? null : glass ? <LinearGradient testID="tab-dock-tint" colors={['rgba(255,255,255,0.58)', 'rgba(255,255,255,0.42)']}
            style={StyleSheet.absoluteFill} />
            : <View testID="tab-dock-tint" style={[StyleSheet.absoluteFill, { backgroundColor: surface }]} />}
        </View>
        <View testID="tab-dock-row" style={styles.row} onLayout={event => setRowWidth(event.nativeEvent.layout.width)}>
          {selectedIndex >= 0 && rowWidth > 0 ? <Animated.View testID="tab-dock-active-capsule"
            pointerEvents="none" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
            style={[styles.capsule, { width: capsuleWidth, backgroundColor: capsuleFill,
              borderColor: capsuleEdge }, capsuleStyle]} /> : null}
          {items.map((item, i) => <Pressable key={item.id} accessibilityRole="tab" accessibilityLabel={item.label}
            accessibilityShowsLargeContentViewer accessibilityLargeContentTitle={item.label}
            accessibilityState={{ selected: item.selected }} onPress={() => onSelect(item.id)}
            onLongPress={onLongPress ? () => onLongPress(item.id) : undefined}
            onFocus={() => setFocusedId(item.id)} onBlur={() => setFocusedId(undefined)}
            style={({ pressed }) => [styles.tab, {
              width: widths[i],
              opacity: pressed ? 0.65 : 1,
            }]}>
            {focusedId === item.id ? <View pointerEvents="none" testID="tab-dock-focus-ring" style={[styles.focusRing, { borderColor: T.brandText }]} /> : null}
            <View pointerEvents="none" accessible={false} importantForAccessibility="no-hide-descendants">
              <SF name={item.icon} size={showLabels ? ICON : 28} color={item.selected ? active : idle} />
            </View>
            {showLabels ? <Text numberOfLines={1} allowFontScaling={false} style={[styles.label, item.selected ? ty.caption2Em : ty.caption2, {
              fontSize: size, lineHeight: labelLineHeight, color: item.selected ? active : idle,
            }]}>{labels[i]}</Text> : null}
          </Pressable>)}
        </View>
      </View>
      </View>
    </View>
  </View></>;
}

const ICON = 24;
// Пилюля: радиус — половина высоты; капсула вкладки концентрична (панель минус отступ 4).
const DOCK_RADIUS = TAB_DOCK_HEIGHT / 2;
const TAB_RADIUS = DOCK_RADIUS - 4;
const styles = StyleSheet.create({
  position: { position: 'absolute', alignItems: 'center' },
  width: { width: '100%', maxWidth: TAB_DOCK_MAX_WIDTH },
  elevation: { borderRadius: DOCK_RADIUS, borderCurve: 'continuous' },
  surface: { height: TAB_DOCK_HEIGHT, borderRadius: DOCK_RADIUS, borderCurve: 'continuous', borderWidth: 0.5, overflow: 'hidden', padding: 4 },
  row: { flex: 1, flexDirection: 'row' },
  tab: { minWidth: 0, minHeight: 60, paddingHorizontal: 2, gap: 3,
    alignItems: 'center', justifyContent: 'center', borderRadius: TAB_RADIUS, borderCurve: 'continuous' },
  capsule: { position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: TAB_RADIUS, borderCurve: 'continuous', borderWidth: StyleSheet.hairlineWidth },
  label: { width: '100%', textAlign: 'center' },
  measurements: { position: 'absolute', left: 0, right: 0, top: 0, opacity: 0 },
  focusRing: { ...StyleSheet.absoluteFillObject, borderWidth: 2, borderRadius: TAB_RADIUS, borderCurve: 'continuous' },
});
