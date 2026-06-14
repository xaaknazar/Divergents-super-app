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
} as const;

// Native iOS font; falls back to system on Android.
export const FF = Platform.select({ ios: 'System', default: 'sans-serif' });

type TY = Record<string, TextStyle>;

export const ty: TY = {
  largeTitle: { fontSize: 34, fontWeight: '700', lineHeight: 41, letterSpacing: 0.37 },
  title1:     { fontSize: 28, fontWeight: '700', lineHeight: 34, letterSpacing: 0.36 },
  title2:     { fontSize: 22, fontWeight: '700', lineHeight: 28, letterSpacing: 0.35 },
  title3:     { fontSize: 20, fontWeight: '600', lineHeight: 25, letterSpacing: 0.38 },
  headline:   { fontSize: 17, fontWeight: '600', lineHeight: 22, letterSpacing: -0.43 },
  body:       { fontSize: 17, fontWeight: '400', lineHeight: 22, letterSpacing: -0.43 },
  callout:    { fontSize: 16, fontWeight: '400', lineHeight: 21, letterSpacing: -0.32 },
  subhead:    { fontSize: 15, fontWeight: '400', lineHeight: 20, letterSpacing: -0.24 },
  subheadEm:  { fontSize: 15, fontWeight: '600', lineHeight: 20, letterSpacing: -0.24 },
  footnote:   { fontSize: 13, fontWeight: '400', lineHeight: 18, letterSpacing: -0.08 },
  footnoteEm: { fontSize: 13, fontWeight: '600', lineHeight: 18, letterSpacing: -0.08 },
  caption1:   { fontSize: 12, fontWeight: '400', lineHeight: 16, letterSpacing: 0 },
  caption2:   { fontSize: 11, fontWeight: '400', lineHeight: 14, letterSpacing: 0.07 },
  caption2Em: { fontSize: 11, fontWeight: '600', lineHeight: 14, letterSpacing: 0.07 },
};

export type ColorKey = keyof typeof T;
