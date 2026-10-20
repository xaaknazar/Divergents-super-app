// Tactile press feedback: springs to 0.97 on press, back on release.
// Native driver → runs off the JS thread, stays smooth.
import React,{ useEffect,useRef } from 'react';
import { Animated,GestureResponderEvent,Pressable } from 'react-native';
import { hSelect } from '../lib/haptics';
import { useTheme } from '../theme/ThemeContext';

export function PressableScale({
  children, onPress, disabled, accessibilityLabel, accessibilityHint,
}: {
  children: React.ReactNode;
  onPress?: (e: GestureResponderEvent) => void;
  disabled?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const { reduceMotion } = useTheme();
  useEffect(() => { if (reduceMotion) { scale.stopAnimation(); scale.setValue(1); } return () => scale.stopAnimation(); }, [reduceMotion, scale]);
  const to = (v: number, bounciness = 0) =>
    Animated.spring(scale, { toValue: v, useNativeDriver: true, speed: 40, bounciness }).start();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || !onPress}
      accessibilityState={{ disabled: !!disabled || !onPress }}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      style={({ pressed }) => ({ opacity: disabled ? 0.45 : pressed && reduceMotion ? 0.7 : 1 })}
      onPressIn={() => { hSelect(); if (!reduceMotion) to(0.97); }}
      onPressOut={() => { if (!reduceMotion) to(1, 5); }}
    >
      <Animated.View style={{ transform: [{ scale }] }}>{children}</Animated.View>
    </Pressable>
  );
}
