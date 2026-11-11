import React from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { tabDockContentInset } from '../lib/tabDockLayout';
import { useTheme } from '../theme/ThemeContext';
import { hexToRgba } from '../theme/personalization';

/** A quiet surface beneath floating controls. It never intercepts content touches. */
export function BottomFade({ placement = 'dock' }: { placement?: 'dock' | 'composer' }) {
  const { T, reduceTransparency } = useTheme();
  const insets = useSafeAreaInsets();
  const surface = T.systemBg;
  const composer = placement === 'composer';
  return <View testID={`bottom-fade-${placement}`} pointerEvents="none" accessible={false}
    accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
    style={[styles.base, placement === 'dock'
      ? { bottom: 0, height: tabDockContentInset(insets.bottom) }
      : styles.composer]}>
    <LinearGradient colors={reduceTransparency || composer
      ? [hexToRgba(surface, 0), surface, surface]
      : [hexToRgba(surface, 0), hexToRgba(surface, 0.9), surface]}
      locations={composer ? [0, 1, 1] : [0, 0.5, 1]}
      style={composer ? styles.composerEdge : StyleSheet.absoluteFill} />
    {composer ? <View style={[styles.composerBase, { backgroundColor: surface }]} /> : null}
  </View>;
}
const styles = StyleSheet.create({
  base: { position: 'absolute', left: 0, right: 0 },
  composer: { top: -32, bottom: 0 },
  composerEdge: { position: 'absolute', top: 0, left: 0, right: 0, height: 32 },
  composerBase: { position: 'absolute', top: 32, bottom: 0, left: 0, right: 0 },
});
