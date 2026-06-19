// Soft "aurora" backdrop using expo-linear-gradient (no SVG → safe under
// react-navigation freezeOnBlur). Two diagonal brand glows fading to transparent.
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../theme/ThemeContext';

export function Aurora({ height = 560 }: { height?: number }) {
  const { isDark } = useTheme();
  const accent = isDark ? 'rgba(124,149,255,0.22)' : 'rgba(61,91,219,0.16)';
  const brand = isDark ? 'rgba(61,91,219,0.20)' : 'rgba(35,64,136,0.13)';
  const sky = isDark ? 'rgba(56,189,248,0.14)' : 'rgba(56,189,248,0.10)';
  return (
    <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, height }}>
      {/* glow from top-left */}
      <LinearGradient
        colors={[accent, 'transparent']}
        start={{ x: 0, y: 0 }} end={{ x: 0.85, y: 0.75 }}
        style={StyleSheet.absoluteFill}
      />
      {/* glow from top-right */}
      <LinearGradient
        colors={[brand, 'transparent']}
        start={{ x: 1, y: 0 }} end={{ x: 0.1, y: 0.7 }}
        style={StyleSheet.absoluteFill}
      />
      {/* soft sky tint mid */}
      <LinearGradient
        colors={['transparent', sky, 'transparent']}
        start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
}
