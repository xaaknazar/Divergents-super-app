// NavHeader — one reusable iOS-style navigation header for DETAIL / pushed screens.
// Unifies the bespoke back/header treatments scattered across the app:
//   • inline back chevron + label (was `BackNav`)            → variant="inline"
//   • inline + large title below (was BackNav + a <Text>)     → largeTitle
//   • floating round buttons over a hero image / gradient     → variant="overlay"
// Safe-area aware, optional frosted blur, optional hairline separator.
import React from 'react';
import { View, Text, Pressable, StyleProp, ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { minTouch, space } from '../theme/tokens';
import { useTheme } from '../theme/ThemeContext';
import { hSelect } from '../lib/haptics';
import { SF } from './SFIcon';

export type NavHeaderProps = {
  /** Inline (centered) title, or the large title when `largeTitle`. */
  title?: string;
  /** Render `title` as a left-aligned large title row beneath the bar (iOS). */
  largeTitle?: boolean;
  /** Secondary line under the large title. */
  subtitle?: string;
  /** Back-button label. Default "Назад". */
  backLabel?: string;
  /** Hide the back label, keep only the chevron. */
  hideBackLabel?: boolean;
  /** Back handler. If omitted, no back button is rendered. */
  onBack?: () => void;
  /** Right-hand slot (icons / buttons). In `overlay` use round buttons. */
  trailing?: React.ReactNode;
  /** "inline" (default) for solid bars, "overlay" for floating buttons on a hero. */
  variant?: 'inline' | 'overlay';
  /** Overlay button colour scheme. 'dark' = dark scrim + white icon (default). */
  overlayScheme?: 'light' | 'dark';
  /** Chevron / label colour. Defaults to brand accent (inline) or white (overlay). */
  tint?: string;
  /** No background fill and no hairline (e.g. over a tinted Screen gradient). */
  transparent?: boolean;
  /** Frosted blur background instead of an opaque fill. */
  blur?: boolean;
  /** Force the hairline separator on/off. Defaults: on when opaque, off otherwise. */
  hairline?: boolean;
  /** Apply the top safe-area inset. Default true. */
  safeArea?: boolean;
  style?: StyleProp<ViewStyle>;
};

/** Circular translucent action button for the `overlay` variant (and trailing slots). */
export function NavRoundButton({
  icon, onPress, scheme = 'dark', size = 34, accessibilityLabel,
}: { icon: string; onPress?: () => void; scheme?: 'light' | 'dark'; size?: number; accessibilityLabel?: string }) {
  const { T } = useTheme();
  const dark = scheme === 'dark';
  const controlSize = Math.max(size, minTouch);
  return (
    <Pressable
      onPress={onPress ? () => { hSelect(); onPress(); } : undefined}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? `Действие: ${icon}`}
      accessibilityState={{ disabled: !onPress }}
      style={({ pressed }) => ({
        width: controlSize, height: controlSize, borderRadius: controlSize / 2,
        backgroundColor: dark ? 'rgba(0,0,0,0.35)' : 'rgba(255,255,255,0.72)',
        alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.7 : 1,
      })}>
      <SF name={icon} size={Math.round(size * 0.47)} color={dark ? '#fff' : T.label} />
    </Pressable>
  );
}

export function NavHeader({
  title, largeTitle = false, subtitle, backLabel = 'Назад', hideBackLabel = false,
  onBack, trailing, variant = 'inline', overlayScheme = 'dark', tint,
  transparent = false, blur = false, hairline, safeArea = true, style,
}: NavHeaderProps) {
  const { T, isDark, reduceTransparency, ty } = useTheme();
  const insets = useSafeAreaInsets();
  const top = safeArea ? insets.top : 0;
  const useBlur = blur && !reduceTransparency;

  // ── Overlay: floating round buttons over a hero / gradient ──
  if (variant === 'overlay') {
    return (
      <View
        pointerEvents="box-none"
        style={[{
          paddingTop: top + space.xs + 2, paddingHorizontal: space.md,
          flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        }, style]}>
        {onBack
          ? <NavRoundButton icon="chevron.left" scheme={overlayScheme} onPress={onBack} accessibilityLabel={backLabel} />
          : <View style={{ width: minTouch }} />}
        {trailing ? <View style={{ flexDirection: 'row', gap: space.sm }}>{trailing}</View> : <View style={{ width: minTouch }} />}
      </View>
    );
  }

  const fg = tint ?? T.brandText;
  const showHairline = hairline ?? (!transparent && !useBlur);

  const bar = (
    <View style={{
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingTop: top + space.sm - 2, paddingBottom: space.sm + 2,
      paddingLeft: space.md, paddingRight: space.sm, minHeight: minTouch,
    }}>
      {/* Centered inline title (behind the row so side widths don't shift it). */}
      {title && !largeTitle ? (
        <View pointerEvents="none" style={{ position: 'absolute', left: 56, right: 56, top: top + space.sm - 2, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
          <Text accessibilityRole="header" style={[ty.headline, { color: T.label }]} numberOfLines={1}>{title}</Text>
        </View>
      ) : null}

      {onBack ? (
        <Pressable onPress={() => { hSelect(); onBack(); }} accessibilityRole="button" accessibilityLabel={backLabel}
          style={({ pressed }) => ({ minWidth: minTouch, minHeight: minTouch, flexDirection: 'row', alignItems: 'center', gap: 2, paddingHorizontal: 6, opacity: pressed ? 0.6 : 1 })}>
          <SF name="chevron.left" size={20} color={fg} />
          {!hideBackLabel ? <Text style={[ty.body, { color: fg }]} numberOfLines={1}>{backLabel}</Text> : null}
        </Pressable>
      ) : <View style={{ width: 8 }} />}

      <View style={{ flexDirection: 'row', gap: space.md, paddingRight: 6, alignItems: 'center' }}>{trailing}</View>
    </View>
  );

  return (
    <View style={[{ position: 'relative' }, style]}>
      {useBlur ? (
        <BlurView intensity={80} tint={isDark ? 'dark' : 'light'} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
      ) : (!transparent || blur) ? (
        // Opaque fill when not blurring — incl. Reduce Transparency fallback for a blur header.
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: T.cardBg }} />
      ) : null}
      {bar}
      {largeTitle && title ? (
        <View style={{ paddingHorizontal: space.xl, paddingTop: space.xs, paddingBottom: subtitle ? space.sm : space.lg }}>
          <Text accessibilityRole="header" style={[ty.largeTitle, { color: T.label }]}>{title}</Text>
          {subtitle ? <Text style={[ty.subhead, { color: T.labelSecondary, marginTop: space.xs }]}>{subtitle}</Text> : null}
        </View>
      ) : null}
      {showHairline ? (
        <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 0.33, backgroundColor: T.separator }} />
      ) : null}
    </View>
  );
}
