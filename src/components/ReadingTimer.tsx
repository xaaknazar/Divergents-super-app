import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useTheme } from '../theme/ThemeContext';
import { hexToRgba } from '../theme/personalization';
import { nums } from '../theme/tokens';
import { SF } from './SFIcon';

export type ReadingTimerState = 'ready' | 'running' | 'paused' | 'recording' | 'saving' | 'overtime' | 'done' | 'complete';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const HOUR = 3_600_000;
const clockOf = (ms: number) => {
  const seconds = Math.max(0, Math.floor(ms / 1000));
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
};

/** Таймер обязательного часа (handoff 2026-10-20 §6): кольцо 248 (трек 10), цифры 56 tabular-nums,
 * «таблетка» блокировки. Доп. время — оранжевая дуга поверх полного синего круга и «+12:34».
 * Действия собирает экран: таймер только показывает состояние. */
export function ReadingTimer({ remainingMs, state, extraMs = 0, blockingMode = 'selected' }: {
  remainingMs: number; state: ReadingTimerState;
  blockingMode?: 'selected' | 'all-apps';
  /** Минуты сверх часа за сегодня — для «и ещё … сверху» в состоянии done. */
  extraMs?: number;
}) {
  const { T, ty, isDark, reduceMotion, textScale } = useTheme();
  const { width, fontScale } = useWindowDimensions();
  const [availableWidth, setAvailableWidth] = useState(width - 32);
  const largeText = fontScale * textScale > 1.15;
  const dimension = Math.max(160, Math.min(248, availableWidth));
  const radius = dimension / 2 - 12, circumference = 2 * Math.PI * radius;
  const visual = state === 'complete' ? 'done' : state === 'running' && remainingMs < 0 ? 'overtime' : state;
  const overtimeMs = visual === 'overtime' ? -remainingMs : 0;
  const stopped = visual === 'paused' || visual === 'recording' || visual === 'saving';
  const resumed = visual === 'ready' && remainingMs < HOUR;
  // Pausing overtime freezes its positive count instead of replacing it with 00:00.
  const clock = visual === 'overtime' || stopped && remainingMs < 0
    ? `+${clockOf(-remainingMs)}` : visual === 'done' ? '60:00' : clockOf(Math.ceil(Math.min(HOUR, remainingMs) / 1000) * 1000);
  const lockLabel = blockingMode === 'all-apps' ? 'Строгий режим · ограничения iOS' : 'Выбранные приложения ограничены';
  const S = {
    ready: { over: resumed ? 'Осталось сегодня' : 'Цель на сегодня', under: resumed ? 'из 60 минут' : 'минут чтения', pill: blockingMode === 'all-apps' ? 'Строгий режим · все приложения' : 'Выбранные приложения будут ограничены', icon: 'lock.fill', tone: 'neutral' },
    running: { over: 'Осталось', under: 'из 60 минут', pill: lockLabel, icon: 'lock.fill', tone: 'brand' },
    paused: { over: 'Пауза', under: 'время не идёт', pill: 'Пауза — приложения доступны', icon: 'lock.open.fill', tone: 'warn' },
    recording: { over: 'Пауза', under: 'запишите страницы', pill: 'Пауза — приложения доступны', icon: 'lock.open.fill', tone: 'warn' },
    saving: { over: 'Пауза', under: 'отправляем подход', pill: 'Ждём подтверждения сервера', icon: 'clock', tone: 'neutral' },
    overtime: { over: 'Час выполнен', under: 'дополнительное время', pill: lockLabel, icon: 'lock.fill', tone: 'brand' },
    done: { over: 'Цель дня выполнена', under: extraMs >= 60000 ? `и ещё ${Math.floor(extraMs / 60000)} мин сверху` : 'подтверждено', pill: 'Ограничения сняты', icon: 'checkmark.circle.fill', tone: 'ok' },
  }[visual];
  const tones: Record<string, [string, string]> = { neutral: [T.brandTinted, T.labelSecondary], brand: [T.brandTinted, T.brandText], warn: ['rgba(255,149,0,0.14)', T.orangeText], ok: [T.emeraldBadgeBg, T.greenText] };
  const pill = tones[S.tone];
  const extraInk = isDark ? '#FFB35C' : '#E8590C';
  const ringInk = stopped ? hexToRgba(T.brandText, isDark ? 0.55 : 0.45) : visual === 'done' ? T.greenText : T.brandText;
  const target = visual === 'overtime' || visual === 'done' ? 1 : visual === 'ready' && !resumed ? 0 : 1 - Math.max(0, remainingMs) / HOUR;
  const progress = useRef(new Animated.Value(target)).current;
  const breath = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (reduceMotion || visual !== 'running') { breath.setValue(1); return; }
    const animation = Animated.loop(Animated.sequence([
      Animated.timing(breath, { toValue: 1.04, duration: 2400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(breath, { toValue: 1, duration: 2400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    animation.start(); return () => animation.stop();
  }, [breath, reduceMotion, visual]);
  useEffect(() => {
    if (reduceMotion) { progress.setValue(target); return; }
    const animation = Animated.timing(progress, { toValue: target, duration: 600, easing: Easing.out(Easing.cubic), useNativeDriver: false });
    animation.start(); return () => animation.stop();
  }, [target, progress, reduceMotion]);
  // Доп. время рисуется дугой по кругу часа: 15 минут сверху — четверть окружности.
  const extraArc = visual === 'overtime' ? Math.min(1, (overtimeMs % HOUR) / HOUR) * circumference : 0;
  const digits = <Text style={[ty.largeTitle, nums, styles.digits, { color: stopped ? T.labelSecondary : T.label }, largeText ? null : { fontSize: 56, lineHeight: 60 }]}>{clock}</Text>;
  return <View onLayout={event => setAvailableWidth(event.nativeEvent.layout.width)} style={styles.root}>
    <View accessible accessibilityRole="timer" accessibilityLabel={`${S.over}. ${clock.replace('+', 'плюс ')}. ${S.under}`}
      style={{ width: dimension, height: dimension, justifyContent: 'center', alignItems: 'center' }}>
      <Animated.View pointerEvents="none" accessible={false} style={{ position: 'absolute', width: dimension - 44, height: dimension - 44,
        borderRadius: dimension / 2, backgroundColor: visual === 'running' ? hexToRgba(T.brand, isDark ? 0.12 : 0.05) : 'transparent', transform: [{ scale: breath }] }} />
      <Svg width={dimension} height={dimension} style={StyleSheet.absoluteFill} accessible={false}>
        <Circle cx={dimension / 2} cy={dimension / 2} r={radius} fill="none" stroke={isDark ? 'rgba(255,255,255,0.10)' : T.fillQuaternary} strokeWidth={10} />
        {target > 0 ? <AnimatedCircle cx={dimension / 2} cy={dimension / 2} r={radius} fill="none" stroke={ringInk} strokeWidth={10}
          strokeLinecap="round" rotation={-90} origin={`${dimension / 2},${dimension / 2}`}
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={progress.interpolate({ inputRange: [0, 1], outputRange: [circumference, 0] })} /> : null}
        {extraArc > 0 ? <Circle cx={dimension / 2} cy={dimension / 2} r={radius} fill="none" stroke={extraInk} strokeWidth={10}
          strokeLinecap="round" rotation={-90} origin={`${dimension / 2},${dimension / 2}`} strokeDasharray={`${extraArc} ${circumference}`} /> : null}
      </Svg>
      <View style={styles.center}>
        <Text style={[ty.footnoteEm, styles.centerText, { color: visual === 'overtime' ? (isDark ? '#FFB35C' : '#C2410C') : visual === 'done' ? T.greenText : T.labelSecondary }]}>{S.over}</Text>
        {!largeText ? digits : <SF name={visual === 'done' ? 'checkmark.seal.fill' : 'book.fill'} size={40} color={T.brandText} />}
        <Text style={[ty.footnote, styles.centerText, { color: T.labelSecondary }]}>{S.under}</Text>
      </View>
    </View>
    {largeText ? digits : null}
    <View style={[styles.pill, { backgroundColor: pill[0] }]}>
      <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants"><SF name={S.icon} size={14} color={pill[1]} /></View>
      <Text style={[ty.footnote, styles.pillText, { color: pill[1] }]}>{S.pill}</Text>
    </View>
  </View>;
}
const styles = StyleSheet.create({
  root: { alignItems: 'center', gap: 18 },
  center: { alignItems: 'center', gap: 4, paddingHorizontal: 24 },
  centerText: { textAlign: 'center' },
  digits: { textAlign: 'center', letterSpacing: -1 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 7, paddingHorizontal: 12, borderRadius: 999, maxWidth: '100%' },
  pillText: { flexShrink: 1 },
});
