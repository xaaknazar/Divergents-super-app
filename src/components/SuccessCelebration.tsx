import React,{ useEffect,useRef } from 'react';
import { Animated,Easing,StyleSheet,View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { SF } from './SFIcon';

/** One-shot confirmation. Decorative motion never controls navigation or saving. */
export function SuccessCelebration() {
  const { T, reduceMotion } = useTheme();
  const arrival = useRef(new Animated.Value(1)).current;
  const burst = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (reduceMotion) {
      arrival.setValue(1);
      burst.setValue(1);
      return;
    }
    arrival.setValue(0);
    burst.setValue(0);
    const animation = Animated.parallel([
      Animated.timing(arrival, { toValue: 1, duration: 320, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.sequence([
        Animated.delay(140),
        Animated.timing(burst, { toValue: 1, duration: 620, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]),
    ]);
    animation.start();
    return () => animation.stop();
  }, [arrival, burst, reduceMotion]);
  const colors = [T.brandText, T.brand, T.labelTertiary];
  const opacity = burst.interpolate({ inputRange: [0, 0.18, 0.55, 1], outputRange: [0, 0.85, 0.55, 0] });
  return <View testID="success-celebration" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.stage}>
    {!reduceMotion ? <>
      <Animated.View testID="success-ring" style={[styles.ring, { borderColor: T.brandText, opacity,
        transform: [{ scale: burst.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1.7] }) }] }]} />
      {Array.from({ length: 12 }, (_, index) => {
        const angle = index * Math.PI / 6;
        const radius = index % 2 ? 52 : 59;
        return <Animated.View key={index} style={[styles.particle, { backgroundColor: colors[index % colors.length], opacity,
          transform: [
            { translateX: burst.interpolate({ inputRange: [0, 1], outputRange: [Math.cos(angle) * 22, Math.cos(angle) * radius] }) },
            { translateY: burst.interpolate({ inputRange: [0, 1], outputRange: [Math.sin(angle) * 22, Math.sin(angle) * radius] }) },
            { scale: burst.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0.6, 1, 0.4] }) },
          ] }]} />;
      })}
    </> : null}
    <Animated.View style={[styles.disc, { backgroundColor: T.brand,
      transform: [{ scale: arrival.interpolate({ inputRange: [0, 1], outputRange: [0.72, 1] }) }] }]}>
      <SF name="checkmark" size={30} color={T.onBrand} />
    </Animated.View>
  </View>;
}

const styles = StyleSheet.create({
  stage: { width: 128, height: 112, alignItems: 'center', justifyContent: 'center' },
  disc: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  ring: { position: 'absolute', width: 64, height: 64, borderRadius: 32, borderWidth: 1.5 },
  particle: { position: 'absolute', width: 5, height: 5, borderRadius: 2.5 },
});
