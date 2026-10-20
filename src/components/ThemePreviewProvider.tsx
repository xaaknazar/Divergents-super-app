import React from 'react';
import { ThemeCtx,resolveThemePalette } from '../theme/ThemeContext';
import { createTypography,darkTheme,lightTheme,TEXT_SIZES,TextSizeKey } from '../theme/tokens';

/** Isolated preview: no authentication, persistence, API requests or account settings. */
export function ThemePreviewProvider({ children, scheme = 'light', textSize = 'md', reduceMotion = true, reduceTransparency = true }: {
  children: React.ReactNode; scheme?: 'light' | 'dark'; textSize?: TextSizeKey; reduceMotion?: boolean; reduceTransparency?: boolean;
}) {
  const scale = TEXT_SIZES.find(v => v.key === textSize)!.scale;
  return <ThemeCtx.Provider value={{
    T: resolveThemePalette(scheme), ty: createTypography(scale),
    scheme, mode: scheme, isDark: scheme === 'dark', textSize, textScale: scale,
    accent: 'divergents', background: 'none', auroraColors: null,
    reduceMotion, reduceTransparency,
    setMode: () => {}, setAccent: () => {}, setBackground: () => {}, setTextSize: () => {},
  }}>{children}</ThemeCtx.Provider>;
}
