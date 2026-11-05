// Цветной фон страницы как в Apple Sports: сверху насыщенный цвет, книзу он
// плавно уходит в фон темы. Цвета берутся из «Персонализации» (акцент или
// выбранный фон). «Без фона» — обычный фон без заливки.
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useTheme } from '../theme/ThemeContext';
import { hexToRgba } from '../theme/personalization';

/** Есть ли цветной фон: от него зависят полупрозрачные карточки поверх. */
export function useColorWash(): boolean {
  return !!useTheme().auroraColors;
}

export function ColorWash({ strength = 'soft' }: { strength?: 'soft' | 'strong' }) {
  const { isDark, auroraColors } = useTheme();
  if (!auroraColors) return null;
  const [c1, c2, c3] = auroraColors;
  // В тёмной теме цвет глубже и плотнее, в светлой — мягче, чтобы чёрный
  // текст шапки оставался читаемым.
  // strong — как шапка команды в Apple Sports: насыщенный цвет, на нём белый
  // заголовок. soft — мягкий оттенок для экранов с тёмным текстом наверху.
  const a = strength === 'strong' ? (isDark ? 0.95 : 0.92) : isDark ? 0.9 : 0.5;
  return (
    <View testID="color-wash" pointerEvents="none" style={StyleSheet.absoluteFill}>
      <LinearGradient
        colors={[hexToRgba(c2, a), hexToRgba(c1, a * 0.62), hexToRgba(c1, a * 0.18), hexToRgba(c1, 0)]}
        locations={[0, 0.32, 0.62, 0.9]}
        start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {/* Блик третьим цветом в верхнем углу — как свет на фоне у Apple Sports. */}
      <LinearGradient
        colors={[hexToRgba(c3, a * 0.55), hexToRgba(c3, 0)]}
        start={{ x: 1, y: 0 }} end={{ x: 0.2, y: 0.45 }}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
}

/**
 * Матовая подложка карточки поверх цветного фона: размытие + полупрозрачная
 * заливка. При «Понижении прозрачности» — сплошная карточка.
 */
export function WashSurface({ radius, children, testID }: { radius: number; children: React.ReactNode; testID?: string }) {
  const { T, isDark, reduceTransparency } = useTheme();
  const wash = useColorWash();
  const clear = wash && !reduceTransparency;
  return (
    <View testID={testID} style={{ borderRadius: radius, borderCurve: 'continuous', overflow: 'hidden',
      backgroundColor: clear ? 'transparent' : T.cardBg,
      borderWidth: clear ? StyleSheet.hairlineWidth : 0, borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.7)' }}>
      {clear ? <>
        <BlurView intensity={40} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: isDark ? 'rgba(22,24,32,0.58)' : 'rgba(255,255,255,0.72)' }]} />
      </> : null}
      {children}
    </View>
  );
}
