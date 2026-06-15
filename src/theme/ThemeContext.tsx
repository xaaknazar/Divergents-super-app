// Theme provider: light / dark / system, persisted, reacts to OS appearance.
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Appearance, ColorSchemeName } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { lightTheme, darkTheme, Theme } from './tokens';

export type ThemeMode = 'system' | 'light' | 'dark';
type Scheme = 'light' | 'dark';
const KEY = 'dvg.themeMode';

type Ctx = {
  T: Theme;
  scheme: Scheme;
  mode: ThemeMode;
  setMode: (m: ThemeMode) => void;
  isDark: boolean;
};

const ThemeCtx = createContext<Ctx | undefined>(undefined);

function resolve(mode: ThemeMode, sys: ColorSchemeName): Scheme {
  if (mode === 'system') return sys === 'dark' ? 'dark' : 'light';
  return mode;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>('system');
  const [sys, setSys] = useState<ColorSchemeName>(Appearance.getColorScheme());

  // load saved preference once
  useEffect(() => {
    let alive = true;
    SecureStore.getItemAsync(KEY)
      .then((v) => { if (alive && (v === 'light' || v === 'dark' || v === 'system')) setModeState(v); })
      .catch(() => {});
    const sub = Appearance.addChangeListener(({ colorScheme }) => setSys(colorScheme));
    return () => { alive = false; sub.remove(); };
  }, []);

  const setMode = useCallback((m: ThemeMode) => {
    setModeState(m);
    SecureStore.setItemAsync(KEY, m).catch(() => {});
  }, []);

  const scheme = resolve(mode, sys);
  const T = scheme === 'dark' ? darkTheme : lightTheme;

  return (
    <ThemeCtx.Provider value={{ T, scheme, mode, setMode, isDark: scheme === 'dark' }}>
      {children}
    </ThemeCtx.Provider>
  );
}

export function useTheme(): Ctx {
  const ctx = useContext(ThemeCtx);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
