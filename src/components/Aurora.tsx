// Soft "aurora" backdrop driven by the chosen background preset.
// Two large glow blobs whose bright centres sit OFF-screen (negative offsets),
// so on-screen you only see the soft falloff — a premium, edge-less wash rather
// than a flat corner gradient. Returns null when the background is "none".
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../theme/ThemeContext';
import { hexToRgba } from '../theme/personalization';

export function Aurora({ height = 640 }: { height?: number }) {
  const { isDark, auroraColors } = useTheme();
  if (!auroraColors) return null;
  const a = isDark ? 0.42 : 0.28;
  const [c1, c2, c3] = auroraColors;

  return (
    <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, height, overflow: 'hidden' }}>
      {/* top-left glow — centre off-screen so only the soft edge shows */}
      <View style={{ position: 'absolute', top: -220, left: -160, width: 460, height: 460, borderRadius: 230, overflow: 'hidden' }}>
        <LinearGradient colors={[hexToRgba(c1, a), hexToRgba(c1, 0)]} start={{ x: 0.35, y: 0.35 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      </View>
      {/* top-right glow */}
      <View style={{ position: 'absolute', top: -180, right: -180, width: 500, height: 500, borderRadius: 250, overflow: 'hidden' }}>
        <LinearGradient colors={[hexToRgba(c2, a), hexToRgba(c2, 0)]} start={{ x: 0.65, y: 0.35 }} end={{ x: 0, y: 1 }} style={StyleSheet.absoluteFill} />
      </View>
      {/* gentle central accent + vertical fade so it blends into the page */}
      <LinearGradient
        colors={[hexToRgba(c3, a * 0.45), hexToRgba(c3, a * 0.14), 'transparent']}
        locations={[0, 0.45, 1]}
        start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
}
