import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, findNodeHandle, Modal, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Image } from 'expo-image';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { initialWindowMetrics, SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { SF } from './SFIcon';

export type CoverOrigin = { x: number; y: number; width: number; height: number };
export interface BookCoverViewerProps { source: string; title: string; origin: CoverOrigin; onClose: () => void }

/** Focused cover inspection. Native gesture drives the image and scrim together;
 * a short drag springs back, a committed swipe returns it to the book. */
export function BookCoverViewer(props: BookCoverViewerProps) {
  const [ready, setReady] = useState(false);
  const [closeRequested, setCloseRequested] = useState(false);
  return <Modal testID="book-cover-modal" visible transparent animationType="none" statusBarTranslucent navigationBarTranslucent
    presentationStyle="overFullScreen" supportedOrientations={['portrait', 'landscape']}
    onRequestClose={() => setCloseRequested(true)} onShow={() => setReady(true)}>
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <BookCoverViewerContent {...props} ready={ready} closeRequested={closeRequested} />
    </SafeAreaProvider>
  </Modal>;
}

function BookCoverViewerContent({ source, title, origin, onClose, ready, closeRequested }:
  BookCoverViewerProps & { ready: boolean; closeRequested: boolean }) {
  const { reduceMotion, ty } = useTheme();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const progress = useSharedValue(reduceMotion ? 1 : 0);
  const dragX = useSharedValue(0), dragY = useSharedValue(0);
  const closing = useSharedValue(false);
  const closingRef = useRef(false);
  const openedSize = useRef({ width, height });
  const closeButton = useRef<View>(null);
  const availableHeight = Math.max(1, height - insets.top - insets.bottom - 112);
  const coverWidth = Math.min(Math.max(1, width - 48), availableHeight * 0.68, 560);
  const coverHeight = coverWidth / 0.68;
  const left = (width - coverWidth) / 2;
  const top = insets.top + 72 + (availableHeight - coverHeight) / 2;
  // After rotation the original tile has reflowed beneath the modal. Fade out
  // in place instead of flying towards obsolete portrait coordinates.
  const sameOrientation = openedSize.current.width === width && openedSize.current.height === height;
  const from = sameOrientation ? origin : { x: left, y: top, width: coverWidth, height: coverHeight };
  useEffect(() => {
    if (reduceMotion && !closingRef.current) progress.value = 1;
  }, [reduceMotion, progress]);
  const close = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;
    closing.value = true;
    if (reduceMotion) { onClose(); return; }
    dragX.value = withTiming(0, { duration: 200 });
    dragY.value = withTiming(0, { duration: 200 });
    progress.value = withTiming(0, { duration: 220 }, finished => { if (finished) runOnJS(onClose)(); });
  }, [closing, dragX, dragY, onClose, progress, reduceMotion]);
  const imageStyle = useAnimatedStyle(() => {
    const p = progress.value;
    const dragScale = reduceMotion ? 1 : 1 - Math.min(Math.abs(dragY.value) / height, 0.22);
    return { opacity: sameOrientation ? 1 : p, transform: [
      { translateX: (from.x + from.width / 2 - width / 2) * (1 - p) + dragX.value * p },
      { translateY: (from.y + from.height / 2 - top - coverHeight / 2) * (1 - p) + dragY.value * p },
      { scaleX: (from.width / coverWidth + (1 - from.width / coverWidth) * p) * dragScale },
      { scaleY: (from.height / coverHeight + (1 - from.height / coverHeight) * p) * dragScale },
    ] };
  });
  const scrimStyle = useAnimatedStyle(() => ({ opacity: progress.value * (1 - Math.min(Math.abs(dragY.value) / (height * 0.65), 0.65)) }));
  const chromeStyle = useAnimatedStyle(() => ({ opacity: progress.value }));
  const gesture = Gesture.Pan().withTestId('book-cover-dismiss').activeOffsetY([-10, 10]).onUpdate(event => {
    if (closing.value || progress.value < 0.99) return;
    dragY.value = event.translationY;
    dragX.value = event.translationX * 0.4;
  }).onEnd(event => {
    if (closing.value || progress.value < 0.99) return;
    if (Math.abs(event.translationY) > 110 || (Math.abs(event.translationY) > 35 && Math.abs(event.velocityY) > 900)) {
      closing.value = true;
      runOnJS(close)();
    } else {
      dragX.value = reduceMotion ? 0 : withSpring(0, { damping: 25, stiffness: 280 });
      dragY.value = reduceMotion ? 0 : withSpring(0, { damping: 25, stiffness: 280 });
    }
  }).onFinalize(() => {
    if (!closing.value) {
      dragX.value = reduceMotion ? 0 : withSpring(0, { damping: 25, stiffness: 280 });
      dragY.value = reduceMotion ? 0 : withSpring(0, { damping: 25, stiffness: 280 });
    }
  });
  useEffect(() => {
    if (ready && !closingRef.current) {
      progress.value = reduceMotion ? 1 : withSpring(1, { damping: 28, stiffness: 240, overshootClamping: true });
      const handle = findNodeHandle(closeButton.current);
      if (handle) AccessibilityInfo.setAccessibilityFocus(handle);
    }
  }, [ready, reduceMotion, progress]);
  useEffect(() => { if (closeRequested) close(); }, [closeRequested, close]);
  return (
    <GestureHandlerRootView style={styles.fill}>
      <View style={styles.fill} accessibilityViewIsModal onAccessibilityEscape={close}>
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.scrim, scrimStyle]} />
        <Pressable accessible={false} importantForAccessibility="no" onPress={close} style={StyleSheet.absoluteFill} />
        <GestureDetector gesture={gesture}>
          <Animated.View testID="book-cover-expanded" style={[styles.cover, { width: coverWidth, height: coverHeight, left, top }, imageStyle]}>
            <Image source={source} contentFit="contain" cachePolicy="memory-disk" style={styles.fill}
              accessible accessibilityLabel={`Обложка книги «${title}»`} />
          </Animated.View>
        </GestureDetector>
        <Animated.View style={[styles.header, { top: insets.top + 8, left: insets.left + 20, right: insets.right + 12 }, chromeStyle]}>
          <Text numberOfLines={2} style={[ty.subheadEm, styles.title]}>{title}</Text>
          <Pressable ref={closeButton} accessibilityRole="button" accessibilityLabel="Закрыть обложку" onPress={close}
            style={({ pressed }) => [styles.close, { opacity: pressed ? 0.6 : 1 }]}>
            <SF name="xmark" size={20} color="#FFFFFF" />
          </Pressable>
        </Animated.View>
      </View>
    </GestureHandlerRootView>
  );
}
const styles = StyleSheet.create({
  fill: { flex: 1 }, scrim: { backgroundColor: '#080B12' },
  cover: { position: 'absolute', borderRadius: 8, overflow: 'hidden' },
  header: { position: 'absolute', flexDirection: 'row', alignItems: 'center', gap: 12 },
  title: { color: '#FFFFFF', flex: 1 },
  close: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.12)' },
});
