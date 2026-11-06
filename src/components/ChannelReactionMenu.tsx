import React, { useEffect, useRef } from 'react';
import { Animated, AppState, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { BlurView } from 'expo-blur';
import * as Clipboard from 'expo-clipboard';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { channelReactions } from '../data/channelReactions';
import { ChannelPostBubble, ChannelPostBubbleProps } from './ChannelPostBubble';
import { useChannelAppearance } from './useChannelAppearance';
import { SF } from './SFIcon';

export type ChannelMessageFrame = { x: number; y: number; width: number; height: number };
export interface ChannelReactionMenuProps extends Pick<ChannelPostBubbleProps, 'post' | 'author' | 'playing'> {
  anchor: ChannelMessageFrame;
  onReact: (emoji: string) => void;
  onClose: () => void;
}
const noop = () => {};
/** One focused message above the blurred feed; no other post is interactive. */
export function ChannelReactionMenu({ post, author, playing, anchor, onReact, onClose }: ChannelReactionMenuProps) {
  const C = useChannelAppearance();
  const { reduceMotion, reduceTransparency } = useTheme();
  const insets = useSafeAreaInsets();
  const { width, height, fontScale } = useWindowDimensions();
  const progress = useRef(new Animated.Value(reduceMotion ? 1 : 0)).current;
  const closing = useRef(false);
  const closeRef = useRef(onClose); closeRef.current = onClose;
  useEffect(() => {
    if (!reduceMotion) Animated.spring(progress, { toValue: 1, damping: 24, stiffness: 300, mass: 0.8, useNativeDriver: true }).start();
    else progress.setValue(1);
    return () => progress.stopAnimation();
  }, [progress, reduceMotion]);
  useEffect(() => {
    const sub = AppState.addEventListener('change', state => { if (state !== 'active') closeRef.current(); });
    return () => sub.remove();
  }, []);
  const close = () => {
    if (closing.current) return false;
    closing.current = true;
    if (reduceMotion) closeRef.current();
    else Animated.timing(progress, { toValue: 0, duration: 120, useNativeDriver: true }).start(({ finished }) => { if (finished) closeRef.current(); });
    return true;
  };
  const panelWidth = Math.min(Math.max(anchor.width * 1.035, 272), width - 32, 650);
  const copyHeight = Math.max(44, 24 * C.textScale * fontScale + 24);
  const previewHeight = Math.min(anchor.height || height * 0.5, Math.max(100, height - insets.top - insets.bottom - 64 - copyHeight - 48));
  const totalHeight = previewHeight + 64 + copyHeight + 16;
  const left = Math.max(16, Math.min(anchor.x - (panelWidth - anchor.width) / 2, width - panelWidth - 16));
  const top = Math.max(insets.top + 12, Math.min(anchor.y - 72, height - insets.bottom - totalHeight - 12));
  return <Modal transparent visible animationType="none" statusBarTranslucent navigationBarTranslucent
    supportedOrientations={['portrait', 'landscape']} onRequestClose={close}>
    <View style={styles.screen} accessibilityViewIsModal onAccessibilityEscape={close}>
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity: reduceMotion ? 1 : progress }]}>
        {reduceTransparency ? <View testID="reaction-opaque-backdrop" style={[StyleSheet.absoluteFill, { backgroundColor: C.background }]} />
          : <><BlurView testID="reaction-blur" intensity={48} tint={C.isDark ? 'dark' : 'light'}
            experimentalBlurMethod={Platform.OS === 'android' ? 'dimezisBlurView' : undefined} style={StyleSheet.absoluteFill} />
            <View style={[StyleSheet.absoluteFill, { backgroundColor: C.isDark ? 'rgba(0,0,0,0.24)' : 'rgba(30,40,60,0.12)' }]} /></>}
      </Animated.View>
      <Pressable accessibilityRole="button" accessibilityLabel="Закрыть выбор реакции" onPress={close} style={StyleSheet.absoluteFill} />
      <Animated.View testID="channel-reaction-panel" style={[styles.panel, { width: panelWidth, left, top,
        opacity: reduceMotion ? 1 : progress, transform: [{ scale: reduceMotion ? 1 : progress.interpolate({ inputRange: [0, 1], outputRange: [0.966, 1] }) }] }]}>
        <View style={[styles.picker, { backgroundColor: C.surface }]}>
          {channelReactions.map(({ emoji, label }) => <Pressable key={emoji} accessibilityRole="button" accessibilityLabel={`Реакция: ${label}`}
            accessibilityState={{ selected: post.myReaction === emoji }}
            onPress={() => { if (close()) onReact(emoji); }}
            style={({ pressed }) => [styles.choice, { backgroundColor: post.myReaction === emoji ? C.selected : 'transparent', opacity: pressed ? 0.55 : 1 }]}>
            <Text style={styles.emoji}>{emoji}</Text>
          </Pressable>)}
        </View>
        <ScrollView testID="focused-message" style={[styles.preview, { maxHeight: previewHeight, backgroundColor: C.bubble }]}
          bounces={false} showsVerticalScrollIndicator>
          <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            <ChannelPostBubble post={post} author={author} playing={playing} onPlay={noop} onReact={noop} onDelete={noop} />
          </View>
        </ScrollView>
        <Pressable accessibilityRole="button" accessibilityLabel="Скопировать текст" onPress={() => {
          if (close()) void Clipboard.setStringAsync([post.title, post.body, post.audioUrl].filter(Boolean).join('\n\n')).catch(() => {});
        }} style={({ pressed }) => [styles.copy, { minHeight: copyHeight, backgroundColor: C.surface, opacity: pressed ? 0.65 : 1 }]}>
          <Text style={{ color: C.label, fontSize: 16 * C.textScale, flexShrink: 1 }}>Скопировать текст</Text>
          <SF name="doc.on.doc" size={20} color={C.label} />
        </Pressable>
      </Animated.View>
    </View>
  </Modal>;
}
const styles = StyleSheet.create({
  screen: { flex: 1 }, panel: { position: 'absolute', gap: 8 },
  picker: { minHeight: 64, padding: 6, borderRadius: 32, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' },
  choice: { minWidth: 44, height: 48, flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 24 },
  emoji: { fontSize: 29 }, preview: { borderRadius: 20, borderBottomLeftRadius: 5 },
  copy: { paddingHorizontal: 16, paddingVertical: 12, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
});
