// Theme provider: light/dark/system + accent color + background style, persisted.
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Appearance, ColorSchemeName } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { lightTheme, darkTheme, Theme, TEXT_SIZES, TextSizeKey, applyTextScale } from './tokens';
import { ACCENTS, BACKGROUNDS, hexToRgba } from './personalization';

export type ThemeMode = 'system' | 'light' | 'dark';
type Scheme = 'light' | 'dark';
const KEY = 'dvg.themeMode';
const KEY_ACCENT = 'dvg.accent';
const KEY_BG = 'dvg.background';
const KEY_TEXT = 'dvg.textSize';

type Ctx = {
  T: Theme;
  scheme: Scheme;
  mode: ThemeMode;
  setMode: (m: ThemeMode) => void;
  isDark: boolean;
  accent: string;
  setAccent: (k: string) => void;
  background: string;
  setBackground: (k: string) => void;
  auroraColors: string[] | null;
  // Text-size personalization (≈ iOS Dynamic Type), applied app-wide via `ty`.
  textSize: TextSizeKey;
  setTextSize: (k: TextSizeKey) => void;
  textScale: number;
};

const ThemeCtx = createContext<Ctx | undefined>(undefined);

function resolve(mode: ThemeMode, sys: ColorSchemeName): Scheme {
  if (mode === 'system') return sys === 'dark' ? 'dark' : 'light';
  return mode;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>('system');
  const [accent, setAccentState] = useState<string>('divergents');
  const [background, setBgState] = useState<string>('accent');
  const [textSize, setTextSizeState] = useState<TextSizeKey>('md');
  const [sys, setSys] = useState<ColorSchemeName>(Appearance.getColorScheme());

  useEffect(() => {
    let alive = true;
    SecureStore.getItemAsync(KEY).then((v) => { if (alive && (v === 'light' || v === 'dark' || v === 'system')) setModeState(v); }).catch(() => {});
    SecureStore.getItemAsync(KEY_ACCENT).then((v) => { if (alive && v && ACCENTS.some((a) => a.key === v)) setAccentState(v); }).catch(() => {});
    SecureStore.getItemAsync(KEY_BG).then((v) => { if (alive && v && BACKGROUNDS.some((b) => b.key === v)) setBgState(v); }).catch(() => {});
    SecureStore.getItemAsync(KEY_TEXT).then((v) => { if (alive && v && TEXT_SIZES.some((t) => t.key === v)) setTextSizeState(v as TextSizeKey); }).catch(() => {});
    const sub = Appearance.addChangeListener(({ colorScheme }) => setSys(colorScheme));
    return () => { alive = false; sub.remove(); };
  }, []);

  const setMode = useCallback((m: ThemeMode) => { setModeState(m); SecureStore.setItemAsync(KEY, m).catch(() => {}); }, []);
  const setAccent = useCallback((k: string) => { setAccentState(k); SecureStore.setItemAsync(KEY_ACCENT, k).catch(() => {}); }, []);
  const setBackground = useCallback((k: string) => { setBgState(k); SecureStore.setItemAsync(KEY_BG, k).catch(() => {}); }, []);
  const setTextSize = useCallback((k: TextSizeKey) => { setTextSizeState(k); SecureStore.setItemAsync(KEY_TEXT, k).catch(() => {}); }, []);

  // Apply the chosen text scale to the shared `ty` *before* children render, so
  // the very first paint of every screen uses the right sizes (applyTextScale is
  // idempotent + cheap). The state change here re-renders all useTheme consumers.
  const textScale = (TEXT_SIZES.find((t) => t.key === textSize) ?? TEXT_SIZES[1]).scale;
  applyTextScale(textScale);

  const scheme = resolve(mode, sys);
  const base = scheme === 'dark' ? darkTheme : lightTheme;
  const acc = ACCENTS.find((a) => a.key === accent) ?? ACCENTS[0];
  const ac = scheme === 'dark' ? acc.dark : acc.light;

  const T: Theme = {
    ...base,
    brand: ac.brand,
    brandAccent: ac.accent,
    brandTinted: hexToRgba(ac.accent, scheme === 'dark' ? 0.18 : 0.13),
    brandTintedStrong: hexToRgba(ac.accent, scheme === 'dark' ? 0.28 : 0.20),
  };

  const bg = BACKGROUNDS.find((b) => b.key === background) ?? BACKGROUNDS[0];
  const auroraColors = bg.key === 'none'
    ? null
    : bg.colors === null
      ? [ac.accent, ac.brand, base.sky]
      : bg.colors;

  return (
    <ThemeCtx.Provider value={{ T, scheme, mode, setMode, isDark: scheme === 'dark', accent, setAccent, background, setBackground, auroraColors, textSize, setTextSize, textScale }}>
      {children}
    </ThemeCtx.Provider>
  );
}

export function useTheme(): Ctx {
  const ctx = useContext(ThemeCtx);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
