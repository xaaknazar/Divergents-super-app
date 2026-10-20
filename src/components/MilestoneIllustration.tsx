import { Image } from 'expo-image';
import React, { useEffect, useRef } from 'react';
import { Animated, Easing } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

const artwork = {
  trophy: require('../../assets/design/liven/achievement-trophy.png'),
  book: require('../../assets/design/liven/learning-book.png'),
  companion: require('../../assets/design/liven/companion-orb.png'),
};
const sizes = { compact: 64, welcome: 112, celebration: 176 } as const;

/** Original decorative artwork. Meaning always lives in adjacent accessible text. */
export function MilestoneIllustration({ kind, size = 'welcome', entrance = false }: {
  kind: keyof typeof artwork; size?: keyof typeof sizes; entrance?: boolean;
}) {
  const { reduceMotion } = useTheme();
  const value = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (reduceMotion || !entrance) { value.setValue(1); return; }
    value.setValue(0);
    const animation = Animated.timing(value, { toValue: 1, duration: 420,
      easing: Easing.out(Easing.cubic), useNativeDriver: true });
    animation.start();
    return () => animation.stop();
  }, [entrance, reduceMotion, value]);
  const dimension = sizes[size];
  return <Animated.View testID={`illustration-${kind}`} accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
    style={{ width: dimension, height: dimension, flexShrink: 0, opacity: value,
      transform: [{ translateY: value.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) },
        { scale: value.interpolate({ inputRange: [0, 1], outputRange: [0.88, 1] }) }] }}>
    <Image source={artwork[kind]} contentFit="contain" style={{ width: dimension, height: dimension }} />
  </Animated.View>;
}
