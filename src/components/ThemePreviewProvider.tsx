import React from 'react';
import { ThemeCtx,resolveAuroraColors,resolveThemePalette } from '../theme/ThemeContext';
import { createTypography,darkTheme,lightTheme,TEXT_SIZES,TextSizeKey } from '../theme/tokens';

/** Isolated preview: no authentication, persistence, API requests or account settings. */
export function ThemePreviewProvider({ children, scheme = 'light', textSize = 'md', reduceMotion = true, reduceTransparency = true, accent = 'divergents', background = 'none' }: {
  children: React.ReactNode; scheme?: 'light' | 'dark'; textSize?: TextSizeKey; reduceMotion?: boolean; reduceTransparency?: boolean;
  /** Акцент и фон из «Персонализации». По умолчанию превью без фона. */
  accent?: string; background?: string;
}) {
  const scale = TEXT_SIZES.find(v => v.key === textSize)!.scale;
  return <ThemeCtx.Provider value={{
    T: resolveThemePalette(scheme, accent), ty: createTypography(scale),
    scheme, mode: scheme, isDark: scheme === 'dark', textSize, textScale: scale,
    accent, background, auroraColors: resolveAuroraColors(scheme, accent, background),
    reduceMotion, reduceTransparency,
    setMode: () => {}, setAccent: () => {}, setBackground: () => {}, setTextSize: () => {},
  }}>{children}</ThemeCtx.Provider>;
}
