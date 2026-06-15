// Divergents design tokens — ported from the Claude Design iOS prototype.
// iOS 17/18 (Apple HIG) semantic colours + Dynamic Type scale.
import { Platform, TextStyle } from 'react-native';

export const T = {
  // Brand
  brand: '#234088',
  brandAccent: '#3D5BDB',
  brandTinted: 'rgba(35, 64, 136, 0.10)',
  brandTintedStrong: 'rgba(35, 64, 136, 0.18)',

  // System (Light)
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

  // ─ Divergents LMS website palette (sky / emerald) for course UI ─
  sky: '#0369A1',          // sky-700 (links, accents)
  skyDeep: '#075985',      // sky-800 (badge text)
  skyProgress: '#0284C7',  // sky-600 (progress fill)
  skyTrack: '#E0F2FE',     // sky-100 (progress track)
  skyBadgeBg: 'rgba(14,165,233,0.10)',   // sky-500/10
  emeraldText: '#065F46',  // emerald-800
  emeraldBadgeBg: 'rgba(16,185,129,0.10)', // emerald-500/10
  cardBorder: 'rgba(0,0,0,0.08)',
} as const;

// Native iOS font; falls back to system on Android.
// Rounded brand typeface (free Gotham-Rounded alternative). Loaded in App.tsx.
export const FONT = {
  regular: 'Nunito_400Regular',
  semibold: 'Nunito_600SemiBold',
  bold: 'Nunito_700Bold',
  extrabold: 'Nunito_800ExtraBold',
} as const;
export const FF = FONT.regular;

type TY = Record<string, TextStyle>;

export const ty: TY = {
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

// Radius scale (continuous iOS corners)
export const radius = { sm: 8, md: 10, lg: 12, xl: 14, xxl: 16, pill: 999 } as const;
// Spacing scale (4pt base)
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24 } as const;

export type ColorKey = keyof typeof T;
