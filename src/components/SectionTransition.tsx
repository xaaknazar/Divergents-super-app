import React, { useEffect } from 'react';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useTheme } from '../theme/ThemeContext';

/** Only the section content transitions; headers and filters keep their geometry. */
export function SectionTransition({ value, children }: { value: string | number; children: React.ReactNode }) {
  const { reduceMotion } = useTheme();
  const opacity = useSharedValue(1);
  useEffect(() => {
    opacity.value = reduceMotion ? 1 : 0.65;
    opacity.value = reduceMotion ? 1 : withTiming(1, { duration: 180, easing: Easing.out(Easing.cubic) });
  }, [value, reduceMotion, opacity]);
  const motion = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return <Animated.View testID="section-transition" style={motion}>{children}</Animated.View>;
}
