// NavHeader — one reusable iOS-style navigation header for DETAIL / pushed screens.
// Unifies the bespoke back/header treatments scattered across the app:
//   • back chevron + label straight on the page background   → variant="plain" (default)
//   • plain + large title below (was BackNav + a <Text>)      → largeTitle
//   • floating round buttons over a hero image / gradient     → variant="overlay"
// Safe-area aware. Surface, separator and contrast belong to semantic variants.
import React from 'react';
import { View, Text, Pressable, useWindowDimensions } from 'react-native';
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
  /** Default plain lies on the page background (no fill, no hairline — handoff 2026-10-20);
   * other surfaces require an explicit variant. */
  variant?: 'plain' | 'frosted' | 'hero' | 'overlay';
  /** Overlay button colour scheme. 'dark' = dark scrim + white icon (default). */
  overlayScheme?: 'light' | 'dark';
  /** Apply the top safe-area inset. Default true. */
  safeArea?: boolean;
};

/** Circular translucent action button for the `overlay` variant (and trailing slots). */
import { NavRoundButton } from './NavRoundButton';
export { NavRoundButton } from './NavRoundButton';

export function NavHeader({
  title, largeTitle = false, subtitle, backLabel = 'Назад', hideBackLabel = false,
  onBack, trailing, variant = 'plain', overlayScheme = 'dark', safeArea = true,
}: NavHeaderProps) {
  const { T, isDark, reduceTransparency, ty, textScale = 1 } = useTheme();
  const { fontScale, width } = useWindowDimensions();
  const stackedTitle = !largeTitle && (fontScale * textScale > 1.3 || width < 350);
  const insets = useSafeAreaInsets();
  const top = safeArea ? insets.top : 0;
  const useBlur = variant === 'frosted' && !reduceTransparency;

  // ── Overlay: floating round buttons over a hero / gradient ──
  if (variant === 'overlay') {
    return (
      <View
        pointerEvents="box-none"
        style={{
          paddingTop: top + space.xs + 2, paddingHorizontal: space.md,
          flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        }}>
        {onBack
          ? <NavRoundButton icon="chevron.left" scheme={overlayScheme} onPress={onBack} accessibilityLabel={backLabel} />
          : <View style={{ width: minTouch }} />}
        {trailing ? <View style={{ flexDirection: 'row', gap: space.sm }}>{trailing}</View> : <View style={{ width: minTouch }} />}
      </View>
    );
  }

  const fg = variant === 'hero' ? '#FFFFFF' : T.brandText;
  const titleColor = variant === 'hero' ? '#FFFFFF' : T.label;
  const subtitleColor = variant === 'hero' ? 'rgba(255,255,255,0.85)' : T.labelSecondary;
  const showHairline = variant === 'frosted' && reduceTransparency;

  const bar = (
    <View style={{
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingTop: top + space.sm - 2, paddingBottom: space.sm + 2,
      paddingLeft: space.md, paddingRight: space.sm, minHeight: minTouch,
    }}>
      {onBack ? (
        <Pressable onPress={() => { hSelect(); onBack(); }} accessibilityRole="button" accessibilityLabel={backLabel}
          style={({ pressed }) => ({ minWidth: minTouch, minHeight: minTouch, flexShrink: 1, flexDirection: 'row', alignItems: 'center', gap: 2, paddingHorizontal: 6, opacity: pressed ? 0.6 : 1 })}>
          <SF name="chevron.left" size={20} color={fg} />
          {!hideBackLabel && (!title || largeTitle) ? <Text style={[ty.body, { color: fg, flexShrink: 1 }]}>{backLabel}</Text> : null}
        </Pressable>
      ) : <View style={{ width: 8 }} />}

      {title && !largeTitle && !stackedTitle ? <Text accessibilityRole="header" style={[ty.headline, { color: titleColor, flex: 1, textAlign: 'center', marginHorizontal: 8 }]}>{title}</Text> : null}
      <View style={{ minWidth: title && !stackedTitle ? minTouch : 0, flexShrink: 1, flexDirection: 'row', gap: space.sm, paddingRight: 6, alignItems: 'center', justifyContent: 'flex-end' }}>{trailing}</View>
    </View>
  );

  return (
    <View style={{ position: 'relative' }}>
      {useBlur ? (
        <BlurView intensity={80} tint={isDark ? 'dark' : 'light'} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
      ) : variant === 'frosted' ? (
        // Opaque fill when not blurring — incl. Reduce Transparency fallback for a blur header.
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: T.cardBg }} />
      ) : null}
      {bar}
      {stackedTitle && title ? <Text accessibilityRole="header" style={[ty.headline, { color: titleColor, paddingHorizontal: space.xl, paddingBottom: space.md }]}>{title}</Text> : null}
      {largeTitle && title ? (
        <View style={{ paddingHorizontal: space.xl, paddingTop: space.xs, paddingBottom: subtitle ? space.sm : space.lg }}>
          <Text accessibilityRole="header" style={[ty.largeTitle, { color: titleColor }]}>{title}</Text>
          {subtitle ? <Text style={[ty.subhead, { color: subtitleColor, marginTop: space.xs }]}>{subtitle}</Text> : null}
        </View>
      ) : null}
      {showHairline ? (
        <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 0.33, backgroundColor: T.separator }} />
      ) : null}
    </View>
  );
}
