// Divergents design tokens — iOS 17/18 (Apple HIG) semantic colours + Dynamic Type.
// Light + Dark palettes share the same keys; the active one is provided via ThemeContext.
import { TextStyle, ViewStyle } from 'react-native';

const light = {
  // Brand
  brand: '#234088',
  brandAccent: '#3D5BDB',
  brandTinted: 'rgba(35, 64, 136, 0.10)',
  brandTintedStrong: 'rgba(35, 64, 136, 0.18)',

  // System
  systemBg: '#FFFFFF',
  groupedBg: '#F2F2F7',
  secondaryBg: '#F2F2F7',
  cardBg: '#FFFFFF',
  tertiaryBg: '#FFFFFF',
  fillPrimary: 'rgba(120,120,128,0.20)',
  fillSecondary: 'rgba(120,120,128,0.16)',
  fillTertiary: 'rgba(118,118,128,0.12)',
  fillQuaternary: 'rgba(116,116,128,0.08)',

  // Label
  label: '#000000',
  labelSecondary: 'rgba(60,60,67,0.60)',
  labelTertiary: 'rgba(60,60,67,0.30)',
  labelQuaternary: 'rgba(60,60,67,0.18)',

  // Separator
  separator: 'rgba(60,60,67,0.20)',
  separatorOpaque: '#C6C6C8',

  // Semantic
  green: '#34C759',
  red: '#FF3B30',
  orange: '#FF9500',
  yellow: '#FFCC00',
  blue: '#007AFF',
  purple: '#AF52DE',
  pink: '#FF2D55',
  teal: '#30B0C7',
  brown: '#A2845E',
  indigo: '#5856D6',

  // Divergents LMS website palette (sky / emerald) for course UI
  sky: '#0369A1',
  skyDeep: '#075985',
  skyProgress: '#0284C7',
  skyTrack: '#E0F2FE',
  skyBadgeBg: 'rgba(14,165,233,0.10)',
  emeraldText: '#065F46',
  emeraldBadgeBg: 'rgba(16,185,129,0.10)',
  cardBorder: 'rgba(0,0,0,0.08)',
};

export type Theme = { [K in keyof typeof light]: string };

const dark: Theme = {
  // Brand (brightened so it reads on dark surfaces)
  brand: '#3D5BDB',
  brandAccent: '#8AA0FF',
  brandTinted: 'rgba(124,149,255,0.16)',
  brandTintedStrong: 'rgba(124,149,255,0.26)',

  // System (true-black base + elevated surfaces)
  systemBg: '#0B0E16',
  groupedBg: '#0B0E16',
  secondaryBg: '#161B26',
  cardBg: '#161B26',
  tertiaryBg: '#1F2533',
  fillPrimary: 'rgba(130,140,170,0.26)',
  fillSecondary: 'rgba(130,140,170,0.20)',
  fillTertiary: 'rgba(130,140,170,0.15)',
  fillQuaternary: 'rgba(130,140,170,0.10)',

  // Label
  label: '#F5F7FB',
  labelSecondary: 'rgba(228,233,243,0.64)',
  labelTertiary: 'rgba(228,233,243,0.38)',
  labelQuaternary: 'rgba(228,233,243,0.22)',

  // Separator
  separator: 'rgba(255,255,255,0.10)',
  separatorOpaque: '#2A3140',

  // Semantic (iOS dark variants)
  green: '#30D158',
  red: '#FF453A',
  orange: '#FF9F0A',
  yellow: '#FFD60A',
  blue: '#0A84FF',
  purple: '#BF5AF2',
  pink: '#FF375F',
  teal: '#40C8E0',
  brown: '#AC8E68',
  indigo: '#5E5CE6',

  // Course palette (dark)
  sky: '#38BDF8',
  skyDeep: '#7DD3FC',
  skyProgress: '#0EA5E9',
  skyTrack: 'rgba(56,189,248,0.18)',
  skyBadgeBg: 'rgba(56,189,248,0.16)',
  emeraldText: '#6EE7B7',
  emeraldBadgeBg: 'rgba(16,185,129,0.18)',
  cardBorder: 'rgba(255,255,255,0.08)',
};

export const lightTheme: Theme = light;
export const darkTheme: Theme = dark;

// Back-compat default export (light). Components should prefer useTheme().
export const T: Theme = light;

// Brand typeface: Gotham Rounded. Loaded in App.tsx via expo-font.
export const FONT = {
  light: 'GothamRnd-Light',
  regular: 'GothamRnd-Book',
  semibold: 'GothamRnd-Medium',
  bold: 'GothamRnd-Bold',
  extrabold: 'GothamRnd-Bold',
} as const;
export const FF = FONT.regular;

type TY = Record<string, TextStyle>;

// Canonical (1×) type scale — the single source of truth. `ty` is derived from
// this and can be re-scaled at runtime by the text-size personalization setting.
const TY_BASE: TY = {
  largeTitle: { fontFamily: FONT.extrabold, fontSize: 34, lineHeight: 41, letterSpacing: 0.2 },
  title1:     { fontFamily: FONT.extrabold, fontSize: 28, lineHeight: 34, letterSpacing: 0.2 },
  title2:     { fontFamily: FONT.extrabold, fontSize: 22, lineHeight: 28, letterSpacing: 0.2 },
  title3:     { fontFamily: FONT.bold, fontSize: 20, lineHeight: 25, letterSpacing: 0.2 },
  headline:   { fontFamily: FONT.bold, fontSize: 17, lineHeight: 22, letterSpacing: -0.2 },
  body:       { fontFamily: FONT.regular, fontSize: 17, lineHeight: 23, letterSpacing: -0.2 },
  callout:    { fontFamily: FONT.regular, fontSize: 16, lineHeight: 21, letterSpacing: -0.2 },
  subhead:    { fontFamily: FONT.regular, fontSize: 15, lineHeight: 20, letterSpacing: -0.1 },
  subheadEm:  { fontFamily: FONT.bold, fontSize: 15, lineHeight: 20, letterSpacing: -0.1 },
  footnote:   { fontFamily: FONT.regular, fontSize: 13, lineHeight: 18, letterSpacing: 0 },
  footnoteEm: { fontFamily: FONT.bold, fontSize: 13, lineHeight: 18, letterSpacing: 0 },
  caption1:   { fontFamily: FONT.regular, fontSize: 12, lineHeight: 16, letterSpacing: 0 },
  caption2:   { fontFamily: FONT.semibold, fontSize: 11, lineHeight: 14, letterSpacing: 0.1 },
  caption2Em: { fontFamily: FONT.bold, fontSize: 11, lineHeight: 14, letterSpacing: 0.1 },
};

// Live type scale. NOTE: the object reference is stable — existing
// `import { ty } from '../theme/tokens'` consumers keep working. When the user
// changes the text-size setting, each entry is replaced with a freshly-scaled
// copy, so anything reading `ty.body` inline at render picks up the new size on
// the next render (ThemeContext re-render cascades through every useTheme()).
export const ty: TY = (Object.keys(TY_BASE) as (keyof TY)[]).reduce((acc, k) => {
  acc[k] = { ...TY_BASE[k] };
  return acc;
}, {} as TY);

// Curated text-size presets (≈ iOS Dynamic Type). 'md' is the design baseline.
export const TEXT_SIZES = [
  { key: 'sm', name: 'Мелкий',  scale: 0.92 },
  { key: 'md', name: 'Обычный', scale: 1.0 },
  { key: 'lg', name: 'Крупный', scale: 1.12 },
  { key: 'xl', name: 'Крупнее', scale: 1.24 },
] as const;
export type TextSizeKey = (typeof TEXT_SIZES)[number]['key'];

let _textScale = 1;
export function getTextScale(): number { return _textScale; }

// Re-scale the shared `ty` in place. Idempotent for a given scale.
export function applyTextScale(scale: number): void {
  if (scale === _textScale) return;
  _textScale = scale;
  (Object.keys(TY_BASE) as (keyof TY)[]).forEach((k) => {
    const b = TY_BASE[k];
    ty[k] = {
      ...b,
      ...(typeof b.fontSize === 'number' ? { fontSize: Math.round(b.fontSize * scale) } : null),
      ...(typeof b.lineHeight === 'number' ? { lineHeight: Math.round(b.lineHeight * scale) } : null),
    };
  });
}

// ─── Spatial scales ────────────────────────────────────────────────
// Coherent corner-radius and spacing ramps used across atoms/screens.
// `xxl` is kept for backward compatibility; `pill` is the fully-rounded token.
export const radius = { sm: 8, md: 10, lg: 12, xl: 14, xxl: 16, pill: 999 } as const;
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24 } as const;

// ─── Elevation ─────────────────────────────────────────────────────
// Soft iOS-style shadows. `shadows.*` are ready-to-spread presets;
// `shadow()` builds a custom one (e.g. brand-tinted CTA glow).
export type ShadowStyle = Pick<ViewStyle, 'shadowColor' | 'shadowOpacity' | 'shadowRadius' | 'shadowOffset' | 'elevation'>;

export function shadow({
  color = '#000', opacity = 0.08, radius: r = 10, y = 3, elevation,
}: { color?: string; opacity?: number; radius?: number; y?: number; elevation?: number } = {}): ShadowStyle {
  return {
    shadowColor: color, shadowOpacity: opacity, shadowRadius: r,
    shadowOffset: { width: 0, height: y }, elevation: elevation ?? Math.max(1, Math.round(r / 4)),
  };
}

export const shadows = {
  // Resting card / list surface.
  card: shadow({ opacity: 0.06, radius: 10, y: 3, elevation: 2 }),
  // Lifted surface — sticky bars, modals, FABs.
  floating: shadow({ opacity: 0.14, radius: 18, y: 8, elevation: 6 }),
} as const;

export type ColorKey = keyof typeof light;
