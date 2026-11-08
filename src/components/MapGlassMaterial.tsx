import React from 'react';
import { StyleSheet, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { GlassView } from 'expo-glass-effect';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../theme/ThemeContext';
import { nativeGlass } from './GlassSurface';

/** Map controls have distinct roles instead of all borrowing the tiles' colour.
 * This decorative layer owns its material; callers only choose a semantic role. */
export function MapGlassMaterial({ role }: { role: 'search' | 'city' | 'filter' | 'selected' | 'control' | 'primary' }) {
  const { isDark, reduceTransparency } = useTheme();
  const blue = role === 'selected' || role === 'primary';
  const light = role === 'search' || role === 'control' || (role === 'filter' && !isDark);
  const solid = blue ? '#234088' : light ? '#F4F7FC' : '#202D46';
  const tint = blue ? 'rgba(35,64,136,0.86)' : light ? 'rgba(244,247,252,0.72)' : 'rgba(23,36,61,0.82)';
  return <View pointerEvents="none" style={styles.layer}>
    {reduceTransparency ? <View testID={`map-material-${role}-opaque`} style={[StyleSheet.absoluteFill, { backgroundColor: solid }]} />
      : nativeGlass ? <GlassView glassEffectStyle="clear" colorScheme={light ? 'light' : 'dark'} tintColor={tint} style={StyleSheet.absoluteFill} />
      : <>
        <BlurView intensity={40} tint={light ? 'light' : 'dark'} style={StyleSheet.absoluteFill} />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: tint }]} />
        <LinearGradient colors={['rgba(255,255,255,0.16)', 'rgba(255,255,255,0)']} style={StyleSheet.absoluteFill} />
      </>}
    {!reduceTransparency ? <View style={[styles.rim, { borderColor: light ? 'rgba(255,255,255,0.70)' : 'rgba(255,255,255,0.23)' }]} /> : null}
  </View>;
}
const styles = StyleSheet.create({
  layer: { ...StyleSheet.absoluteFillObject, borderRadius: 999, borderCurve: 'continuous', overflow: 'hidden' },
  rim: { ...StyleSheet.absoluteFillObject, borderRadius: 999, borderWidth: StyleSheet.hairlineWidth },
});
