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
import { lightTheme } from '../theme/tokens';

function detectNativeGlass() {
  if (Platform.OS !== 'ios') return false;
  try { return isLiquidGlassAvailable() && isGlassEffectAPIAvailable(); } catch { return false; }
}
/** Один раз на запуск: версия системы за время работы приложения не меняется. */
export const nativeGlass = detectNativeGlass();
/** A hint of neutral reflected light, applied to the material, not over the backdrop. */
export const darkGlassTint = 'rgba(255,255,255,0.10)';

export function GlassSurface({ children, style, interactive = false, scheme, variant = 'regular', tone = 'default', emphasis = 'standard' }: {
  children?: React.ReactNode;
  /** Форма и размер: borderRadius обязателен — стекло всегда скруглено. */
  style: StyleProp<ViewStyle>;
  interactive?: boolean;
  /** Поверх фото: тёмное стекло читается на любом кадре. По умолчанию — тема приложения. */
  scheme?: 'light' | 'dark';
  /** clear — прозрачное стекло поверх яркого фона (фото, цветная шапка), как «clear» у Apple. */
  variant?: 'regular' | 'clear' | 'navigation';
  /** Удаляющее действие обозначается красной кромкой без цветной заливки. */
  tone?: 'default' | 'danger';
  emphasis?: 'subtle' | 'standard' | 'strong';
}) {
  const theme = useTheme();
  const { reduceTransparency, T } = theme;
  const isDark = scheme ? scheme === 'dark' : theme.isDark;
  const navigation = variant === 'navigation';
  const clear = variant === 'clear' || navigation;
  // App appearance can differ from the device appearance. Never leave UIKit on auto.
  const colorScheme = isDark ? 'dark' : 'light';
  // A faint neutral reflection lifts dark glass; never use an opaque brand fill.
  // Кнопки навигации в светлой теме (этап 2, ноябрь 2026) — «дымчатое» стекло, как над обложкой
  // курса: лёгкая тёмная вуаль, и белый символ читается на любом светлом фоне без чёрной обводки.
  const smoke = navigation && !isDark ? (emphasis === 'subtle' ? 'rgba(18,22,34,0.20)' : 'rgba(18,22,34,0.30)') : undefined;
  const materialTint = isDark && variant !== 'clear' ? darkGlassTint
    : !navigation && !isDark && !clear ? 'rgba(255,255,255,0.52)' : smoke;
  const rim = tone === 'danger' ? lightTheme.redText : emphasis === 'strong' ? (isDark ? 'rgba(255,255,255,0.36)' : 'rgba(255,255,255,0.85)') : isDark ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.35)';
  const rimWidth = tone === 'danger' || emphasis === 'strong' ? 1 : StyleSheet.hairlineWidth;
  const radius = (StyleSheet.flatten(style)?.borderRadius as number | undefined) ?? 999;
  if (nativeGlass && !reduceTransparency) {
    // Dark navigation uses the system's adaptive regular material: it lifts
    // off a black backdrop while still transmitting the content underneath.
    // Explicit clear remains available for photographic/coloured backgrounds.
    return <GlassView glassEffectStyle={isDark && variant !== 'clear' ? 'regular' : 'clear'} isInteractive={interactive} tintColor={materialTint} colorScheme={colorScheme}
      style={[styles.center, { overflow: 'hidden', borderCurve: 'continuous' }, style, navigation ? { borderWidth: rimWidth, borderColor: rim } : undefined]}>{children}</GlassView>;
  }
  if (reduceTransparency) {
    return <View style={[styles.center, style, { borderCurve: 'continuous', backgroundColor: navigation ? (tone === 'danger' ? lightTheme.redText : '#353A46') : (clear ? (isDark ? '#161B26' : '#234088') : isDark ? '#161B26' : '#FFFFFF'),
      borderWidth: StyleSheet.hairlineWidth, borderColor: clear ? 'rgba(255,255,255,0.6)' : T.cardBorder }]}>{children}</View>;
  }
  // Запасной вид (Android, iOS до 26, превью) — как Liquid Glass у Apple: размытый фон
  // сквозь почти прозрачное тело, яркий блик по верхней кромке и отражённый свет по нижней,
  // мягкий свет сверху внутрь и лёгкая тень под стеклом. Серой заливки нет.
  const dark = isDark || scheme === 'dark';
  const fill = dark ? 'rgba(255,255,255,0.04)' : navigation ? smoke ?? 'transparent' : (clear ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.50)');
  const sheen = dark ? ['rgba(255,255,255,0.12)', 'rgba(255,255,255,0.03)', 'rgba(255,255,255,0)'] as const : navigation ? ['rgba(255,255,255,0.10)', 'rgba(255,255,255,0.02)', 'rgba(255,255,255,0)'] as const : clear ? ['rgba(255,255,255,0.30)', 'rgba(255,255,255,0.04)', 'rgba(255,255,255,0)'] as const
    : ['rgba(255,255,255,0.70)', 'rgba(255,255,255,0.18)', 'rgba(255,255,255,0)'] as const;
  const glow = dark || navigation ? ['rgba(255,255,255,0)', 'rgba(255,255,255,0.03)'] as const : clear ? ['rgba(255,255,255,0)', 'rgba(255,255,255,0.14)'] as const : ['rgba(255,255,255,0)', 'rgba(255,255,255,0.35)'] as const;
  return <View style={[styles.center, style, clear ? styles.liftClear : dark ? styles.liftDark : styles.lift, { borderCurve: 'continuous' }]}>
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: radius, overflow: 'hidden', borderCurve: 'continuous' }]}>
      {/* Радиус — и на самом размытии: иначе в браузере размытие выходит прямоугольником за скругление. */}
      <BlurView intensity={dark ? 40 : navigation ? (emphasis === 'subtle' ? 18 : 28) : clear ? 22 : 40} tint={dark ? 'dark' : 'light'} style={[StyleSheet.absoluteFill, { borderRadius: radius, overflow: 'hidden' }]} />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: fill }]} />
      <LinearGradient colors={sheen} locations={[0, 0.45, 1]} style={StyleSheet.absoluteFill} />
      <LinearGradient colors={glow} start={{ x: 0.5, y: 0.55 }} end={{ x: 0.5, y: 1 }} style={StyleSheet.absoluteFill} />
      <View style={[StyleSheet.absoluteFill, { borderRadius: radius, borderWidth: navigation ? rimWidth : 1, borderCurve: 'continuous',
        borderColor: navigation ? rim : dark ? 'rgba(255,255,255,0.16)' : clear ? 'rgba(255,255,255,0.28)' : 'rgba(255,255,255,0.75)',
        borderTopColor: dark && tone !== 'danger' ? 'rgba(255,255,255,0.30)' : navigation ? rim : clear ? 'rgba(255,255,255,0.75)' : '#FFFFFF',
        borderBottomColor: dark && tone !== 'danger' ? 'rgba(255,255,255,0.12)' : navigation ? rim : clear ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.9)' }]} />
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
