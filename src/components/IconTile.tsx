// IconTile — цветная квадратная плашка иконки для карточек и строк (handoff 2026-10-20, §2.5).
// solid — глянцевый градиент тона с белым глифом; soft — подкрашенная плашка с глифом цвета тона.
// Отличие от IconBadge: IconBadge — круглые статусные значки; IconTile — «иконка раздела» у блока.
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { StyleSheet,View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { shadow } from '../theme/tokens';
import { SF,SFName } from './SFIcon';

export type IconTileTone = 'brand' | 'challenge' | 'trip' | 'sport' | 'violet' | 'orange' | 'pink' | 'neutral';

// [светлый, основной, rgb основного] — градиент 155° от светлого к основному.
const TONES: Record<IconTileTone, [string, string, string]> = {
  brand: ['#5672E6', '#234088', '35,64,136'],
  challenge: ['#FF9A4D', '#E8590C', '232,89,12'],
  trip: ['#3CCB82', '#15803D', '21,128,61'],
  sport: ['#7B90FF', '#3D5BDB', '61,91,219'],
  violet: ['#A587FF', '#6D3FD6', '109,63,214'],
  orange: ['#FFAE5C', '#C2410C', '194,65,12'],
  pink: ['#FF7AB6', '#BE185D', '190,24,93'],
  neutral: ['#9A9AA2', '#5C5C60', '92,92,96'],
};
const SIZES = { sm: { box: 36, icon: 20 }, md: { box: 44, icon: 24 }, lg: { box: 52, icon: 28 } } as const;

/** Цвет «чернил» тона для текста рядом с плашкой (счётчики, акценты). */
export function iconTileInk(tone: IconTileTone, isDark: boolean) {
  return isDark ? TONES[tone][0] : TONES[tone][1];
}

export function IconTile({ icon, tone = 'brand', variant = 'solid', size = 'md' }: {
  icon: SFName | string;
  tone?: IconTileTone;
  variant?: 'solid' | 'soft';
  size?: keyof typeof SIZES;
}) {
  const { isDark } = useTheme();
  const [light, base, rgb] = TONES[tone];
  const { box, icon: glyph } = SIZES[size];
  const frame = { width: box, height: box, borderRadius: Math.round(box * 0.3) };
  if (variant === 'soft') {
    return <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
      style={[styles.tile, frame, { backgroundColor: `rgba(${rgb},${isDark ? 0.22 : 0.11})` }]}>
      <SF name={icon} size={glyph} color={iconTileInk(tone, isDark)} />
    </View>;
  }
  return <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
    style={[styles.tile, frame, { backgroundColor: base },
      shadow({ color: `rgb(${rgb})`, opacity: isDark ? 0.3 : 0.4, radius: 6, y: 5, elevation: 3 })]}>
    <LinearGradient colors={[light, base]} start={{ x: 0.29, y: 0.05 }} end={{ x: 0.71, y: 0.95 }}
      style={[StyleSheet.absoluteFill, { borderRadius: frame.borderRadius }]} />
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.gloss, { borderRadius: frame.borderRadius }]} />
    <SF name={icon} size={glyph} color="#FFFFFF" />
  </View>;
}

const styles = StyleSheet.create({
  tile: { flexShrink: 0, alignItems: 'center', justifyContent: 'center', borderCurve: 'continuous' },
  // Блик сверху и затемнение снизу — аналог inset-теней из макета.
  gloss: { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.32)', borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.08)' },
});
