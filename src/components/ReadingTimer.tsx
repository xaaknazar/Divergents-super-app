import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Text, View, useWindowDimensions } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useTheme } from '../theme/ThemeContext';
import { SF } from './SFIcon';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
export function ReadingTimer({ remainingMs, state }: { remainingMs: number; state: 'ready' | 'running' | 'paused' | 'complete' }) {
  const { T, ty, reduceMotion, textScale } = useTheme();
  const { width, fontScale } = useWindowDimensions();
  const [availableWidth, setAvailableWidth] = useState(width - 100);
  const largeText = fontScale * textScale > 1.15;
  const dimension = Math.max(120, Math.min(248, availableWidth));
  const radius = dimension / 2 - 10, circumference = 2 * Math.PI * radius;
  const overtime = remainingMs < 0;
  const seconds = overtime ? Math.floor(-remainingMs / 1000) : Math.ceil(Math.min(3_600_000, remainingMs) / 1000);
  const clock = `${overtime ? '+' : ''}${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
  const progress = useRef(new Animated.Value(0)).current;
  const breath = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (reduceMotion || state !== 'running') { breath.setValue(1); return; }
    const animation = Animated.loop(Animated.sequence([
      Animated.timing(breath, { toValue: 1.055, duration: 2400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(breath, { toValue: 1, duration: 2400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    animation.start(); return () => animation.stop();
  }, [breath, reduceMotion, state]);
  useEffect(() => {
    const value = overtime ? 1 : 1 - seconds / 3600;
    if (reduceMotion) { progress.setValue(value); return; }
    const animation = Animated.timing(progress, { toValue: value, duration: 600, easing: Easing.out(Easing.cubic), useNativeDriver: false });
    animation.start(); return () => animation.stop();
  }, [seconds, overtime, progress, reduceMotion]);
  const label = state === 'running' && overtime ? 'Дополнительное чтение' : { ready: 'Ваш час для книги', running: 'Читаем без отвлечений', paused: 'Чтение на паузе', complete: 'Час чтения завершён' }[state];
  return <View onLayout={event => setAvailableWidth(event.nativeEvent.layout.width)} style={{ alignItems: 'center', gap: 16 }}>
    <Text accessibilityRole="header" style={[ty.headline, { color: T.label, textAlign: 'center' }]}>{label}</Text>
    <View accessible accessibilityLabel={`${label}. ${overtime ? 'Дополнительно' : 'Осталось'} ${Math.floor(seconds / 60)} мин. ${seconds % 60} сек.`}
      style={{ width: dimension, minHeight: dimension, justifyContent: 'center', alignItems: 'center' }}>
      <Animated.View pointerEvents="none" accessible={false} style={{ position: 'absolute', width: dimension - 40, height: dimension - 40,
        borderRadius: dimension / 2, backgroundColor: T.brandTinted, transform: [{ scale: breath }] }} />
      <Svg width={dimension} height={dimension} style={{ position: 'absolute' }} accessible={false}>
        <Circle cx={dimension / 2} cy={dimension / 2} r={radius} fill="none" stroke={T.fillTertiary} strokeWidth={8} />
        <AnimatedCircle cx={dimension / 2} cy={dimension / 2} r={radius} fill="none" stroke={T.brandText} strokeWidth={8}
          strokeLinecap="round" rotation={-90} origin={`${dimension / 2},${dimension / 2}`}
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={progress.interpolate({ inputRange: [0, 1], outputRange: [circumference, 0] })} />
      </Svg>
      <View style={{ alignItems: 'center', gap: 10, paddingVertical: 24 }}>
        <SF name={state === 'complete' ? 'checkmark.seal.fill' : 'book.fill'} size={largeText ? 48 : 28} color={T.brandText} />
        {!largeText ? <Text style={[ty.title1, { fontSize: dimension / 5, lineHeight: dimension / 4, color: T.label, fontVariant: ['tabular-nums'] }]}>{clock}</Text> : null}
      </View>
    </View>
    {largeText ? <Text style={[ty.title1, { color: T.label, textAlign: 'center', fontVariant: ['tabular-nums'] }]}>{clock}</Text> : null}
    <Text style={[ty.subhead, { color: T.labelSecondary, textAlign: 'center' }]}>{overtime ? 'Обязательный час пройден. Читайте дальше для себя.' : state === 'paused' ? 'Продолжите, когда будете готовы' : '60 минут в день · в своём ритме'}</Text>
  </View>;
}
