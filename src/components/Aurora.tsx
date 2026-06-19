// Soft "aurora" backdrop: subtle radial brand glows behind content. Adds depth
// without being loud. Theme-aware (gentle in light, richer in dark).
import React from 'react';
import { View } from 'react-native';
import Svg, { Defs, RadialGradient, Stop, Rect } from 'react-native-svg';
import { useTheme } from '../theme/ThemeContext';

export function Aurora({ height = 560 }: { height?: number }) {
  const { T, isDark } = useTheme();
  const o = isDark ? 0.32 : 0.16;
  const o2 = isDark ? 0.26 : 0.12;
  return (
    <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, height }}>
      <Svg width="100%" height={height}>
        <Defs>
          <RadialGradient id="a1" cx="16%" cy="8%" r="60%">
            <Stop offset="0" stopColor={T.brandAccent} stopOpacity={o} />
            <Stop offset="1" stopColor={T.brandAccent} stopOpacity="0" />
          </RadialGradient>
          <RadialGradient id="a2" cx="96%" cy="2%" r="55%">
            <Stop offset="0" stopColor={T.brand} stopOpacity={o} />
            <Stop offset="1" stopColor={T.brand} stopOpacity="0" />
          </RadialGradient>
          <RadialGradient id="a3" cx="62%" cy="34%" r="50%">
            <Stop offset="0" stopColor={T.sky} stopOpacity={o2} />
            <Stop offset="1" stopColor={T.sky} stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Rect width="100%" height={height} fill="url(#a1)" />
        <Rect width="100%" height={height} fill="url(#a2)" />
        <Rect width="100%" height={height} fill="url(#a3)" />
      </Svg>
    </View>
  );
}
