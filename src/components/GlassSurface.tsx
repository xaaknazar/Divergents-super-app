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

export function GlassSurface({ children, style, tint, interactive = false, scheme, variant = 'regular' }: {
  children?: React.ReactNode;
  /** Форма и размер: borderRadius обязателен — стекло всегда скруглено. */
  style: StyleProp<ViewStyle>;
  /** Цветное стекло для главного действия (например, цвет бренда). */
  tint?: string;
  interactive?: boolean;
  /** Поверх фото: тёмное стекло читается на любом кадре. По умолчанию — тема приложения. */
  scheme?: 'light' | 'dark';
  /** clear — прозрачное стекло поверх яркого фона (фото, цветная шапка), как «clear» у Apple. */
  variant?: 'regular' | 'clear';
}) {
  const theme = useTheme();
  const { reduceTransparency, T } = theme;
  const isDark = scheme ? scheme === 'dark' : theme.isDark;
  const clear = variant === 'clear';
  const radius = (StyleSheet.flatten(style)?.borderRadius as number | undefined) ?? 999;
  if (nativeGlass && !reduceTransparency) {
    return <GlassView glassEffectStyle={clear ? 'clear' : 'regular'} isInteractive={interactive} tintColor={tint} colorScheme={scheme ?? 'auto'}
      style={[styles.center, { overflow: 'hidden', borderCurve: 'continuous' }, style]}>{children}</GlassView>;
  }
  if (reduceTransparency) {
    return <View style={[styles.center, style, { borderCurve: 'continuous', backgroundColor: tint ?? (clear ? 'rgba(255,255,255,0.28)' : scheme === 'dark' ? 'rgba(28,28,30,0.92)' : T.cardBg),
      borderWidth: StyleSheet.hairlineWidth, borderColor: clear ? 'rgba(255,255,255,0.6)' : T.cardBorder }]}>{children}</View>;
  }
  // Запасной вид (Android, iOS до 26, превью) — как Liquid Glass у Apple: размытый фон
  // сквозь почти прозрачное тело, яркий блик по верхней кромке и отражённый свет по нижней,
  // мягкий свет сверху внутрь и лёгкая тень под стеклом. Серой заливки нет.
  const dark = isDark || scheme === 'dark';
  const fill = tint ?? (clear ? 'rgba(255,255,255,0.08)' : dark ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.50)');
  const sheen = clear || dark ? ['rgba(255,255,255,0.30)', 'rgba(255,255,255,0.04)', 'rgba(255,255,255,0)'] as const
    : ['rgba(255,255,255,0.70)', 'rgba(255,255,255,0.18)', 'rgba(255,255,255,0)'] as const;
  const glow = clear || dark ? ['rgba(255,255,255,0)', 'rgba(255,255,255,0.14)'] as const : ['rgba(255,255,255,0)', 'rgba(255,255,255,0.35)'] as const;
  return <View style={[styles.center, style, clear ? styles.liftClear : dark ? styles.liftDark : styles.lift, { borderCurve: 'continuous' }]}>
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: radius, overflow: 'hidden', borderCurve: 'continuous' }]}>
      {/* Радиус — и на самом размытии: иначе в браузере размытие выходит прямоугольником за скругление. */}
      <BlurView intensity={clear ? 22 : 40} tint={clear ? 'light' : dark ? 'dark' : 'light'} style={[StyleSheet.absoluteFill, { borderRadius: radius, overflow: 'hidden' }]} />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: fill, opacity: tint ? 0.94 : 1 }]} />
      <LinearGradient colors={sheen} locations={[0, 0.45, 1]} style={StyleSheet.absoluteFill} />
      <LinearGradient colors={glow} start={{ x: 0.5, y: 0.55 }} end={{ x: 0.5, y: 1 }} style={StyleSheet.absoluteFill} />
      <View style={[StyleSheet.absoluteFill, { borderRadius: radius, borderWidth: 1, borderCurve: 'continuous',
        borderColor: clear || dark ? 'rgba(255,255,255,0.28)' : 'rgba(255,255,255,0.75)',
        borderTopColor: clear || dark ? 'rgba(255,255,255,0.75)' : '#FFFFFF',
        borderBottomColor: clear || dark ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.9)' }]} />
    </View>
    {children}
  </View>;
}
const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  lift: { shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 3 },
  liftDark: { shadowColor: '#000', shadowOpacity: 0.35, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 3 },
  liftClear: { shadowColor: '#000', shadowOpacity: 0.16, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 3 },
});
