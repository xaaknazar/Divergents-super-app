import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useTheme } from '../theme/ThemeContext';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
export function ProgressRing({ value, label, accessibilityLabel, size = 'regular', tone = 'brand' }: {
  value: number; label: string; accessibilityLabel: string; size?: 'regular' | 'compact'; tone?: 'brand' | 'inverse';
}) {
  const { T, ty, reduceMotion } = useTheme();
  const dimension = size === 'compact' ? 64 : 80;
  const center = dimension / 2, radius = center - 6;
  const circumference = 2 * Math.PI * radius;
  const ink = tone === 'inverse' ? T.onBrand : T.brandText;
  const normalized = Number.isFinite(value) ? Math.max(0, Math.min(value, 1)) : 0;
  const progress = useRef(new Animated.Value(normalized)).current;
  useEffect(() => {
    if (reduceMotion) { progress.setValue(normalized); return; }
    const motion = Animated.timing(progress, { toValue: normalized, duration: 380, easing: Easing.out(Easing.cubic), useNativeDriver: false });
    motion.start();
    return () => motion.stop();
  }, [normalized, progress, reduceMotion]);
  return <View accessible accessibilityRole="progressbar" accessibilityLabel={accessibilityLabel}
    accessibilityValue={{ min: 0, max: 100, now: Math.round(normalized * 100), text: label }}
    style={{ width: dimension, height: dimension, alignItems: 'center', justifyContent: 'center' }}>
    <Svg width={dimension} height={dimension} style={{ position: 'absolute' }} accessible={false}>
      <Circle cx={center} cy={center} r={radius} fill="none" stroke={tone === 'inverse' ? 'rgba(255,255,255,0.25)' : T.fillTertiary} strokeWidth={5} />
      <AnimatedCircle cx={center} cy={center} r={radius} fill="none" stroke={ink} strokeWidth={5} strokeLinecap="round"
        strokeDasharray={`${circumference} ${circumference}`} rotation={-90} origin={`${center},${center}`}
        strokeDashoffset={progress.interpolate({ inputRange: [0, 1], outputRange: [circumference, 0] })} />
    </Svg>
    <Text style={[size === 'compact' ? ty.footnoteEm : ty.headline, { color: tone === 'inverse' ? T.onBrand : T.label, textAlign: 'center' }]}>{label}</Text>
  </View>;
}
