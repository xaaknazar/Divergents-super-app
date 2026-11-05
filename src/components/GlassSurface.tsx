// Liquid Glass — стекло iOS 26 для слоя управления: «назад», закрыть, иконки в шапке и кнопки
// поверх фото. Контент (карточки, списки) остаётся непрозрачным: стекло лежит над ним, а не
// вместо него (Apple HIG, «glass is never the point»).
//
// iOS 26+  — настоящий GlassView из expo-glass-effect (преломление, блик, реакция на нажатие).
// Раньше и на Android — матовое стекло: размытие фона + светлая заливка + тонкий блик по краю.
// «Понижение прозрачности» — сплошная плашка с рамкой, без размытия.
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { GlassView, isGlassEffectAPIAvailable, isLiquidGlassAvailable } from 'expo-glass-effect';
import React from 'react';
import { Platform, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

function detectNativeGlass() {
  if (Platform.OS !== 'ios') return false;
  try { return isLiquidGlassAvailable() && isGlassEffectAPIAvailable(); } catch { return false; }
}
/** Один раз на запуск: версия системы за время работы приложения не меняется. */
export const nativeGlass = detectNativeGlass();

export function GlassSurface({ children, style, tint, interactive = false, scheme }: {
  children?: React.ReactNode;
  /** Форма и размер: borderRadius обязателен — стекло всегда скруглено. */
  style: StyleProp<ViewStyle>;
  /** Цветное стекло для главного действия (например, цвет бренда). */
  tint?: string;
  interactive?: boolean;
  /** Поверх фото: тёмное стекло читается на любом кадре. По умолчанию — тема приложения. */
  scheme?: 'light' | 'dark';
}) {
  const theme = useTheme();
  const { reduceTransparency, T } = theme;
  const isDark = scheme ? scheme === 'dark' : theme.isDark;
  const radius = (StyleSheet.flatten(style)?.borderRadius as number | undefined) ?? 999;
  if (nativeGlass && !reduceTransparency) {
    return <GlassView glassEffectStyle="regular" isInteractive={interactive} tintColor={tint} colorScheme={scheme ?? 'auto'}
      style={[styles.center, { overflow: 'hidden', borderCurve: 'continuous' }, style]}>{children}</GlassView>;
  }
  if (reduceTransparency) {
    return <View style={[styles.center, style, { borderCurve: 'continuous', backgroundColor: tint ?? (scheme === 'dark' ? 'rgba(28,28,30,0.92)' : T.cardBg),
      borderWidth: StyleSheet.hairlineWidth, borderColor: T.cardBorder }]}>{children}</View>;
  }
  // Тень — на внешнем слое: внутренний обрезает размытие по форме, а обрезанная тень пропала бы.
  // Как у Apple (iOS 26): полупрозрачная заливка, мягкий свет сверху вниз и светлая кромка,
  // ярче по верхнему краю. В тёмной теме стекло светлее фона, в светлой — белее.
  const fill = tint ?? (scheme === 'dark' ? 'rgba(0,0,0,0.24)' : isDark ? 'rgba(96,96,102,0.42)' : 'rgba(255,255,255,0.42)');
  return <View style={[styles.center, style, isDark ? styles.liftDark : styles.lift, { borderCurve: 'continuous' }]}>
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: radius, overflow: 'hidden', borderCurve: 'continuous' }]}>
      <BlurView intensity={36} tint={scheme === 'dark' ? 'default' : isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: fill, opacity: tint ? 0.94 : 1 }]} />
      <LinearGradient colors={tint ? ['rgba(255,255,255,0.22)', 'rgba(255,255,255,0)'] : isDark || scheme === 'dark' ? ['rgba(255,255,255,0.13)', 'rgba(255,255,255,0.02)'] : ['rgba(255,255,255,0.55)', 'rgba(255,255,255,0.05)']}
        style={StyleSheet.absoluteFill} />
      <View style={[StyleSheet.absoluteFill, { borderRadius: radius, borderWidth: 1, borderCurve: 'continuous',
        borderColor: isDark || scheme === 'dark' ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.8)',
        borderTopColor: isDark || scheme === 'dark' ? 'rgba(255,255,255,0.26)' : '#FFFFFF' }]} />
    </View>
    {children}
  </View>;
}
const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  lift: { shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 3 },
  liftDark: { shadowColor: '#000', shadowOpacity: 0.35, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 3 },
});
