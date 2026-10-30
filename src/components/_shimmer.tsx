import { useEffect,useRef } from 'react';
import { Animated } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

// Pulsing opacity loop used by skeleton placeholders.
export function useThemedShimmer() {
  const v = useRef(new Animated.Value(0.4)).current;
  const { reduceMotion } = useTheme();
  useEffect(() => {
    if (reduceMotion) { v.setValue(0.6); return; }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(v, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(v, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [v, reduceMotion]);
  return v;
}
